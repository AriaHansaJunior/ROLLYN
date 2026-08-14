
import base64
import re
import io
import os
import cv2
import numpy as np
from PIL import Image
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
    hsv = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2HSV)

    lower_red1 = np.array([0, 100, 100])
    upper_red1 = np.array([10, 255, 255])
    lower_red2 = np.array([160, 100, 100])
    upper_red2 = np.array([180, 255, 255])

    mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
    mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
    red_mask = cv2.bitwise_or(mask1, mask2)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed_mask = cv2.morphologyEx(red_mask, cv2.MORPH_CLOSE, kernel)
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

    if middle == 0 and top == 1 and bottom == 1:
        return 0, max(conf, 0.96)

    if top_right == 0 and bottom_left == 1:
        return 6, max(conf, 0.95)

    if bottom_left == 0 and top_left == 1 and top == 1:
        return 9, max(conf, 0.95)

    if top_right == 1 and bottom_right == 1 and bottom_left == 0 and top == 1:
        return 3, max(conf, 0.92)

    if top == 1 and top_right == 1 and bottom_right == 1 and middle == 0 and bottom == 0:
        return 7, max(conf, 0.95)

    if raw_digit is not None:
        return raw_digit, conf

    return 0, 0.5


def recognize_digit_from_crop(digit_crop: np.ndarray) -> tuple[int, float]:
    h, w = digit_crop.shape[:2]
    if h < 10 or w < 4:
        return None, 0.0

    mlp_digit, mlp_conf = _mlp_classify(digit_crop)
    if mlp_digit is not None and mlp_conf >= 0.70:
        return mlp_digit, mlp_conf

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

    if mlp_digit is not None and mlp_conf >= 0.40:
        heuristic_digit, heuristic_conf = verify_7segment_geometric_rules(active_pattern, mlp_digit, mlp_conf)
        return heuristic_digit, (mlp_conf + heuristic_conf) / 2

    final_digit, final_conf = verify_7segment_geometric_rules(active_pattern, raw_digit, confidence)
    return final_digit, final_conf


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


def process_spectrum_detection(bgr_img: np.ndarray):
    processed_mask = preprocess_hsv_red_led(bgr_img)
    img_h, img_w = processed_mask.shape[:2]

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

    weight_val = autocorrect_scale_weight(detected_digits)
    avg_confidence = float(np.mean(confidences)) if confidences else 0.0

    status = "SUCCESS" if avg_confidence >= 0.80 else "WARNING_LOW_CONFIDENCE"

    return {
        "status": status,
        "weight_detected": weight_val,
        "confidence": round(avg_confidence, 4),
        "spectrum_processed_image": base64_preview,
        "engine_version": "4.0.0 (Geometric Heuristic & NMS Active)"
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


@app.post("/api/spectrum/detect")
def detect_weight(payload: DetectRequest):
    try:
        bgr_img = decode_base64_image(payload.image)
        result = process_spectrum_detection(bgr_img)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/spectrum/retrain")
def retrain_model():
    result = start_training_background(epochs=300)
    return result


@app.get("/api/spectrum/retrain-status")
def retrain_status():
    return get_retrain_status()
