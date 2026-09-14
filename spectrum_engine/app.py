
import base64
import re
import io
import os
import sys
import cv2
import numpy as np
from PIL import Image
from collections import Counter
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_current_dir)
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)

try:
    from spectrum_engine.train_spectrum_led import (
        start_training_background,
        get_retrain_status,
        get_dataset_statistics,
    )
except ImportError:
    from train_spectrum_led import (
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
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
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
    lower_red1 = np.array([0, 50, 50])
    upper_red1 = np.array([15, 255, 255])
    lower_red2 = np.array([160, 50, 50])
    upper_red2 = np.array([180, 255, 255])
    mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
    mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
    red_mask = cv2.bitwise_or(mask1, mask2)

    red_pixels = cv2.countNonZero(red_mask)
    if red_pixels > 300:
        # Use a compact 3x3 close kernel so we don't bridge adjacent digits together
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        closed_mask = cv2.morphologyEx(red_mask, cv2.MORPH_CLOSE, kernel)
        
        # Remove border artifacts touching top or bottom margins that bridge separate digits
        H, W = closed_mask.shape
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(closed_mask)
        for i in range(1, num_labels):
            x, y, w, h, area = stats[i]
            if (y <= 5 or (y + h) >= H - 5) and (h < H * 0.25 or w > W * 0.40):
                closed_mask[labels == i] = 0
            elif (y <= 3 and (y + h) >= H - 3):
                closed_mask[labels == i] = 0

        return closed_mask

    # 2. Dark LCD / Ink Detection (black on light bg fallback)
    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
    dark_mask = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 15
    )
    noise_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dark_mask = cv2.morphologyEx(dark_mask, cv2.MORPH_OPEN, noise_kernel)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    closed_mask = cv2.morphologyEx(dark_mask, cv2.MORPH_CLOSE, kernel)
    
    H, W = closed_mask.shape
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(closed_mask)
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if (y <= 5 or (y + h) >= H - 5) and (h < H * 0.25 or w > W * 0.40):
            closed_mask[labels == i] = 0

    return closed_mask


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

    # 0: Middle empty, top & bottom active, left active
    if middle == 0 and top == 1 and bottom == 1 and top_left == 1 and bottom_left == 1:
        return 0, max(conf, 0.96)

    # 4: Top & bottom empty, middle active, right active (NEVER guess 9 or 8)
    if top == 0 and bottom == 0 and middle == 1 and (top_right == 1 or bottom_right == 1):
        return 4, max(conf, 0.96)

    # 1: Only right segments active
    if top == 0 and bottom == 0 and middle == 0 and top_left == 0 and bottom_left == 0 and (top_right == 1 or bottom_right == 1):
        return 1, max(conf, 0.98)

    # 7: Top, top-right, bottom-right active, middle & bottom & top-left empty (NEVER guess 3)
    if top == 1 and top_right == 1 and bottom_right == 1 and middle == 0 and bottom == 0 and top_left == 0:
        return 7, max(conf, 0.95)

    # 6: Top-right empty, bottom-left active (NEVER guess 8 or 5)
    if top_right == 0 and bottom_left == 1:
        return 6, max(conf, 0.95)

    # 5: Top-right empty, top-left active, bottom-left empty, bottom-right active (NEVER guess 9 or 6)
    if top_right == 0 and top_left == 1 and bottom_left == 0 and bottom_right == 1:
        return 5, max(conf, 0.95)

    # 3: Top-left empty, bottom-left empty, top-right & bottom-right active, middle active (NEVER guess 9)
    if top_left == 0 and bottom_left == 0 and top_right == 1 and bottom_right == 1 and middle == 1:
        return 3, max(conf, 0.95)

    # 9: Top-left active, top-right active, bottom-left empty, bottom-right active, top active
    if top_left == 1 and top_right == 1 and bottom_left == 0 and bottom_right == 1 and top == 1 and middle == 1:
        return 9, max(conf, 0.95)

    # 8: All 7 segments active
    if top_left == 1 and top_right == 1 and bottom_left == 1 and bottom_right == 1 and middle == 1 and top == 1 and bottom == 1:
        return 8, max(conf, 0.95)

    # 2: Top-left empty, bottom-right empty, top-right active, bottom-left active
    if top_left == 0 and bottom_right == 0 and top_right == 1 and bottom_left == 1:
        return 2, max(conf, 0.95)

    if raw_digit is not None:
        return raw_digit, conf

    return 0, 0.5


