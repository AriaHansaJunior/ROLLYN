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

_MLP_CACHE = {"model": None, "scaler": None, "loaded_at": 0}
_BEST_MLP_PATH = os.path.join(_current_dir, "best_mlp.pkl")
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


def _load_mlp_if_available():
    global _MLP_CACHE
    try:
        if not os.path.exists(_BEST_MLP_PATH):
            return None, None
        mtime = os.path.getmtime(_BEST_MLP_PATH)
        if _MLP_CACHE["loaded_at"] >= mtime and _MLP_CACHE["model"] is not None:
            return _MLP_CACHE["model"], _MLP_CACHE["scaler"]
        import joblib
        data = joblib.load(_BEST_MLP_PATH)
        _MLP_CACHE["model"] = data.get("model")
        _MLP_CACHE["scaler"] = data.get("scaler")
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
    if clf is None or scaler is None:
        return None, 0.0, {d: 0.1 for d in range(10)}
    try:
        feat = _compute_digit_features(gray_crop).reshape(1, -1).astype(np.float32)
        if getattr(clf, "n_features_in_", 1159) != feat.shape[1]:
            return None, 0.0, {d: 0.1 for d in range(10)}
        feat_scaled = scaler.transform(feat)
        proba = clf.predict_proba(feat_scaled)[0]
        top_cls = int(np.argmax(proba))
        top_conf = float(proba[top_cls])
        prob_dict = {i: float(proba[i]) if i < len(proba) else 0.0 for i in range(10)}
        return top_cls, top_conf, prob_dict
    except Exception:
        return None, 0.0, {d: 0.1 for d in range(10)}


# =========================================================================
# ENGINE C: 7-SEGMENT TEMPLATE MATCHING (MULTI-VARIANT 0-9)
# =========================================================================

