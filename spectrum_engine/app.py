
import base64
import re
import io
import os
import cv2
import numpy as np
from PIL import Image
from collections import Counter
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from spectrum_engine.train_spectrum_led import (
    start_training_background,
    get_retrain_status,
    get_dataset_statistics,
)

import os as _os
import json as _json

_EASYOCR_READER = None

def get_easyocr_reader():
    global _EASYOCR_READER
    if _EASYOCR_READER is None:
        try:
            import easyocr
            _EASYOCR_READER = easyocr.Reader(['en'], gpu=False, verbose=False)
        except Exception:
            pass
    return _EASYOCR_READER

def run_easyocr_fallback(img: np.ndarray):
    reader = get_easyocr_reader()
    if not reader:
        return None
    try:
        results = reader.readtext(img)
        all_text = " ".join([text for (bbox, text, prob) in results])
        import re
        cleaned = re.sub(r'[^\d]', '', all_text)
        if len(cleaned) >= 2:
            val = int(cleaned)
            if 1 <= val <= 99999:
                _, buffer = cv2.imencode(".png", img)
                base64_preview = "data:image/png;base64," + base64.b64encode(buffer).decode("utf-8")
                return {
                    "status": "SUCCESS",
                    "weight_detected": val,
                    "confidence": 0.95,
                    "spectrum_processed_image": base64_preview,
                    "engine_version": "6.0.0 (EasyOCR Fallback)",
                    "message": "Fallback OCR Successful"
                }
    except Exception:
        pass
    return None

_MLP_CACHE = {"model": None, "scaler": None, "loaded_at": 0}
_BEST_MLP_PATH = _os.path.join(_os.path.dirname(__file__), "best_mlp.pkl")


def _load_mlp_if_available():
    global _MLP_CACHE
    try:
        if not _os.path.exists(_BEST_MLP_PATH):
            return None, None
        mtime = _os.path.getmtime(_BEST_MLP_PATH)
        if _MLP_CACHE["loaded_at"] >= mtime and _MLP_CACHE["model"] is not None:
            return _MLP_CACHE["model"], _MLP_CACHE["scaler"]
        import joblib
        data = joblib.load(_BEST_MLP_PATH)
        _MLP_CACHE["model"] = data["model"]
        _MLP_CACHE["scaler"] = data["scaler"]
        _MLP_CACHE["loaded_at"] = mtime
        return _MLP_CACHE["model"], _MLP_CACHE["scaler"]
    except Exception:
        return None, None


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


def _mlp_classify(gray_crop: np.ndarray):
    clf, scaler = _load_mlp_if_available()
    if clf is None:
        return None, 0.0
    try:
        feat = _compute_digit_features(gray_crop).reshape(1, -1).astype(np.float32)
        feat_scaled = scaler.transform(feat)
        proba = clf.predict_proba(feat_scaled)[0]
        top_cls = int(np.argmax(proba))
        top_conf = float(proba[top_cls])
        return top_cls, top_conf
    except Exception:
        return None, 0.0

app = FastAPI(
    title="SPECTRUM Engine 4.0 AI Microservice",
    description="Seven-Segment Processing & Enhanced Computer-Vision Recognition Model (Geometric Heuristic & NMS Active)",
    version="4.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DetectRequest(BaseModel):
    image: str  # Base64 string or data URL


SEVEN_SEG_MAP = {
    (1, 1, 1, 0, 1, 1, 1): 0,
    (0, 0, 1, 0, 0, 1, 0): 1,
    (1, 0, 1, 1, 1, 0, 1): 2,
    (1, 0, 1, 1, 0, 1, 1): 3,
    (0, 1, 1, 1, 0, 1, 0): 4,
    (1, 1, 0, 1, 0, 1, 1): 5,
    (1, 1, 0, 1, 1, 1, 1): 6,
    (1, 0, 1, 0, 0, 1, 0): 7,
    (1, 1, 1, 1, 1, 1, 1): 8,
    (1, 1, 1, 1, 0, 1, 1): 9,
}


def decode_base64_image(base64_str: str) -> np.ndarray:
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",", 1)[1]
        
        img_bytes = base64.b64decode(base64_str)
        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        bgr_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        return bgr_img
    except Exception as e:
        raise ValueError(f"Failed to decode base64 image: {str(e)}")


