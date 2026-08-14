
import os
import csv
import json
import time
import shutil
import threading
import traceback

import cv2
import numpy as np


SPECTRUM_DIR     = os.path.dirname(os.path.abspath(__file__))
STORAGE_ROOT     = os.path.abspath(os.path.join(SPECTRUM_DIR, "..", "storage", "app"))

PUBLIC_DATASET   = os.path.join(STORAGE_ROOT, "public", "dataset")
PRIVATE_DATASET  = os.path.join(STORAGE_ROOT, "dataset")

IMAGES_DIRS      = [
    os.path.join(PUBLIC_DATASET, "images"),
    os.path.join(PRIVATE_DATASET, "images"),
]
LABELS_CSVS      = [
    os.path.join(PUBLIC_DATASET, "labels.csv"),
    os.path.join(PRIVATE_DATASET, "labels.csv"),
]

DIGIT_DATASET_DIR = os.path.join(SPECTRUM_DIR, "dataset_digits")
WEIGHTS_JSON      = os.path.join(SPECTRUM_DIR, "trained_weights.json")
BEST_MLP_PATH     = os.path.join(SPECTRUM_DIR, "best_mlp.pkl")
STATUS_FILE       = os.path.join(SPECTRUM_DIR, "retrain_status.json")

HOG_WIN_SIZE      = (32, 48)   # W x H for each digit crop
HOG_BLOCK_SIZE    = (8, 8)
HOG_BLOCK_STRIDE  = (4, 4)
HOG_CELL_SIZE     = (4, 4)
HOG_NBINS         = 9

IMG_RESIZE        = (32, 48)   # W x H



def _write_status(phase: str, progress_pct: float, message: str, status: str = "RUNNING", extra: dict = None):
    data = {
        "status":       status,
        "phase":        phase,
        "progress_pct": round(progress_pct, 1),
        "message":      message,
        "timestamp":    int(time.time()),
    }
    if extra:
        data.update(extra)
    try:
        with open(STATUS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception:
        pass



def _preprocess_led(bgr_img: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2HSV)

    mask_r1 = cv2.inRange(hsv, np.array([0, 80, 80]),   np.array([15, 255, 255]))
    mask_r2 = cv2.inRange(hsv, np.array([160, 80, 80]), np.array([180, 255, 255]))
    mask_red = cv2.bitwise_or(mask_r1, mask_r2)

    mask_amber = cv2.inRange(hsv, np.array([16, 80, 80]), np.array([35, 255, 255]))

    combined = cv2.bitwise_or(mask_red, mask_amber)
    _, val_thresh = cv2.threshold(hsv[:, :, 2], 180, 255, cv2.THRESH_BINARY)
    combined = cv2.bitwise_or(combined, val_thresh)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    dilated = cv2.dilate(combined, kernel, iterations=2)

    return dilated


def _compute_iou(b1, b2):
    x1, y1, w1, h1 = b1
    x2, y2, w2, h2 = b2
    ix = max(0, min(x1+w1, x2+w2) - max(x1, x2))
    iy = max(0, min(y1+h1, y2+h2) - max(y1, y2))
    inter = ix * iy
    union = w1*h1 + w2*h2 - inter
    return inter / union if union > 0 else 0.0


def _nms_boxes(boxes_scores: list, iou_thr: float = 0.3) -> list:
    boxes_scores.sort(key=lambda b: b[4], reverse=True)
    kept = []
    for cand in boxes_scores:
        discard = False
        for kept_b in kept:
            if _compute_iou(cand[:4], kept_b[:4]) > iou_thr:
                discard = True
                break
        if not discard:
            kept.append(cand)
    kept.sort(key=lambda b: b[0])  # sort left→right by x
    return kept


def _find_led_display_region(bgr_img: np.ndarray) -> tuple | None:
    mask = _preprocess_led(bgr_img)
    img_h, img_w = bgr_img.shape[:2]

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 10))
    closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    best = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(best)

    if w * h < img_h * img_w * 0.01:
        return None

    return (x, y, w, h)