def _build_7seg_templates(w: int = 32, h: int = 48) -> dict:
    digit_segs_variants = {
        0: [['a', 'b', 'c', 'd', 'e', 'f']],
        1: [['b', 'c']],
        2: [['a', 'b', 'g', 'e', 'd']],
        3: [['a', 'b', 'g', 'c', 'd']],
        4: [['f', 'g', 'b', 'c'], ['g', 'b', 'c']],                     # standard & cross-style 4
        5: [['a', 'f', 'g', 'c', 'd']],
        6: [['a', 'f', 'g', 'e', 'c', 'd'], ['f', 'g', 'e', 'c', 'd']], # with & without top bar
        7: [['a', 'b', 'c'], ['a', 'b', 'c', 'f']],                     # with & without serif
        8: [['a', 'b', 'c', 'd', 'e', 'f', 'g']],
        9: [['a', 'b', 'c', 'f', 'g'], ['a', 'b', 'c', 'd', 'f', 'g']], # without & with bottom bar
    }

    t = max(2, int(w * 0.12))
    templates = {}

    for digit, variants in digit_segs_variants.items():
        templates[digit] = []
        for segs in variants:
            img = np.zeros((h, w), dtype=np.uint8)
            if digit == 1:
                rx = int(w * 0.65)
                img[2:h-2, rx-t//2:rx+t//2+1] = 255
                templates[digit].append(img)
                continue

            x_left = int(w * 0.15)
            x_right = int(w * 0.85)
            y_top = int(h * 0.10)
            y_mid = int(h * 0.50)
            y_bot = int(h * 0.90)

            if 'a' in segs: img[y_top-t//2:y_top+t//2+1, x_left:x_right] = 255
            if 'd' in segs: img[y_bot-t//2:y_bot+t//2+1, x_left:x_right] = 255
            if 'g' in segs: img[y_mid-t//2:y_mid+t//2+1, x_left:x_right] = 255
            if 'f' in segs: img[y_top:y_mid, x_left-t//2:x_left+t//2+1] = 255
            if 'e' in segs: img[y_mid:y_bot, x_left-t//2:x_left+t//2+1] = 255
            if 'b' in segs: img[y_top:y_mid, x_right-t//2:x_right+t//2+1] = 255
            if 'c' in segs: img[y_mid:y_bot, x_right-t//2:x_right+t//2+1] = 255

            templates[digit].append(img)

    return templates

_TEMPLATES_CACHE = _build_7seg_templates(32, 48)


def _classify_template(crop_bin: np.ndarray) -> dict:
    h, w = crop_bin.shape[:2]
    if h < 5 or w < 3:
        return {d: 0.1 for d in range(10)}

    resized = cv2.resize(crop_bin, (32, 48))
    scores = {}
    for d, tmpl_list in _TEMPLATES_CACHE.items():
        best_s = 0.0
        for tmpl in tmpl_list:
            res = cv2.matchTemplate(resized, tmpl, cv2.TM_CCOEFF_NORMED)
            score = max(0.0, float(res[0, 0]))
            if score > best_s:
                best_s = score
        scores[d] = best_s

    total = sum(scores.values()) + 1e-6
    return {d: scores[d] / total for d in range(10)}


# =========================================================================
# ENGINE D: STRUCTURAL SKELETON & TOPOLOGICAL ANALYSIS
# =========================================================================

def _classify_structural(crop_bin: np.ndarray) -> dict:
    h, w = crop_bin.shape[:2]
    if h < 8 or w < 4:
        return {d: 0.1 for d in range(10)}

    # Hole count via contour hierarchy
    contours, hierarchy = cv2.findContours(crop_bin, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    num_holes = 0
    if hierarchy is not None:
        for row in hierarchy[0]:
            if row[3] != -1:
                num_holes += 1

    scores = {d: 0.05 for d in range(10)}
    if num_holes >= 2:
        scores[8] = 0.85
    elif num_holes == 1:
        scores[0] = 0.35
        scores[6] = 0.25
        scores[9] = 0.25
        scores[4] = 0.15
    else:
        scores[1] = 0.25
        scores[2] = 0.20
        scores[3] = 0.20
        scores[5] = 0.20
        scores[7] = 0.15

    total = sum(scores.values()) + 1e-6
    return {d: scores[d] / total for d in range(10)}


# =========================================================================
# ENGINE A: 7-SEGMENT GEOMETRIC CORE ANALYZER & DISAMBIGUATOR
# =========================================================================

def _classify_geometric(crop_bin: np.ndarray) -> tuple[dict, int]:
    h, w = crop_bin.shape[:2]
    if h < 5 or w < 3:
        return {d: 0.1 for d in range(10)}, 0

    # Rule for '1': skinny box
    ar = w / float(h)
    if ar < 0.38:
        probs = {d: 0.001 for d in range(10)}
        probs[1] = 0.99
        return probs, 1

    # Rule for '1': left half empty and right half active
    left_density = cv2.countNonZero(crop_bin[:, :int(w * 0.42)]) / float(h * int(w * 0.42) or 1)
    right_density = cv2.countNonZero(crop_bin[:, int(w * 0.58):]) / float(h * (w - int(w * 0.58)) or 1)
    if left_density < 0.08 and right_density > 0.22:
        probs = {d: 0.001 for d in range(10)}
        probs[1] = 0.98
        return probs, 1

    # 7 core sampling zones
    segments_rel = [
        (0.20, 0.00, 0.60, 0.18),    # Top [0]
        (0.00, 0.18, 0.28, 0.24),    # Top-Left [1]
        (0.72, 0.18, 0.28, 0.24),    # Top-Right [2]
        (0.20, 0.40, 0.60, 0.20),    # Middle [3]
        (0.00, 0.58, 0.28, 0.24),    # Bottom-Left [4]
        (0.72, 0.58, 0.28, 0.24),    # Bottom-Right [5]
        (0.20, 0.82, 0.60, 0.18),    # Bottom [6]
    ]

    ratios = []
    for (rx, ry, rw, rh) in segments_rel:
        x1, y1 = int(rx * w), int(ry * h)
        x2, y2 = max(x1 + 1, int((rx + rw) * w)), max(y1 + 1, int((ry + rh) * h))
        roi = crop_bin[y1:y2, x1:x2]
        ratio = cv2.countNonZero(roi) / float(roi.size) if roi.size > 0 else 0.0
        ratios.append(ratio)

    top_r, tl_r, tr_r, mid_r, bl_r, br_r, bot_r = ratios
    max_r = max(ratios) if ratios else 0.0
    thresh = max(0.18, max_r * 0.35)

    is_top = top_r >= thresh
    is_tr  = tr_r >= thresh
    is_br  = br_r >= thresh
    is_bot = bot_r >= thresh
    is_mid = mid_r >= thresh

    # Robust left-side segment detection (relative to right side)
    is_tl  = tl_r >= thresh and (tl_r > 0.40 * tr_r or tr_r < thresh)
    is_bl  = bl_r >= thresh and (bl_r > 0.40 * br_r or br_r < thresh)

    scores = {d: 0.02 for d in range(10)}

    # Explicit 9: Top, TL, TR, Mid, BR active, BL is empty (Bot can be 0 or 1!)
    if is_top and is_tl and is_tr and is_mid and is_br and not is_bl:
        scores[9] = 0.98
    # Explicit 4: Middle active, TR active, BR active, Top empty, Bot empty, BL empty (TL can be 0 or 1!)
    elif not is_top and is_mid and is_tr and is_br and not is_bl and not is_bot:
        scores[4] = 0.98
    # Explicit 3: Top, TR, Mid, BR active, left side empty (Bot can be faint or active!)
    elif is_top and is_tr and is_mid and is_br and not is_tl and not is_bl:
        scores[3] = 0.98
    # Explicit 8: All 7 segments solidly active
    elif is_top and is_tr and is_mid and is_br and is_bot and is_tl and is_bl:
        scores[8] = 0.98
    # Explicit 0: Middle empty, Top, Bot, TL, TR, BL, BR active
    elif not is_mid and is_top and is_bot and is_tl and is_tr and is_bl and is_br:
        scores[0] = 0.98
    # Explicit 7: Top active, TR active, BR active, Middle EMPTY, Bottom empty, Left empty
    elif is_top and is_tr and is_br and not is_mid and not is_bot and not is_bl:
        scores[7] = 0.98
    # Explicit 6: TL, Mid, BL, BR, Bot active, TR empty
    elif is_tl and is_mid and is_bl and is_br and is_bot and not is_tr:
        scores[6] = 0.98
    # Explicit 5: Top, TL, Mid, BR, Bot active, TR empty, BL empty
    elif is_top and is_tl and is_mid and is_br and is_bot and not is_tr and not is_bl:
        scores[5] = 0.98
    # Explicit 2: Top, TR, Mid, BL, Bot active, TL empty, BR empty
    elif is_top and is_tr and is_mid and is_bl and is_bot and not is_tl and not is_br:
        scores[2] = 0.98
    # Explicit 1: Only TR and BR active, Middle EMPTY, Top empty, Bot empty
    elif is_tr and is_br and not is_mid and not is_top and not is_bot and not is_tl and not is_bl:
        scores[1] = 0.98
    else:
        # Distance-based fallback for imperfect/noisy states
        patterns = [
            (0, [1, 1, 1, 0, 1, 1, 1]),
            (1, [0, 0, 1, 0, 0, 1, 0]),
            (2, [1, 0, 1, 1, 1, 0, 1]),
            (3, [1, 0, 1, 1, 0, 1, 1]),
            (4, [0, 1, 1, 1, 0, 1, 0]),
            (4, [0, 0, 1, 1, 0, 1, 0]), # variant 4 without top-left
            (5, [1, 1, 0, 1, 0, 1, 1]),
            (6, [1, 1, 0, 1, 1, 1, 1]),
            (6, [0, 1, 0, 1, 1, 1, 1]),
            (7, [1, 0, 1, 0, 0, 1, 0]),
            (8, [1, 1, 1, 1, 1, 1, 1]),
            (9, [1, 1, 1, 1, 0, 1, 1]),
            (9, [1, 1, 1, 1, 0, 1, 0]),
        ]
        current_pat = [int(is_top), int(is_tl), int(is_tr), int(is_mid), int(is_bl), int(is_br), int(is_bot)]
        for d, pat in patterns:
            dist = sum(1 for a, b in zip(current_pat, pat) if a != b)
            s = max(0.02, 1.0 - dist * 0.22)
            if s > scores[d]:
                scores[d] = s

    total = sum(scores.values()) + 1e-6
    probs = {d: scores[d] / total for d in range(10)}
    best_d = max(probs, key=probs.get)
    return probs, best_d


# =========================================================================
# FUSION LAYER: MULTI-ENGINE WEIGHTED VOTING
# =========================================================================

def recognize_digit_from_crop(digit_crop: np.ndarray) -> tuple[Optional[int], float]:
    h, w = digit_crop.shape[:2]
    if h < 10 or w < 3:
        return None, 0.0

    # Ensure binary mask
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

    # Engine A: Geometric
    p_geo, geo_best = _classify_geometric(bin_crop)

    # Engine B: MLP
    mlp_d, mlp_c, p_mlp = _mlp_classify(bin_crop)

    # Engine C: Template Matching
    p_tmpl = _classify_template(bin_crop)
    tmpl_best = max(p_tmpl, key=p_tmpl.get)

    # Engine D: Structural Analysis
    p_struct = _classify_structural(bin_crop)

    # Fusion weighting
    # If Geometric and Template agree, they form a ground-truth consensus
    final_scores = {}
    if geo_best == tmpl_best:
        for d in range(10):
            final_scores[d] = 0.60 * p_geo[d] + 0.30 * p_tmpl[d] + 0.10 * p_struct[d]
    elif mlp_d is not None and mlp_c >= 0.70 and (mlp_d == geo_best or mlp_d == tmpl_best):
        for d in range(10):
            final_scores[d] = (
                0.40 * p_geo[d] +
                0.30 * p_tmpl[d] +
                0.20 * p_mlp[d] +
                0.10 * p_struct[d]
            )
    else:
        for d in range(10):
            final_scores[d] = (
                0.60 * p_geo[d] +
                0.30 * p_tmpl[d] +
                0.10 * p_struct[d]
            )

    best_digit = max(final_scores, key=final_scores.get)

    # Calibrate confidence based on engine consensus
    if geo_best == tmpl_best:
        confidence = max(0.96, float(final_scores[best_digit]) * 1.5)
    elif mlp_d == best_digit:
        confidence = max(0.92, float(final_scores[best_digit]) * 1.4)
    else:
        confidence = float(final_scores[best_digit]) * 1.2

    confidence = min(0.99, max(0.60, confidence))
    return best_digit, round(confidence, 4)


# =========================================================================
# PREPROCESSING PIPELINE (MULTI-MODE ADAPTIVE)
# =========================================================================

def preprocess_multi_mode_display(bgr_img: np.ndarray, relaxed: bool = False) -> tuple[np.ndarray, str]:
    H, W = bgr_img.shape[:2]
    b, g, r = cv2.split(bgr_img)

    # Auto-detect inverted Red LED (White/light background with Cyan digits)
    cyan_diff = cv2.subtract(cv2.min(g, b), r)
    cyan_count = cv2.countNonZero(cyan_diff > 25)
    if cyan_count > 1500 and float(bgr_img.mean()) > 130:
        bgr_img = 255 - bgr_img
        b, g, r = cv2.split(bgr_img)

    hsv = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2HSV)
    diff = cv2.subtract(r, cv2.max(g, b))
    bright_red_count = cv2.countNonZero(diff > 25)
    mean_brightness = float(bgr_img.mean())

    # Mode A: Red LED (illuminated red digits on dark/ambient background)
    if bright_red_count > 2500 or (bright_red_count > 500 and mean_brightness < 140):
        if not relaxed:
            m1 = cv2.inRange(hsv, np.array([0, 50, 60]), np.array([15, 255, 255]))
            m2 = cv2.inRange(hsv, np.array([160, 50, 60]), np.array([180, 255, 255]))
            mask_hsv = cv2.bitwise_or(m1, m2)
            _, diff_thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)
        else:
            m1 = cv2.inRange(hsv, np.array([0, 30, 45]), np.array([15, 255, 255]))
            m2 = cv2.inRange(hsv, np.array([145, 30, 45]), np.array([180, 255, 255]))
            mask_hsv = cv2.bitwise_or(m1, m2)
            _, diff_thresh = cv2.threshold(diff, 18, 255, cv2.THRESH_BINARY)

        mask = cv2.bitwise_or(mask_hsv, diff_thresh)

        # Clean top/bottom bezel margin rows (top 5% and bottom 5%)
        mask[:int(H * 0.05), :] = 0
        mask[H - int(H * 0.05):, :] = 0

        # Close small gaps in strokes
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        return mask, "RED_LED"

    # Mode B: Amber LED
    amber_loose = cv2.inRange(hsv, np.array([16, 50, 60]), np.array([38, 255, 255]))
    if cv2.countNonZero(amber_loose) > 1000:
        mask = amber_loose
        mask[:int(H * 0.05), :] = 0
        mask[H - int(H * 0.05):, :] = 0
        return mask, "AMBER_LED"

    # Mode C: Dark LCD / Light background
    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    mask[:int(H * 0.06), :] = 0
    mask[H - int(H * 0.06):, :] = 0
    mask[:, :int(W * 0.04)] = 0
    mask[:, W - int(W * 0.04):] = 0
    noise_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, noise_kernel)
    return mask, "LCD_DARK"


# =========================================================================
# 3-STAGE DIGIT SEGMENTATION (VPP VALLEY SPLITTING & INDICATOR FILTER)
# =========================================================================

def _filter_overlapping_boxes(boxes: list[tuple[int, int, int, int]]) -> list[tuple[int, int, int, int]]:
    if len(boxes) <= 1:
        return boxes
    boxes = sorted(boxes, key=lambda b: (b[0], -b[2] * b[3]))
    kept = []
    for b in boxes:
        x1, y1, w1, h1 = b
        overlap = False
        for k in kept:
            x2, y2, w2, h2 = k
            inter_x1 = max(x1, x2)
            inter_x2 = min(x1 + w1, x2 + w2)
            inter_w = max(0, inter_x2 - inter_x1)
            min_w = min(w1, w2)
            if min_w > 0 and (inter_w / float(min_w)) > 0.40:
                overlap = True
                break
        if not overlap:
            kept.append(b)
    kept.sort(key=lambda b: b[0])
    return kept


def _split_merged_digits(crop_mask: np.ndarray, expected_single_w: float) -> list[tuple[int, int]]:
    h, w = crop_mask.shape[:2]
    if w < 40:
        return [(0, w)]

    ratio_w = w / float(expected_single_w or 1.0)
    if ratio_w < 1.4:
        return [(0, w)]

    vpp = np.sum(crop_mask > 0, axis=0).astype(float)
    smooth = np.convolve(vpp, np.ones(9) / 9.0, mode='same')

    # Multi-digit block with 3 or more merged digits (e.g. ratio >= 2.2)
    if ratio_w >= 2.2:
        num_digits = max(3, int(round(ratio_w)))
        segment_w = w / float(num_digits)
        splits = []
        for d in range(1, num_digits):
            center = int(d * segment_w)
            s_start = max(10, center - int(segment_w * 0.35))
            s_end   = min(w - 10, center + int(segment_w * 0.35))
            if s_end > s_start:
                valley = s_start + int(np.argmin(smooth[s_start:s_end]))
                splits.append(valley)
        splits = sorted(list(set(splits)))
        boundaries = [0] + splits + [w]
        return [(boundaries[i], boundaries[i+1]) for i in range(len(boundaries)-1) if boundaries[i+1] - boundaries[i] > 15]

    # Merged 2 digits: recognizer-guided valley candidate testing
    valleys = []
    for x in range(20, w - 20):
        if smooth[x] <= smooth[x-1] and smooth[x] <= smooth[x+1]:
            valleys.append(x)

    best_split = None
    best_score = -1.0
    for vx in valleys:
        c1 = crop_mask[:, :vx]
        c2 = crop_mask[:, vx:]
        d1, conf1 = recognize_digit_from_crop(c1)
        d2, conf2 = recognize_digit_from_crop(c2)
        if d1 is not None and d2 is not None:
            score = conf1 * conf2
            if score > best_score and conf1 >= 0.75 and conf2 >= 0.75:
                best_score = score
                best_split = vx

    if best_split is not None:
        return [(0, best_split), (best_split, w)]

    return [(0, w)]


def segment_display_digits(mask: np.ndarray) -> list[tuple[int, int, int, int]]:
    H, W = mask.shape[:2]
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask)
    min_digit_h = int(H * 0.45)

    initial_boxes = []
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        aspect_ratio = float(w) / h if h > 0 else 0
        # Include normal digits and narrow digit 1
        if (area > 100 and h >= min_digit_h and aspect_ratio <= 1.5) or (w < 45 and h >= min_digit_h and area > 50):
            initial_boxes.append((x, y, w, h))

    if not initial_boxes:
        return []

    initial_boxes.sort(key=lambda b: b[0])

    # Estimate median single digit height and expected width
    non_skinny = [b for b in initial_boxes if (b[2] / float(b[3])) >= 0.35]
    if non_skinny:
        typical_h = np.median([b[3] for b in non_skinny])
    else:
        typical_h = np.median([b[3] for b in initial_boxes])
    expected_single_w = typical_h * 0.58

    split_boxes = []
    for (x, y, w, h) in initial_boxes:
        crop = mask[y:y+h, x:x+w]
        splits = _split_merged_digits(crop, expected_single_w)
        for sx1, sx2 in splits:
            split_boxes.append((x + sx1, y, sx2 - sx1, h))

    # Filter out non-digit status indicator symbols & small noise fragments
    if len(split_boxes) >= 2:
        med_y = np.median([b[1] for b in split_boxes])
        med_h = np.median([b[3] for b in split_boxes])
        filtered = []
        for (x, y, w, h) in split_boxes:
            if (y - med_y) > med_h * 0.40:
                continue
            if h < med_h * 0.65:
                continue
            filtered.append((x, y, w, h))
        if filtered:
            split_boxes = filtered

    split_boxes = _filter_overlapping_boxes(split_boxes)
    split_boxes.sort(key=lambda b: b[0])
    return split_boxes


# =========================================================================
# FIXED-SLOT FALLBACK (GRID-BASED)
# =========================================================================

SEVEN_SEG_MATRIX_ROBUST = {
    (1, 1, 1, 1, 1, 1, 0): "0",
    (0, 1, 1, 0, 0, 0, 0): "1",
    (1, 1, 0, 1, 1, 0, 1): "2",
    (1, 1, 1, 1, 0, 0, 1): "3",
    (0, 1, 1, 0, 0, 1, 1): "4", (0, 1, 1, 0, 0, 0, 1): "4",
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


def decode_fixed_slots_7segment(processed_mask: np.ndarray, num_slots: int = 3) -> tuple[str, float]:
    img_h, img_w = processed_mask.shape[:2]
    contours, _ = cv2.findContours(processed_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        best_cnt = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(best_cnt)
        display_crop = processed_mask[y:y+h, x:x+w] if w > 30 and h > 15 else processed_mask
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

        ratios = [cv2.countNonZero(reg) / float(reg.size) if reg.size > 0 else 0.0 for reg in segments_map]
        max_ratio = max(ratios) if ratios else 0.0
        states = [1 if (r / (max_ratio or 1.0)) >= 0.40 else 0 for r in ratios] if max_ratio >= 0.08 else [0] * 7

        state_t = tuple(states)
        digit_char = SEVEN_SEG_MATRIX_ROBUST.get(state_t, "?")
        if digit_char == "?":
            has_unknown = True
        decoded_digits.append(digit_char)

    if has_unknown or not any(d.isdigit() for d in decoded_digits):
        return "", 0.0

    raw_weight_str = "".join(d for d in decoded_digits if d.isdigit())
    return raw_weight_str, 0.90


def autocorrect_scale_weight(weight_digits: list[str]) -> int:
    raw_str = "".join(weight_digits)
    cleaned_str = re.sub(r"\D", "", raw_str)
    if not cleaned_str:
        return 0

    if len(cleaned_str) > 5:
        cleaned_str = cleaned_str[:5]

    if len(cleaned_str) > 1 and cleaned_str.startswith("0"):
        cleaned_str = cleaned_str.lstrip("0") or "0"

    return int(cleaned_str) if cleaned_str else 0


def decode_base64_image(base64_str: str) -> np.ndarray:
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",", 1)[1]
        img_bytes = base64.b64decode(base64_str)
        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        raise ValueError(f"Failed to decode base64 image: {str(e)}")


# =========================================================================
# MAIN RECOGNITION PIPELINE
# =========================================================================

def process_spectrum_detection(bgr_img: np.ndarray):
    # Pass 1: standard high-confidence mask
    processed_mask, mode_detected = preprocess_multi_mode_display(bgr_img, relaxed=False)
    boxes = segment_display_digits(processed_mask)

    # Pass 2: relaxed threshold if Pass 1 yielded NO digits at all
    if len(boxes) == 0:
        relaxed_mask, _ = preprocess_multi_mode_display(bgr_img, relaxed=True)
        relaxed_boxes = segment_display_digits(relaxed_mask)
        if len(relaxed_boxes) > 0:
            processed_mask = relaxed_mask
            boxes = relaxed_boxes

    detected_digits = []
    confidences = []
    preview_overlay = cv2.cvtColor(processed_mask, cv2.COLOR_GRAY2BGR)

    for (x, y, w, h) in boxes:
        crop = processed_mask[y:y+h, x:x+w]
        digit, conf = recognize_digit_from_crop(crop)
        if digit is not None:
            detected_digits.append(str(digit))
            confidences.append(conf)
            cv2.rectangle(preview_overlay, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cv2.putText(preview_overlay, str(digit), (x, max(20, y - 5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

    _, buffer = cv2.imencode(".png", preview_overlay)
    base64_preview = "data:image/png;base64," + base64.b64encode(buffer).decode("utf-8")

    if detected_digits:
        if len(detected_digits) > 5:
            return {
                "status": "ERROR",
                "weight_detected": 0,
                "confidence": 0.0,
                "spectrum_processed_image": base64_preview,
                "mode_detected": mode_detected,
                "engine_version": "6.0.0 (Error: Too many digits detected)",
                "message": "Invalid reading: over 5 digits detected"
            }
            
        weight_val = autocorrect_scale_weight(detected_digits)
        if weight_val > 0:
            avg_conf = float(np.mean(confidences)) if confidences else 0.0
            status = "SUCCESS" if avg_conf >= 0.75 else "WARNING_LOW_CONFIDENCE"
            return {
                "status": status,
                "weight_detected": weight_val,
                "confidence": round(avg_conf, 4),
                "spectrum_processed_image": base64_preview,
                "mode_detected": mode_detected,
                "engine_version": "6.0.0 (SPECTRUM Multi-Engine Fusion Active)"
            }

    # Fallback to Fixed-Slot Grid Decoder
    fixed_slot_str, fixed_conf = decode_fixed_slots_7segment(processed_mask, num_slots=3)
    if fixed_slot_str and fixed_slot_str.isdigit():
        val = int(fixed_slot_str)
        if val > 0:
            return {
                "status": "SUCCESS",
                "weight_detected": val,
                "confidence": 0.85,
                "spectrum_processed_image": base64_preview,
                "mode_detected": mode_detected,
                "engine_version": "6.0.0 (Fixed-Slot 7-Segment Decoder Fallback)"
            }

    return {
        "status": "WARNING_LOW_CONFIDENCE",
        "weight_detected": 0,
        "confidence": 0.0,
        "spectrum_processed_image": base64_preview,
        "mode_detected": mode_detected,
        "engine_version": "6.0.0",
        "message": "No LED digits detected in image"
    }


# =========================================================================
# FASTAPI APP & ENDPOINTS
# =========================================================================

app = FastAPI(
    title="SPECTRUM Engine 6.0 AI Microservice",
    description="Multi-Engine Fusion (Geometric Heuristic, Template Matching, Structural Skeleton, MLP & NMS Active)",
    version="6.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class DetectRequest(BaseModel):
    image: Optional[str] = None
    images: Optional[list[str]] = None


@app.get("/")
@app.get("/api/spectrum/health")
def health_check():
    return {
        "engine": "SPECTRUM Engine 6.0 AI Microservice",
        "fusion_layer": "ACTIVE (4-Engine Weighted Voting: Geometric + Template + Structural + MLP)",
        "segmentation": "ACTIVE (3-Stage VPP Valley Splitting & Indicator Filter)",
        "status": "ONLINE",
        "version": "6.0.0"
    }


@app.get("/api/spectrum/stats")
def get_stats():
    return get_dataset_statistics()


@app.post("/api/spectrum/detect")
def detect_weight(payload: DetectRequest):
    try:
        if payload.images and len(payload.images) > 0:
            frame_votes = []
            previews = []
            for b64 in payload.images:
                try:
                    img = decode_base64_image(b64)
                    res = process_spectrum_detection(img)
                    w = res.get("weight_detected", 0)
                    c = res.get("confidence", 0.0)
                    if w > 0:
                        frame_votes.append((w, c))
                        if not previews:
                            previews.append(res)
                except Exception:
                    continue

            if frame_votes:
                # Weighted voting: accumulate confidence scores per weight
                vote_weights = {}
                for w, c in frame_votes:
                    vote_weights[w] = vote_weights.get(w, 0.0) + max(0.2, c)
                best_weight = max(vote_weights, key=vote_weights.get)

                total_frames = len(frame_votes)
                agreeing_frames = sum(1 for w, _ in frame_votes if w == best_weight)
                consensus_ratio = agreeing_frames / float(total_frames)

                res = previews[0] if previews else process_spectrum_detection(decode_base64_image(payload.images[0]))
                res["weight_detected"] = best_weight
                res["confidence"] = 1.0 if consensus_ratio >= 0.60 else round(consensus_ratio, 3)
                res["engine_version"] = "6.0.0 (Adaptive 7-Segment & Temporal Consensus)"
                res["message"] = f"Multi-Frame Verified ({agreeing_frames}/{total_frames} frames agreement)"
                return res
            elif payload.image:
                bgr_img = decode_base64_image(payload.image)
                res = process_spectrum_detection(bgr_img)
                if res.get("weight_detected", 0) > 0:
                    return res
                fallback = run_easyocr_fallback(bgr_img)
                return fallback or res
            else:
                first_img = decode_base64_image(payload.images[0])
                fallback = run_easyocr_fallback(first_img)
                return fallback or process_spectrum_detection(first_img)

        elif payload.image:
            bgr_img = decode_base64_image(payload.image)
            res = process_spectrum_detection(bgr_img)
            if res.get("weight_detected", 0) > 0:
                return res
            fallback = run_easyocr_fallback(bgr_img)
            return fallback or res
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
if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8001)