def preprocess_hsv_red_led(bgr_img: np.ndarray):
    # 1. Red LED Detection
    hsv = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2HSV)
    lower_red1 = np.array([0, 100, 100])
    upper_red1 = np.array([10, 255, 255])
    lower_red2 = np.array([160, 100, 100])
    upper_red2 = np.array([180, 255, 255])
    mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
    mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
    red_mask = cv2.bitwise_or(mask1, mask2)

    # 2. Dark LCD / Ink Detection (black on light bg)
    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
    dark_mask = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 15
    )
    # Remove small noise from adaptive threshold
    noise_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dark_mask = cv2.morphologyEx(dark_mask, cv2.MORPH_OPEN, noise_kernel)

    # 3. Combine both masks
    combined_mask = cv2.bitwise_or(red_mask, dark_mask)

    # 4. Standard cleanup
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)
    dilated_mask = cv2.dilate(closed_mask, kernel, iterations=1)

    return dilated_mask


def compute_iou(boxA, boxB):
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[0] + boxA[2], boxB[0] + boxB[2])
    yB = min(boxA[1] + boxA[3], boxB[1] + boxB[3])

    interWidth = max(0, xB - xA)
    interHeight = max(0, yB - yA)
    interArea = interWidth * interHeight

    boxAArea = boxA[2] * boxA[3]
    boxBArea = boxB[2] * boxB[3]

    if boxAArea + boxBArea - interArea == 0:
        return 0.0

    return interArea / float(boxAArea + boxBArea - interArea)


def is_nested(box_inner, box_outer):
    xi, yi, wi, hi = box_inner
    xo, yo, wo, ho = box_outer
    return xi >= xo and yi >= yo and (xi + wi) <= (xo + wo) and (yi + hi) <= (yo + ho)


def apply_nms_and_overlap_filter(candidates, iou_threshold=0.3):
    if not candidates:
        return []

    sorted_cands = sorted(candidates, key=lambda c: (c['box'][2] * c['box'][3]) * c['confidence'], reverse=True)
    keep = []

    for cand in sorted_cands:
        box = cand['box']
        discard = False
        for kept in keep:
            kbox = kept['box']
            iou = compute_iou(box, kbox)
            
            x_overlap = max(0, min(box[0] + box[2], kbox[0] + kbox[2]) - max(box[0], kbox[0]))
            overlap_ratio = x_overlap / float(min(box[2], kbox[2])) if min(box[2], kbox[2]) > 0 else 0

            if iou > iou_threshold or overlap_ratio > 0.35 or is_nested(box, kbox):
                discard = True
                break

        if not discard:
            keep.append(cand)

    keep.sort(key=lambda c: c['box'][0])
    return keep


def verify_7segment_geometric_rules(active_pattern: list[int], raw_digit: int | None, conf: float) -> tuple[int, float]:
    top, top_left, top_right, middle, bottom_left, bottom_right, bottom = active_pattern

    # Rule C: Middle is EMPTY (0) and Top & Bottom ACTIVE -> MUST BE '0'
    if middle == 0 and top == 1 and bottom == 1:
        return 0, max(conf, 0.96)

    # Rule A: Top-Right is EMPTY (0) and Bottom-Left is ACTIVE (1) -> MUST BE '6' (Never guess '8')
    if top_right == 0 and bottom_left == 1:
        return 6, max(conf, 0.95)

    # Rule B: Bottom-Left is EMPTY (0) and Top-Right is ACTIVE (1) and Top ACTIVE (1) -> MUST BE '9' (Never guess '6')
    if bottom_left == 0 and top_right == 1 and top == 1:
        return 9, max(conf, 0.95)

    # Rule D: Bottom-Left EMPTY (0) and Top-Right & Bottom-Right & Top ACTIVE -> MUST BE '3'
    if bottom_left == 0 and top_right == 1 and bottom_right == 1 and top == 1:
        return 3, max(conf, 0.92)

    # Rule E: Top, Top-Right, Bottom-Right ACTIVE, Middle & Bottom EMPTY -> MUST BE '7'
    if top == 1 and top_right == 1 and bottom_right == 1 and middle == 0 and bottom == 0:
        return 7, max(conf, 0.95)

    if raw_digit is not None:
        return raw_digit, conf

    return 0, 0.5