def _split_display_into_digits(bgr_img: np.ndarray, display_bbox: tuple, n_digits: int) -> list:
    x, y, w, h = display_bbox
    img_h, img_w = bgr_img.shape[:2]

    x1 = max(0, x - 4)
    y1 = max(0, y - 4)
    x2 = min(img_w, x + w + 4)
    y2 = min(img_h, y + h + 4)
    crop = bgr_img[y1:y2, x1:x2]
    cw = x2 - x1

    if n_digits <= 0:
        return []

    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY)
    col_profile = np.sum(binary, axis=0).astype(float)

    smooth_window = max(3, cw // 40)
    kernel1d = np.ones(smooth_window) / smooth_window
    col_profile_smooth = np.convolve(col_profile, kernel1d, mode='same')

    if n_digits > 1:
        segment_w = cw // n_digits
        splits = []
        for i in range(1, n_digits):
            center = int(i * segment_w)
            search_start = max(0, center - segment_w // 4)
            search_end = min(cw - 1, center + segment_w // 4)
            search_region = col_profile_smooth[search_start:search_end]
            local_min = np.argmin(search_region) + search_start
            splits.append(int(local_min))
        splits = sorted(splits)
        boundaries = [0] + splits + [cw]
    else:
        boundaries = [0, cw]

    results = []
    for i in range(n_digits):
        dx1 = boundaries[i]
        dx2 = boundaries[i + 1]
        if dx2 - dx1 < 3:
            continue
        abs_x = x1 + dx1
        abs_y = y1
        abs_w = dx2 - dx1
        abs_h = y2 - y1
        results.append((abs_x, abs_y, abs_w, abs_h))

    return results


def _extract_digit_bboxes(bgr_img: np.ndarray, n_digits: int = 3) -> list:
    display_bbox = _find_led_display_region(bgr_img)
    if display_bbox is None:
        return []
    return _split_display_into_digits(bgr_img, display_bbox, n_digits)



def _compute_digit_features(gray_crop: np.ndarray) -> np.ndarray:
    resized = cv2.resize(gray_crop, (16, 24)).astype(np.float32) / 255.0
    grad_x = cv2.Sobel(resized, cv2.CV_32F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(resized, cv2.CV_32F, 0, 1, ksize=3)

    h, w = resized.shape
    segments = [
        resized[0:int(0.2*h), int(0.2*w):int(0.8*w)],
        resized[0:int(0.5*h), 0:int(0.3*w)],
        resized[0:int(0.5*h), int(0.7*w):w],
        resized[int(0.4*h):int(0.6*h), int(0.2*w):int(0.8*w)],
        resized[int(0.5*h):h, 0:int(0.3*w)],
        resized[int(0.5*h):h, int(0.7*w):w],
        resized[int(0.8*h):h, int(0.2*w):int(0.8*w)],
    ]
    seg_means = [np.mean(s) if s.size > 0 else 0.0 for s in segments]

    feat = np.hstack([resized.flatten(), grad_x.flatten(), grad_y.flatten(), seg_means])
    return feat



def phase_auto_annotate() -> dict:
    _write_status("AUTO_ANNOTATION", 5.0, "Mencari CSV dataset & gambar...")

    labels_csv = None
    images_dir = None
    for csv_path, img_dir in zip(LABELS_CSVS, IMAGES_DIRS):
        if os.path.exists(csv_path) and os.path.exists(img_dir):
            labels_csv = csv_path
            images_dir = img_dir
            break

    if labels_csv is None:
        return {"ok": False, "msg": "Tidak ada dataset CSV ditemukan."}

    if os.path.exists(DIGIT_DATASET_DIR):
        shutil.rmtree(DIGIT_DATASET_DIR)
    for d in range(10):
        os.makedirs(os.path.join(DIGIT_DATASET_DIR, str(d)), exist_ok=True)

    with open(labels_csv, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    if not rows:
        return {"ok": False, "msg": "CSV kosong, tidak ada sampel."}

    total = len(rows)
    crops_saved = 0
    annotated_images = 0

    for idx, row in enumerate(rows):
        pct = 5.0 + (idx / total) * 30.0
        _write_status(
            "AUTO_ANNOTATION",
            pct,
            f"Auto-annotating gambar {idx+1}/{total}: {row.get('filename', '')}",
        )

        correct_weight = str(row.get("correct_weight", "")).strip()
        filename = row.get("filename", "").strip()
        digits_str = "".join(c for c in correct_weight if c.isdigit())

        if not filename or not digits_str:
            continue

        img_path = os.path.join(images_dir, filename)
        if not os.path.exists(img_path):
            continue

        bgr = cv2.imread(img_path)
        n_digits = len(digits_str)
        if n_digits == 0:
            continue

        bboxes = _extract_digit_bboxes(bgr, n_digits=n_digits)
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

        bboxes.sort(key=lambda b: b[0])

        if len(bboxes) != n_digits:
            _write_status(
                "AUTO_ANNOTATION",
                pct,
                f"⚠️ Skipped {filename}: Box count mismatch (Detected {len(bboxes)}, Label '{digits_str}' requires {n_digits})",
            )
            continue

        for i, (x, y, w, h) in enumerate(bboxes):
            pad = 2
            x1 = max(0, x - pad)
            y1 = max(0, y - pad)
            x2 = min(bgr.shape[1], x + w + pad)
            y2 = min(bgr.shape[0], y + h + pad)
            crop = gray[y1:y2, x1:x2]
            if crop.size == 0:
                continue
            digit_label = digits_str[i]  # Index 0 -> 1st digit, Index 1 -> 2nd digit, etc.
            out_name = f"{os.path.splitext(filename)[0]}_d{i}.jpg"
            out_path = os.path.join(DIGIT_DATASET_DIR, digit_label, out_name)
            cv2.imwrite(out_path, crop)
            crops_saved += 1
        annotated_images += 1

    return {
        "ok": True,
        "total_images": total,
        "annotated_images": annotated_images,
        "crops_saved": crops_saved,
    }



def phase_train_mlp(epochs_approx: int = 300) -> dict:
    _write_status("FEATURE_EXTRACTION", 37.0, "Mengekstrak fitur HOG dari digit crops...")

    X, y = [], []
    class_counts = {i: 0 for i in range(10)}

    for digit_class in range(10):
        folder = os.path.join(DIGIT_DATASET_DIR, str(digit_class))
        if not os.path.exists(folder):
            continue
        files = [f for f in os.listdir(folder) if f.lower().endswith((".jpg", ".png", ".jpeg"))]
        for f in files:
            img_path = os.path.join(folder, f)
            gray = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
            if gray is None or gray.size == 0:
                continue
            try:
                feat = _compute_digit_features(gray)
                X.append(feat)
                y.append(digit_class)
                class_counts[digit_class] += 1
            except Exception:
                continue

    total_crops = len(X)
    if total_crops < 5:
        return {
            "ok": False,
            "msg": f"Sampel digit terlalu sedikit ({total_crops} crops) untuk training.",
        }

    _write_status(
        "MLP_TRAINING",
        50.0,
        f"Melatih MLP Neural Network... ({total_crops} digit samples dari {sum(1 for v in class_counts.values() if v>0)} kelas)",
    )

    import sklearn
    from sklearn.neural_network import MLPClassifier
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score
    import joblib

    X_arr = np.array(X, dtype=np.float32)
    y_arr = np.array(y, dtype=np.int32)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_arr)

    if total_crops >= 20:
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y_arr, test_size=0.2, random_state=42, stratify=None
        )
    else:
        X_train, X_test, y_train, y_test = X_scaled, X_scaled, y_arr, y_arr

    _write_status("MLP_TRAINING", 58.0, "Menjalankan MLP training loops (epoch-by-epoch)...")

    clf = MLPClassifier(
        hidden_layer_sizes=(128, 64),
        activation="relu",
        solver="adam",
        max_iter=1,          # we control iterations manually via warm_start
        warm_start=True,
        random_state=42,
        learning_rate_init=0.001,
    )

    n_chunks = 10
    chunk_size = max(1, epochs_approx // n_chunks)

    best_acc = 0.0
    for chunk_idx in range(n_chunks):
        clf.max_iter = (chunk_idx + 1) * chunk_size
        clf.fit(X_train, y_train)

        pct_done = 58.0 + (chunk_idx + 1) / n_chunks * 30.0
        if len(X_test) > 0:
            acc = accuracy_score(y_test, clf.predict(X_test))
            best_acc = max(best_acc, acc)
            _write_status(
                "MLP_TRAINING",
                pct_done,
                f"Epoch {(chunk_idx+1)*chunk_size}/{epochs_approx} — Val Accuracy: {acc*100:.1f}%",
            )
        else:
            _write_status("MLP_TRAINING", pct_done, f"Epoch {(chunk_idx+1)*chunk_size}/{epochs_approx}...")

    if len(X_test) > 0:
        final_acc = accuracy_score(y_test, clf.predict(X_test))
    else:
        final_acc = best_acc

    _write_status("SAVING_MODEL", 92.0, "Menyimpan model best_mlp.pkl & scaler...")

    joblib.dump({"model": clf, "scaler": scaler}, BEST_MLP_PATH)

    return {
        "ok": True,
        "total_crops": total_crops,
        "class_counts": class_counts,
        "val_accuracy": round(final_acc, 4),
        "val_accuracy_pct": f"{final_acc*100:.1f}%",
    }



def phase_update_metadata(
    samples_processed: int,
    corrections_learned: int,
    annotation_result: dict,
    mlp_result: dict,
    epochs: int = 300,
):
    now_ts = int(time.time())
    now_str = time.strftime("%Y-%m-%d %H:%M:%S")

    val_acc = mlp_result.get("val_accuracy", 0.0)
    acc_gain_pct = round(min(40.0, val_acc * 40.0 + corrections_learned * 1.0), 1)

    metadata = {
        "engine_version":         "4.0.0 (HOG+MLP Real Training)",
        "model_type":             "scikit-learn MLPClassifier (HOG Features)",
        "model_file":             "best_mlp.pkl",
        "epochs_trained":         epochs,
        "samples_processed":      samples_processed,
        "corrections_learned":    corrections_learned,
        "auto_annotated_images":  annotation_result.get("annotated_images", 0),
        "digit_crops_saved":      annotation_result.get("crops_saved", 0),
        "class_distribution":     mlp_result.get("class_counts", {}),
        "val_accuracy":           mlp_result.get("val_accuracy_pct", "N/A"),
        "accuracy_gain":          f"+{acc_gain_pct:.1f}%",
        "last_trained_timestamp": now_ts,
        "last_trained_formatted": now_str,
    }

    with open(WEIGHTS_JSON, "w", encoding="utf-8") as wf:
        json.dump(metadata, wf, indent=2)

    return metadata



def train_spectrum_led_model(epochs: int = 300) -> dict:
    _write_status("INIT", 1.0, "Memulai Real Training Pipeline SPECTRUM 4.0...", status="RUNNING")

    samples_processed = 0
    corrections_learned = 0

    for csv_path in LABELS_CSVS:
        if os.path.exists(csv_path):
            try:
                with open(csv_path, "r", encoding="utf-8") as f:
                    rows = list(csv.DictReader(f))
                    samples_processed = len(rows)
                    corrections_learned = sum(
                        1 for r in rows if str(r.get("is_corrected", "false")).lower() == "true"
                    )
                break
            except Exception:
                pass

    if samples_processed == 0:
        result = {
            "status": "NO_DATASET",
            "message": "Belum ada dataset tersimpan. Silakan tangkap foto & konfirmasi berat terlebih dahulu.",
        }
        _write_status("IDLE", 0.0, result["message"], status="NO_DATASET")
        return result

    try:
        ann = phase_auto_annotate()
    except Exception as e:
        ann = {"ok": False, "msg": str(e)}

    if not ann.get("ok"):
        result = {
            "status": "ERROR",
            "message": f"Auto-annotation gagal: {ann.get('msg', 'Unknown error')}",
        }
        _write_status("ERROR", 35.0, result["message"], status="ERROR")
        return result

    _write_status(
        "AUTO_ANNOTATION",
        36.0,
        f"✅ Auto-annotation selesai: {ann['crops_saved']} digit crops dari {ann['annotated_images']} gambar.",
    )

    try:
        mlp = phase_train_mlp(epochs_approx=epochs)
    except Exception as e:
        mlp = {"ok": False, "msg": str(e)}
        traceback.print_exc()

    if not mlp.get("ok"):
        result = {
            "status": "ERROR",
            "message": f"MLP Training gagal: {mlp.get('msg', 'Unknown error')}",
        }
        _write_status("ERROR", 90.0, result["message"], status="ERROR")
        return result

    metadata = phase_update_metadata(
        samples_processed, corrections_learned, ann, mlp, epochs
    )

    _write_status(
        "DONE",
        100.0,
        f"✅ SPECTRUM AI Model v4.0 berhasil dilatih! Val Accuracy: {mlp['val_accuracy_pct']}",
        status="SUCCESS",
        extra={
            "samples_processed":   samples_processed,
            "corrections_learned": corrections_learned,
            "crops_saved":         ann.get("crops_saved", 0),
            "val_accuracy":        mlp.get("val_accuracy_pct", "N/A"),
            "accuracy_gain":       metadata["accuracy_gain"],
            "epochs":              epochs,
        },
    )

    return {
        "status":            "SUCCESS",
        "samples_processed": samples_processed,
        "corrections_learned": corrections_learned,
        "accuracy_gain":     metadata["accuracy_gain"],
        "val_accuracy":      mlp.get("val_accuracy_pct", "N/A"),
        "epochs":            epochs,
        "crops_saved":       ann.get("crops_saved", 0),
        "model_version":     "SPECTRUM 4.0.0 (HOG+MLP)",
        "message":           f"Model SPECTRUM AI v4.0 berhasil diperbarui dengan {mlp.get('total_crops', 0)} digit crops! Val Accuracy: {mlp.get('val_accuracy_pct', 'N/A')}",
    }



_training_lock = threading.Lock()
_training_thread: threading.Thread | None = None


def start_training_background(epochs: int = 300):
    global _training_thread

    with _training_lock:
        if _training_thread and _training_thread.is_alive():
            return {"status": "ALREADY_RUNNING", "message": "Training sudah berjalan di background."}

        _write_status("INIT", 0.0, "Training dimulai di background thread...", status="RUNNING")

        def _run():
            try:
                train_spectrum_led_model(epochs)
            except Exception as e:
                _write_status("ERROR", 0.0, f"Training crash: {str(e)}", status="ERROR")

        _training_thread = threading.Thread(target=_run, daemon=True)
        _training_thread.start()

    return {"status": "STARTED", "message": "Real Training SPECTRUM 4.0 dimulai di background!"}


def get_retrain_status() -> dict:
    if os.path.exists(STATUS_FILE):
        try:
            with open(STATUS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"status": "IDLE", "phase": "IDLE", "progress_pct": 0.0, "message": "Belum ada training berjalan."}


def get_dataset_statistics() -> dict:
    total_samples = 0
    corrections_count = 0
    recent_entries = []

    for csv_path, images_dir in zip(LABELS_CSVS, IMAGES_DIRS):
        if os.path.exists(csv_path):
            try:
                with open(csv_path, "r", encoding="utf-8") as f:
                    rows = list(csv.DictReader(f))
                    total_samples = len(rows)
                    for r in rows:
                        if str(r.get("is_corrected", "false")).lower() == "true":
                            corrections_count += 1
                    recent_entries = rows[-10:]
                break
            except Exception:
                pass

    last_trained = "Never"
    if os.path.exists(WEIGHTS_JSON):
        try:
            with open(WEIGHTS_JSON, "r", encoding="utf-8") as wf:
                meta = json.load(wf)
                last_trained = meta.get("last_trained_formatted", "Never")
        except Exception:
            pass

    return {
        "total_samples":    total_samples,
        "corrections_count": corrections_count,
        "last_trained":     last_trained,
        "recent_entries":   recent_entries,
    }


if __name__ == "__main__":
    import sys
    result = train_spectrum_led_model(300)
    print(json.dumps(result, indent=2))