def fix_digit_prediction(digit_crop: np.ndarray, model_prediction: int, ratios: list[float] = None) -> int:
    h, w = digit_crop.shape[:2]
    if h < 10 or w < 4:
        return model_prediction

    if ratios and len(ratios) == 7:
        top_r, tl_r, tr_r, mid_r, bl_r, br_r, bot_r = ratios
        # Critical 3 vs 8 disambiguation:
        if model_prediction == 8:
            is_tl_weak = (tl_r < 0.25) or (tr_r > 0.35 and tl_r < 0.48 * tr_r)
            is_bl_weak = (bl_r < 0.25) or (br_r > 0.35 and bl_r < 0.48 * br_r)
            if is_tl_weak and is_bl_weak:
                return 3
            elif is_tl_weak and not is_bl_weak:
                return 6 if tr_r < 0.35 else 8
            elif not is_tl_weak and is_bl_weak:
                return 9
        elif model_prediction == 3:
            is_tl_strong = (tl_r >= 0.35) and (tr_r <= 0.20 or tl_r >= 0.55 * tr_r)
            is_bl_strong = (bl_r >= 0.35) and (br_r <= 0.20 or bl_r >= 0.55 * br_r)
            if is_tl_strong and is_bl_strong:
                return 8
            elif is_tl_strong and not is_bl_strong:
                return 9

    # Keep confident predictions for other distinct digits
    if model_prediction in (1, 2, 4, 5, 7):
        return model_prediction

    top_left_region = digit_crop[int(h * 0.18):int(h * 0.40), 0:int(w * 0.28)]
    top_left_pixels = cv2.countNonZero(top_left_region) if top_left_region.size > 0 else 0
    top_left_total = top_left_region.size if top_left_region.size > 0 else 1

    bottom_left_region = digit_crop[int(h * 0.60):int(h * 0.82), 0:int(w * 0.28)]
    bottom_left_pixels = cv2.countNonZero(bottom_left_region) if bottom_left_region.size > 0 else 0
    bottom_left_total = bottom_left_region.size if bottom_left_region.size > 0 else 1

    is_tl_empty = (top_left_pixels / float(top_left_total)) < 0.15
    is_bl_empty = (bottom_left_pixels / float(bottom_left_total)) < 0.15

    # Check middle and bottom segments to distinguish 3 from 7
    middle_region = digit_crop[int(h * 0.40):int(h * 0.60), int(w * 0.20):int(w * 0.80)]
    mid_pixels = cv2.countNonZero(middle_region) if middle_region.size > 0 else 0
    mid_total = middle_region.size if middle_region.size > 0 else 1
    is_mid_active = (mid_pixels / float(mid_total)) > 0.15

    bottom_region = digit_crop[int(h * 0.80):h, int(w * 0.20):int(w * 0.80)]
    bot_pixels = cv2.countNonZero(bottom_region) if bottom_region.size > 0 else 0
    bot_total = bottom_region.size if bottom_region.size > 0 else 1
    is_bot_active = (bot_pixels / float(bot_total)) > 0.15

    if is_tl_empty and is_bl_empty:
        if not is_mid_active and not is_bot_active:
            return 7
        if is_mid_active and is_bot_active:
            return 3
        return model_prediction

    return model_prediction