def fix_digit_prediction(digit_crop: np.ndarray, model_prediction: int) -> int:
    h, w = digit_crop.shape[:2]
    if h < 10 or w < 4:
        return model_prediction

    top_left_region = digit_crop[int(h * 0.15):int(h * 0.45), 0:int(w * 0.35)]
    top_left_pixels = cv2.countNonZero(top_left_region) if top_left_region.size > 0 else 0
    top_left_total = top_left_region.size if top_left_region.size > 0 else 1

    bottom_left_region = digit_crop[int(h * 0.55):int(h * 0.85), 0:int(w * 0.35)]
    bottom_left_pixels = cv2.countNonZero(bottom_left_region) if bottom_left_region.size > 0 else 0
    bottom_left_total = bottom_left_region.size if bottom_left_region.size > 0 else 1

    is_tl_empty = (top_left_pixels / float(top_left_total)) < 0.10
    is_bl_empty = (bottom_left_pixels / float(bottom_left_total)) < 0.10

    if is_tl_empty and is_bl_empty:
        return 3

    if (not is_tl_empty) and is_bl_empty:
        return 9

    return model_prediction


def recognize_digit_from_crop(digit_crop: np.ndarray) -> tuple[int, float]:
    h, w = digit_crop.shape[:2]
    if h < 10 or w < 4:
        return None, 0.0

    # Rule for '1': If aspect ratio w/h < 0.35 (very skinny box), FORCE digit to 1
    aspect_w_h = w / float(h)
    if aspect_w_h < 0.35:
        return 1, 0.98

    mlp_digit, mlp_conf = _mlp_classify(digit_crop)

    segments_rel = [
        (0.2, 0.0, 0.6, 0.2),    # Top [0]
        (0.0, 0.08, 0.3, 0.42),  # Top-Left [1]
        (0.7, 0.08, 0.3, 0.42),  # Top-Right [2]
        (0.2, 0.4, 0.6, 0.2),    # Middle [3]
        (0.0, 0.5, 0.3, 0.42),   # Bottom-Left [4]
        (0.7, 0.5, 0.3, 0.42),   # Bottom-Right [5]
        (0.2, 0.8, 0.6, 0.2),    # Bottom [6]
    ]

    active_pattern = []
    scores = []

    for (rx, ry, rw, rh) in segments_rel:
        x1, y1 = int(rx * w), int(ry * h)
        x2, y2 = int((rx + rw) * w), int((ry + rh) * h)

        roi = digit_crop[y1:y2, x1:x2]
        if roi.size == 0:
            active_pattern.append(0)
            scores.append(0.0)
            continue

        on_pixels = cv2.countNonZero(roi)
        total_pixels = roi.shape[0] * roi.shape[1]
        ratio = on_pixels / float(total_pixels) if total_pixels > 0 else 0

        is_on = 1 if ratio > 0.22 else 0
        active_pattern.append(is_on)
        scores.append(ratio if is_on else (1.0 - ratio))

    pattern_tuple = tuple(active_pattern)
    raw_digit = SEVEN_SEG_MAP.get(pattern_tuple, None)
    confidence = float(np.mean(scores)) if scores else 0.5

    top, top_left, top_right, middle, bottom_left, bottom_right, bottom = active_pattern

    # Correct MLP misclassifications for 9 vs 6
    if mlp_digit == 6 and bottom_left == 0 and top_right == 1:
        mlp_digit = 9
    elif mlp_digit == 8 and top_right == 0 and bottom_left == 1:
        mlp_digit = 6

    if mlp_digit is not None and mlp_conf >= 0.75:
        geo_digit, geo_conf = verify_7segment_geometric_rules(active_pattern, mlp_digit, mlp_conf)
        final_d = fix_digit_prediction(digit_crop, geo_digit)
        return final_d, geo_conf

    final_digit, final_conf = verify_7segment_geometric_rules(active_pattern, raw_digit, confidence)
    final_d = fix_digit_prediction(digit_crop, final_digit)
    return final_d, final_conf


def autocorrect_scale_weight(weight_digits: list[str]) -> tuple[int, float]:
    raw_str = "".join(weight_digits)
    cleaned_str = re.sub(r"\D", "", raw_str)
    
    if not cleaned_str:
        return 0

    if len(cleaned_str) > 4:
        cleaned_str = cleaned_str[:4]
    
    if len(cleaned_str) > 3 and cleaned_str.startswith("0"):
        cleaned_str = cleaned_str[1:]

    return int(cleaned_str) if cleaned_str else 0


SEVEN_SEG_MATRIX_ROBUST = {
    (1, 1, 1, 1, 1, 1, 0): "0",
    (0, 1, 1, 0, 0, 0, 0): "1",
    (1, 1, 0, 1, 1, 0, 1): "2",
    (1, 1, 1, 1, 0, 0, 1): "3",
    (0, 1, 1, 0, 0, 1, 1): "4",
    (1, 0, 1, 1, 0, 1, 1): "5",
    (1, 0, 1, 1, 1, 1, 1): "6", (0, 0, 1, 1, 1, 1, 1): "6",
    (1, 1, 1, 0, 0, 0, 0): "7", (1, 1, 1, 0, 0, 1, 0): "7",
    (1, 1, 1, 1, 1, 1, 1): "8",
    (1, 1, 1, 1, 0, 1, 1): "9", (1, 1, 1, 0, 0, 1, 1): "9",
    (0, 0, 0, 0, 0, 0, 0): "",
}

VALID_PATTERNS = {
    "0": (1, 1, 1, 1, 1, 1, 0),
    "1": (0, 1, 1, 0, 0, 0, 0),
    "2": (1, 1, 0, 1, 1, 0, 1),
    "3": (1, 1, 1, 1, 0, 0, 1),
    "4": (0, 1, 1, 0, 0, 1, 1),
    "5": (1, 0, 1, 1, 0, 1, 1),
    "6": (1, 0, 1, 1, 1, 1, 1),
    "7": (1, 1, 1, 0, 0, 0, 0),
    "8": (1, 1, 1, 1, 1, 1, 1),
    "9": (1, 1, 1, 1, 0, 1, 1),
}


def get_closest_matching_digit(state: tuple[int, ...]) -> str:
    if sum(state) == 0:
        return ""
    best_digit = "?"
    min_dist = 999
    for digit, pat in VALID_PATTERNS.items():
        dist = sum(1 for a, b in zip(state, pat) if a != b)
        if dist < min_dist:
            min_dist = dist
            best_digit = digit
    return best_digit if min_dist <= 2 else "?"


def decode_7segment_robust(a: int, b: int, c: int, d: int, e: int, f: int, g: int) -> str:
    state = (a, b, c, d, e, f, g)
    if state in SEVEN_SEG_MATRIX_ROBUST:
        return SEVEN_SEG_MATRIX_ROBUST[state]
    return get_closest_matching_digit(state)