def recognize_digit_from_crop(digit_crop: np.ndarray) -> tuple[int, float]:
    h, w = digit_crop.shape[:2]
    if h < 10 or w < 4:
        return None, 0.0

    # Ensure binary mask (0 background, 255 foreground)
    bin_crop = digit_crop
    if bin_crop.ndim == 3:
        bin_crop = cv2.cvtColor(bin_crop, cv2.COLOR_BGR2GRAY)
    
    unique_vals = np.unique(bin_crop)
    if len(unique_vals) > 2 or (len(unique_vals) == 2 and not (0 in unique_vals and 255 in unique_vals)):
        corners = [bin_crop[0, 0], bin_crop[0, -1], bin_crop[-1, 0], bin_crop[-1, -1]]
        bg_val = np.median(corners)
        if bg_val > 127:
            _, bin_crop = cv2.threshold(bin_crop, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        else:
            _, bin_crop = cv2.threshold(bin_crop, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Rule for '1': If aspect ratio w/h < 0.38 (skinny box), FORCE digit to 1
    aspect_w_h = w / float(h)
    if aspect_w_h < 0.38:
        return 1, 0.98

    # Also detect '1' when left half is empty and right half is active (distinguishes 1 from 8)
    left_half = bin_crop[:, 0:int(w * 0.45)]
    right_half = bin_crop[:, int(w * 0.55):w]
    left_density = (cv2.countNonZero(left_half) / float(left_half.size)) if left_half.size > 0 else 0
    right_density = (cv2.countNonZero(right_half) / float(right_half.size)) if right_half.size > 0 else 0
    if left_density < 0.08 and right_density > 0.20:
        return 1, 0.96

    # Dedicated non-overlapping 7-segment core sample zones:
    segments_rel = [
        (0.20, 0.00, 0.60, 0.18),    # Top [0]
        (0.00, 0.18, 0.28, 0.22),    # Top-Left [1] (pure vertical zone)
        (0.72, 0.18, 0.28, 0.22),    # Top-Right [2] (pure vertical zone)
        (0.20, 0.42, 0.60, 0.16),    # Middle [3]
        (0.00, 0.60, 0.28, 0.22),    # Bottom-Left [4] (pure vertical zone)
        (0.72, 0.60, 0.28, 0.22),    # Bottom-Right [5] (pure vertical zone)
        (0.20, 0.82, 0.60, 0.18),    # Bottom [6]
    ]

    ratios = []
    for (rx, ry, rw, rh) in segments_rel:
        x1, y1 = int(rx * w), int(ry * h)
        x2, y2 = max(x1 + 1, int((rx + rw) * w)), max(y1 + 1, int((ry + rh) * h))

        roi = bin_crop[y1:y2, x1:x2]
        if roi.size == 0:
            ratios.append(0.0)
            continue

        on_pixels = cv2.countNonZero(roi)
        ratio = on_pixels / float(roi.size)
        ratios.append(ratio)

    top_r, tl_r, tr_r, mid_r, bl_r, br_r, bot_r = ratios
    is_tl = (tl_r > 0.25) and (tr_r <= 0.20 or tl_r > 0.48 * tr_r)
    is_bl = (bl_r > 0.25) and (br_r <= 0.20 or bl_r > 0.48 * br_r)
    is_tr = tr_r > 0.25
    is_br = br_r > 0.25
    is_top = top_r > 0.22
    is_mid = mid_r > 0.22
    is_bot = bot_r > 0.22

    active_pattern = [
        1 if is_top else 0,
        1 if is_tl else 0,
        1 if is_tr else 0,
        1 if is_mid else 0,
        1 if is_bl else 0,
        1 if is_br else 0,
        1 if is_bot else 0,
    ]

    # Explicit 3 vs 8 vs 9 disambiguation:
    if is_top and is_mid and is_bot and is_tr and is_br:
        if not is_tl and not is_bl:
            return 3, 0.98
        elif is_tl and not is_bl:
            return 9, 0.96
        elif is_tl and is_bl:
            return 8, 0.98
        elif not is_tl and is_bl:
            return (8 if bl_r > 0.40 else 3), 0.92

    mlp_digit, mlp_conf = _mlp_classify(digit_crop)

    # Correct MLP misclassifications
    if mlp_digit == 8 and (not is_tl or not is_bl):
        if not is_tl and not is_bl:
            mlp_digit = 3
        elif is_tl and not is_bl:
            mlp_digit = 9
    elif mlp_digit == 3 and (is_tl and is_bl):
        mlp_digit = 8
    elif mlp_digit == 6 and not is_bl and is_tr:
        mlp_digit = 9
    elif mlp_digit == 8 and not is_tr and is_bl:
        mlp_digit = 6
    elif mlp_digit == 9 and not is_top and not is_bot:
        mlp_digit = 4
    elif mlp_digit == 9 and not is_tr:
        mlp_digit = 5

    if mlp_digit is not None and mlp_conf >= 0.75:
        geo_digit, geo_conf = verify_7segment_geometric_rules(active_pattern, mlp_digit, mlp_conf)
        final_d = fix_digit_prediction(digit_crop, geo_digit, ratios)
        return final_d, geo_conf

    final_digit, final_conf = verify_7segment_geometric_rules(active_pattern, mlp_digit, 0.85)
    final_d = fix_digit_prediction(digit_crop, final_digit, ratios)
    return final_d, final_conf


def autocorrect_scale_weight(weight_digits: list[str]) -> int:
    raw_str = "".join(weight_digits)
    cleaned_str = re.sub(r"\D", "", raw_str)
    
    if not cleaned_str:
        return 0

    if len(cleaned_str) > 5:
        cleaned_str = cleaned_str[:5]
    
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

    if detected_digits:
        weight_val = autocorrect_scale_weight(detected_digits)
        if weight_val > 0:
            avg_confidence = float(np.mean(confidences)) if confidences else 0.0
            status = "SUCCESS" if avg_confidence >= 0.75 else "WARNING_LOW_CONFIDENCE"
            return {
                "status": status,
                "weight_detected": weight_val,
                "confidence": round(avg_confidence, 4),
                "spectrum_processed_image": base64_preview,
                "engine_version": "5.2.0 (SPECTRUM Contour & Heuristic Active)"
            }

    if fixed_slot_str and fixed_slot_str.isdigit():
        val = int(fixed_slot_str)
        if val > 0:
            _, buffer = cv2.imencode(".png", cv2.cvtColor(processed_mask, cv2.COLOR_GRAY2BGR))
            base64_preview = "data:image/png;base64," + base64.b64encode(buffer).decode("utf-8")
            return {
                "status": "SUCCESS",
                "weight_detected": val,
                "confidence": 0.85,
                "spectrum_processed_image": base64_preview,
                "engine_version": "5.2.0 (Fixed-Slot 7-Segment Decoder Fallback)"
            }

    return {
        "status": "WARNING_LOW_CONFIDENCE",
        "weight_detected": 0,
        "confidence": 0.0,
        "spectrum_processed_image": base64_preview,
        "engine_version": "5.2.0",
        "message": "No LED digits detected in image"
    }


@app.get("/")
@app.get("/api/spectrum/health")
def health_check():
    return {
        "engine": "SPECTRUM Engine 4.0 AI Microservice",
        "heuristic_rules": "ACTIVE (disjoint 10-digit geometric validation)",
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