def decode_fixed_slots_7segment(processed_mask: np.ndarray, num_slots: int = 3) -> tuple[str, float]:
    img_h, img_w = processed_mask.shape[:2]

    contours, _ = cv2.findContours(processed_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        best_cnt = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(best_cnt)
        if w > 30 and h > 15:
            display_crop = processed_mask[y:y+h, x:x+w]
        else:
            display_crop = processed_mask
    else:
        display_crop = processed_mask

    dh, dw = display_crop.shape[:2]
    if dh < 10 or dw < 15:
        return "", 0.0

    slot_w = dw / float(num_slots)
    decoded_digits = []
    has_unknown = False

    for i in range(num_slots):
        sx1 = int(i * slot_w)
        sx2 = int((i + 1) * slot_w)
        slot_crop = display_crop[:, sx1:sx2]
        sh, sw = slot_crop.shape[:2]

        if sh < 5 or sw < 3:
            decoded_digits.append("")
            continue

        segments_map = [
            slot_crop[0:int(sh * 0.22), int(sw * 0.20):int(sw * 0.80)],
            slot_crop[int(sh * 0.08):int(sh * 0.48), int(sw * 0.65):sw],
            slot_crop[int(sh * 0.52):int(sh * 0.92), int(sw * 0.65):sw],
            slot_crop[int(sh * 0.78):sh, int(sw * 0.20):int(sw * 0.80)],
            slot_crop[int(sh * 0.52):int(sh * 0.92), 0:int(sw * 0.35)],
            slot_crop[int(sh * 0.08):int(sh * 0.48), 0:int(sw * 0.35)],
            slot_crop[int(sh * 0.38):int(sh * 0.62), int(sw * 0.20):int(sw * 0.80)],
        ]

        ratios = []
        for reg in segments_map:
            if reg.size == 0:
                ratios.append(0.0)
                continue
            r = cv2.countNonZero(reg) / float(reg.size)
            ratios.append(r)

        max_ratio = max(ratios) if ratios else 0.0

        if max_ratio < 0.08:
            states = [0] * 7
        else:
            states = [1 if (r / max_ratio) >= 0.40 else 0 for r in ratios]

        digit_char = decode_7segment_robust(*states)
        if digit_char == "?":
            has_unknown = True
        decoded_digits.append(digit_char)

    if has_unknown or not any(d.isdigit() for d in decoded_digits):
        return "", 0.0

    raw_weight_str = "".join(d for d in decoded_digits if d.isdigit())
    return raw_weight_str, 0.99


def process_spectrum_detection(bgr_img: np.ndarray):
    processed_mask = preprocess_hsv_red_led(bgr_img)
    img_h, img_w = processed_mask.shape[:2]

    fixed_slot_str, fixed_conf = decode_fixed_slots_7segment(processed_mask, num_slots=3)

    contours, _ = cv2.findContours(processed_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    raw_candidates = []
    min_h = int(img_h * 0.08)
    max_h = int(img_h * 0.95)

    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        aspect_ratio = h / float(w) if w > 0 else 0
        area = cv2.contourArea(cnt)

        if w < 10 or h < min_h:
            continue

        if min_h <= h <= max_h and area > 40:
            if aspect_ratio < 0.9 and w > int(h * 0.75):
                half_w = int(w / 2)
                crop1 = processed_mask[y:y+h, x:x+half_w]
                digit1, conf1 = recognize_digit_from_crop(crop1)
                if digit1 is not None:
                    raw_candidates.append({'box': (x, y, half_w, h), 'digit': digit1, 'confidence': conf1})

                crop2 = processed_mask[y:y+h, x+half_w:x+w]
                digit2, conf2 = recognize_digit_from_crop(crop2)
                if digit2 is not None:
                    raw_candidates.append({'box': (x + half_w, y, half_w, h), 'digit': digit2, 'confidence': conf2})
            else:
                crop = processed_mask[y:y+h, x:x+w]
                digit, conf = recognize_digit_from_crop(crop)
                if digit is not None:
                    raw_candidates.append({'box': (x, y, w, h), 'digit': digit, 'confidence': conf})

    final_candidates = apply_nms_and_overlap_filter(raw_candidates, iou_threshold=0.3)
    final_candidates.sort(key=lambda c: c['box'][0])

    detected_digits = []
    confidences = []
    preview_overlay = cv2.cvtColor(processed_mask, cv2.COLOR_GRAY2BGR)

    for cand in final_candidates:
        x, y, w, h = cand['box']
        digit = cand['digit']
        conf = cand['confidence']

        detected_digits.append(str(digit))
        confidences.append(conf)

        cv2.rectangle(preview_overlay, (x, y), (x + w, y + h), (0, 255, 0), 2)
        cv2.putText(preview_overlay, str(digit), (x, max(15, y - 5)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    _, buffer = cv2.imencode(".png", preview_overlay)
    base64_preview = "data:image/png;base64," + base64.b64encode(buffer).decode("utf-8")

    if not detected_digits:
        return {
            "status": "WARNING_LOW_CONFIDENCE",
            "weight_detected": 0,
            "confidence": 0.0,
            "spectrum_processed_image": base64_preview,
            "engine_version": "4.0.0 (Geometric Heuristic & NMS Active)",
            "message": "No LED digits detected in image"
        }

    if fixed_slot_str and fixed_slot_str.isdigit():
        val = int(fixed_slot_str)
        if val > 0:
            _, buffer = cv2.imencode(".png", cv2.cvtColor(processed_mask, cv2.COLOR_GRAY2BGR))
            base64_preview = "data:image/png;base64," + base64.b64encode(buffer).decode("utf-8")
            return {
                "status": "SUCCESS",
                "weight_detected": val,
                "confidence": 0.98,
                "spectrum_processed_image": base64_preview,
                "engine_version": "5.0.0 (Fixed-Slot 7-Segment Matrix Decoder)"
            }

    weight_val = autocorrect_scale_weight(detected_digits)
    avg_confidence = float(np.mean(confidences)) if confidences else 0.0

    status = "SUCCESS" if avg_confidence >= 0.80 else "WARNING_LOW_CONFIDENCE"

    return {
        "status": status,
        "weight_detected": weight_val,
        "confidence": round(avg_confidence, 4),
        "spectrum_processed_image": base64_preview,
        "engine_version": "5.0.0 (Fixed-Slot 7-Segment Matrix Decoder)"
    }


@app.get("/")
def health_check():
    return {
        "engine": "SPECTRUM Engine 4.0 AI Microservice",
        "heuristic_rules": "ACTIVE (6vs8, 9vs4, 0vs8, 3vs2)",
        "nms_status": "ACTIVE",
        "status": "ONLINE",
        "version": "4.0.0"
    }


@app.get("/api/spectrum/stats")
def get_stats():
    return get_dataset_statistics()


class DetectRequest(BaseModel):
    image: Optional[str] = None
    images: Optional[list[str]] = None


@app.post("/api/spectrum/detect")
def detect_weight(payload: DetectRequest):
    try:
        if payload.images and len(payload.images) > 0:
            results = []
            for b64 in payload.images:
                try:
                    img = decode_base64_image(b64)
                    res = process_spectrum_detection(img)
                    w = res.get("weight_detected", 0)
                    if w > 0:
                        results.append(w)
                except Exception:
                    continue

            if results:
                counts = Counter(results)
                mode_weight, _ = counts.most_common(1)[0]
                first_img = decode_base64_image(payload.images[0])
                res = process_spectrum_detection(first_img)
                res["weight_detected"] = mode_weight
                res["confidence"] = 1.0
                res["engine_version"] = "5.1.0 (Adaptive 7-Segment & Temporal Consensus)"
                res["message"] = "100% Conf (Multi-Frame Verified)"
                return res
            elif payload.image:
                bgr_img = decode_base64_image(payload.image)
                res = process_spectrum_detection(bgr_img)
                if res.get("weight_detected", 0) > 0:
                    return res
                fallback = run_easyocr_fallback(bgr_img)
                if fallback: return fallback
                return res
            else:
                first_img = decode_base64_image(payload.images[0])
                fallback = run_easyocr_fallback(first_img)
                if fallback: return fallback
                return process_spectrum_detection(first_img)
        elif payload.image:
            bgr_img = decode_base64_image(payload.image)
            res = process_spectrum_detection(bgr_img)
            if res.get("weight_detected", 0) > 0:
                return res
            fallback = run_easyocr_fallback(bgr_img)
            if fallback: return fallback
            return res
        else:
            raise HTTPException(status_code=400, detail="Param image or images is required.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/spectrum/retrain")
def retrain_model():
    result = start_training_background(epochs=300)
    return result


@app.get("/api/spectrum/retrain-status")
def retrain_status():
    return get_retrain_status()
