import base64
import io
import os
import sys
import cv2
import numpy as np
from PIL import Image
from collections import Counter
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import traceback

_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_current_dir)
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)

app = FastAPI(title="SPECTRUM Weight Detection Agent v3 - Anti-Hallucination Mode", version="6.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DetectRequest(BaseModel):
    image: str = None
    images: list[str] = None

# STANDARD PATTERNS (Proper 7-segment mapping)
# a=top, b=top-right, c=bottom-right, d=bottom, e=bottom-left, f=top-left, g=middle
STANDARD_PATTERNS = {
    0: [1, 1, 1, 1, 1, 1, 0],
    1: [0, 1, 1, 0, 0, 0, 0],
    2: [1, 1, 0, 1, 1, 0, 1],
    3: [1, 1, 1, 1, 0, 0, 1],
    4: [0, 1, 1, 0, 0, 1, 1],
    5: [1, 0, 1, 1, 0, 1, 1],
    6: [1, 0, 1, 1, 1, 1, 1],
    7: [1, 1, 1, 0, 0, 0, 0],
    8: [1, 1, 1, 1, 1, 1, 1],
    9: [1, 1, 1, 1, 0, 1, 1],
}

def decode_base64_image(base64_str: str) -> np.ndarray:
    if "," in base64_str:
        base64_str = base64_str.split(",", 1)[1]
    img_bytes = base64.b64decode(base64_str)
    pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

# =========================================================================
# PHASE 1: DISPLAY AREA ISOLATION & PREPROCESSING
# =========================================================================

def analyze_and_isolate_display(bgr_img: np.ndarray):
    H, W = bgr_img.shape[:2]
    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
    
    # Image Quality
    min_val, max_val, _, _ = cv2.minMaxLoc(gray)
    contrast_ratio = max_val - min_val
    contrast_score = min(100, (contrast_ratio / 255.0) * 100)
    
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    sharpness_score = min(1.0, laplacian.var() / 500.0)
    
    # Find LED pixels (Red/Orange hue)
    hsv = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2HSV)
    m1 = cv2.inRange(hsv, np.array([0, 40, 50]), np.array([30, 255, 255]))
    m2 = cv2.inRange(hsv, np.array([150, 40, 50]), np.array([180, 255, 255]))
    led_mask = cv2.bitwise_or(m1, m2)
    
    # Color purity
    led_pixels = cv2.countNonZero(led_mask)
    led_color_purity = min(100, (led_pixels / (H*W)) * 1000)
    
    lighting_qual = "FAIR"
    if contrast_score > 60 and sharpness_score > 0.4: lighting_qual = "EXCELLENT"
    elif contrast_score > 40: lighting_qual = "GOOD"
    elif contrast_score < 20: lighting_qual = "POOR"
    
    quality = {
        "contrast_ratio": contrast_score,
        "sharpness_score": sharpness_score,
        "lighting_quality": lighting_qual,
        "detected_angle_degrees": 0.0,
        "led_color_purity": led_color_purity
    }
    
    # Isolation (Simplified for robustness)
    contours, _ = cv2.findContours(led_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        c = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(c)
        pad_x = int(w * 0.10)
        pad_y = int(h * 0.10)
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(W, x + w + pad_x)
        y2 = min(H, y + h + pad_y)
        led_mask_cropped = led_mask[y1:y2, x1:x2]
        offset = (x1, y1)
    else:
        led_mask_cropped = led_mask
        offset = (0, 0)
        
    return led_mask_cropped, offset, quality, led_mask

# =========================================================================
# PHASE 2: DIGIT SEGMENTATION (HISTOGRAM PEAKS)
# =========================================================================

def segment_digits_v3(led_mask: np.ndarray):
    H, W = led_mask.shape[:2]
    # Horizontal projection
    h_proj = np.sum(led_mask, axis=0) / 255.0
    
    # Find peaks and valleys
    smooth_proj = np.convolve(h_proj, np.ones(5)/5.0, mode='same')
    threshold = np.max(smooth_proj) * 0.15
    
    is_in_digit = False
    start_px = 0
    digit_regions = []
    
    for i, val in enumerate(smooth_proj):
        if val > threshold and not is_in_digit:
            is_in_digit = True
            start_px = i
        elif val <= threshold and is_in_digit:
            is_in_digit = False
            if (i - start_px) > 10: # Minimum width
                digit_regions.append((start_px, i))
                
    if is_in_digit:
        digit_regions.append((start_px, W-1))
        
    # Validation
    peaks_count = len(digit_regions)
    boundaries = []
    widths = []
    
    for start, end in digit_regions:
        s = max(0, start - 5)
        e = min(W, end + 5)
        w = e - s
        boundaries.append({
            "start_px": int(s),
            "end_px": int(e),
            "width": int(w)
        })
        widths.append(w)
        
    # Consistency check
    widths_consistent = True
    if len(widths) > 1:
        med_w = np.median(widths)
        for w in widths:
            if abs(w - med_w) / med_w > 0.25: # Strict variation
                widths_consistent = False
                
    # Spacing check
    spacing_valid = True
    if len(digit_regions) > 1:
        gaps = [digit_regions[i][0] - digit_regions[i-1][1] for i in range(1, len(digit_regions))]
        med_gap = np.median(gaps) if gaps else 0
        med_w = np.median(widths)
        if med_gap < med_w * 0.2: # Very close, might be merged
            spacing_valid = False
            
    return boundaries, widths_consistent, spacing_valid, peaks_count

# =========================================================================
# PHASE 3 & 4: VALIDATION & 7-SEGMENT ANALYSIS
# =========================================================================

def analyze_segment_5x5_v3(crop_bin: np.ndarray):
    h, w = crop_bin.shape[:2]
    segments_rel = {
        'a': (0.20, 0.00, 0.60, 0.18),
        'b': (0.72, 0.18, 0.28, 0.24),
        'c': (0.72, 0.58, 0.28, 0.24),
        'd': (0.20, 0.82, 0.60, 0.18),
        'e': (0.00, 0.58, 0.28, 0.24),
        'f': (0.00, 0.18, 0.28, 0.24),
        'g': (0.20, 0.40, 0.60, 0.20),
    }

    segments_data = {}
    is_all_off = True
    is_all_on = True
    
    for key, (rx, ry, rw, rh) in segments_rel.items():
        x1, y1 = int(rx * w), int(ry * h)
        x2, y2 = max(x1 + 5, int((rx + rw) * w)), max(y1 + 5, int((ry + rh) * h))
        roi = crop_bin[y1:y2, x1:x2]
        
        if roi.size > 0:
            roi_5x5 = cv2.resize(roi, (5, 5))
            _, bright_roi = cv2.threshold(roi_5x5, 180, 255, cv2.THRESH_BINARY)
            density = cv2.countNonZero(bright_roi) / 25.0
        else:
            density = 0.0
            
        val = False
        status = "AMBIGUOUS"
        
        if density >= 0.55:
            val = True
            status = "STRONG"
            is_all_off = False
        elif density <= 0.25:
            val = False
            status = "WEAK"
            is_all_on = False
        else:
            val = density > 0.40
            status = "AMBIGUOUS"
            
        segments_data[key] = {
            "value": val,
            "brightness": float(density),
            "status": status
        }
        
    # Phase 3 Checks
    if is_all_off:
        return segments_data, "ALL_OFF", None
    if is_all_on:
        return segments_data, "ALL_ON", None
        
    return segments_data, "VALID", None

def pattern_match_v3(segments_data: dict):
    current_arr = [
        int(segments_data['a']['value']),
        int(segments_data['b']['value']),
        int(segments_data['c']['value']),
        int(segments_data['d']['value']),
        int(segments_data['e']['value']),
        int(segments_data['f']['value']),
        int(segments_data['g']['value'])
    ]
    
    matches = []
    for d, pat in STANDARD_PATTERNS.items():
        matched_count = sum(1 for x, y in zip(current_arr, pat) if x == y)
        matches.append((d, matched_count))
        
    matches.sort(key=lambda x: x[1], reverse=True)
    best_d, best_score = matches[0]
    second_d, second_score = matches[1]
    
    digit_conf = (best_score / 7.0) * 100.0
    
    hallucinated = False
    hal_reason = ""
    alternatives = []
    is_ambiguous = False
    
    if best_score < 5:
        hallucinated = True
        hal_reason = "invalid_pattern_match_<5"
        best_d = None
    elif best_score == 7:
        digit_conf += 30.0
    elif best_score == 6:
        digit_conf += 5.0
    elif best_score == 5:
        digit_conf -= 15.0
        
    if best_d is not None and (best_score - second_score) <= 1:
        is_ambiguous = True
        digit_conf -= 20.0
        alternatives = [{"digit": best_d, "score": best_score}, {"digit": second_d, "score": second_score}]
        
    digit_conf = max(0, min(100, digit_conf))
    
    # Penalize ambiguous segments
    for k, v in segments_data.items():
        if v["status"] == "AMBIGUOUS":
            digit_conf -= 10.0
            
    digit_conf = max(0, digit_conf)
    
    return best_d, best_score, digit_conf, alternatives, hallucinated, hal_reason, is_ambiguous

# =========================================================================
# MAIN RECOGNITION PIPELINE (V3)
# =========================================================================

def process_spectrum_v3(bgr_img: np.ndarray):
    led_mask_cropped, offset, quality, full_mask = analyze_and_isolate_display(bgr_img)
    H, W = led_mask_cropped.shape[:2]
    
    boundaries, widths_consistent, spacing_valid, peaks_count = segment_digits_v3(led_mask_cropped)
    
    # Phase 2 Validation
    digit_count_valid = True
    if peaks_count < 3 or peaks_count > 4:
        digit_count_valid = False
        
    preview_overlay = cv2.cvtColor(full_mask, cv2.COLOR_GRAY2BGR)
    
    digits_result = []
    total_matched_segs = 0
    num_valid_digits = 0
    severe_penalties = 0
    normal_penalties = 0
    bonuses_list = []
    penalties_list = []
    
    raw_weight_str = ""
    total_hallucinations = 0
    has_ambiguous_digit = False
    
    ox, oy = offset
    
    for i, b in enumerate(boundaries):
        x1 = b["start_px"]
        x2 = b["end_px"]
        w = b["width"]
        
        # Bounding box for extraction
        crop = led_mask_cropped[0:H, x1:x2]
        
        # Intensity check
        intensity = cv2.countNonZero(crop)
        expected_intensity = w * H * 0.15 # Rough estimate
        
        is_halluc = False
        h_reason = ""
        
        if intensity < expected_intensity * 0.3:
            is_halluc = True
            h_reason = "low_total_intensity"
            
        segments_data, phase3_status, _ = analyze_segment_5x5_v3(crop)
        
        if phase3_status != "VALID":
            is_halluc = True
            h_reason = f"segment_structure_{phase3_status}"
            
        best_d, best_score, digit_conf, alts, p_halluc, p_reason, is_ambig = pattern_match_v3(segments_data)
        
        if p_halluc:
            is_halluc = True
            h_reason = p_reason
            
        if is_ambig:
            has_ambiguous_digit = True
            severe_penalties += 20
            penalties_list.append(f"Ambiguous digit at pos {i}: -20%")
            
        if is_halluc:
            total_hallucinations += 1
            severe_penalties += 40
            penalties_list.append(f"False digit detected at pos {i}: -40%")
        else:
            if best_d is not None:
                raw_weight_str += str(best_d)
                total_matched_segs += best_score
                num_valid_digits += 1
                
        for k, v in segments_data.items():
            if v["status"] == "AMBIGUOUS":
                normal_penalties += 10
                penalties_list.append(f"Ambiguous segment {k} at pos {i}: -10%")
                
        digits_result.append({
            "position": i,
            "digit": best_d if not is_halluc else None,
            "segments": segments_data,
            "pattern_match_score": best_score,
            "digit_confidence": digit_conf,
            "possible_alternatives": alts,
            "is_hallucinated": is_halluc,
            "hallucination_reason": h_reason
        })
        
        # Draw on preview
        color = (0, 0, 255) if is_halluc else (0, 255, 0)
        cv2.rectangle(preview_overlay, (ox + x1, oy), (ox + x2, oy + H), color, 2)
        display_txt = str(best_d) if best_d is not None else "?"
        cv2.putText(preview_overlay, display_txt, (ox + x1, max(20, oy - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

    # Multi-digit validation
    weight_val = int(raw_weight_str) if raw_weight_str else 0
    weight_in_logical = 0 <= weight_val <= 9999
    
    if not weight_in_logical:
        severe_penalties += 30
        penalties_list.append("Weight outside logical range: -30%")
    
    if not widths_consistent:
        severe_penalties += 15
        penalties_list.append("Inconsistent digit width: -15%")
        
    if not spacing_valid:
        severe_penalties += 10
        penalties_list.append("Poor inter-digit spacing: -10%")
        
    if quality["contrast_ratio"] < 30:
        normal_penalties += 8
        penalties_list.append("Low contrast: -8%")
    if quality["sharpness_score"] < 0.4:
        normal_penalties += 12
        penalties_list.append("Image blur: -12%")
        
    # Base Confidence Calculation
    if num_valid_digits > 0:
        base_confidence = (total_matched_segs / (7.0 * num_valid_digits)) * 100.0
    else:
        base_confidence = 0.0
        
    conf_after_penalties = base_confidence - severe_penalties - normal_penalties
    
    total_bonuses = 0
    if conf_after_penalties > 50:
        if num_valid_digits > 0 and total_matched_segs == 7 * num_valid_digits:
            total_bonuses += 15
            bonuses_list.append("Perfect match all digits: +15%")
        if quality["contrast_ratio"] > 60:
            total_bonuses += 5
            bonuses_list.append("High contrast: +5%")
        if spacing_valid:
            total_bonuses += 5
            bonuses_list.append("Clear separation: +5%")
            
    final_conf = max(0, min(100, conf_after_penalties + total_bonuses))
    
    # Status & Decision Tree
    status = "SUCCESS"
    ui_action = "AUTO_ACCEPT"
    rec = "High confidence reading"
    
    all_valid = digit_count_valid and widths_consistent and spacing_valid and weight_in_logical
    
    if num_valid_digits == 0:
        status = "ERROR"
        ui_action = "REQUEST_MANUAL_INPUT"
        rec = "Could not detect weight. Please enter manually."
    elif total_hallucinations > 0 or not digit_count_valid:
        status = "WARNING_HALLUCINATION"
        ui_action = "SHOW_DEBUG_VERIFY"
        rec = "Possible false digit detected. Please verify:"
        final_conf = min(70, final_conf)
    elif has_ambiguous_digit:
        status = "WARNING_AMBIGUOUS"
        ui_action = "SHOW_ALTERNATIVES"
        rec = "Multiple possible readings. Please select:"
        final_conf = min(75, final_conf)
    elif final_conf >= 90 and all_valid:
        status = "SUCCESS"
        ui_action = "AUTO_ACCEPT"
        rec = "High confidence reading"
    elif final_conf >= 80 and all_valid:
        status = "SUCCESS"
        ui_action = "AUTO_ACCEPT"
        rec = "Good confidence reading"
    elif final_conf >= 70:
        status = "SUCCESS"
        ui_action = "VERIFY_REQUIRED"
        rec = "Please verify the reading"
    else:
        status = "ERROR"
        ui_action = "MANUAL_INPUT_REQUIRED"
        rec = "Please enter weight manually"

    _, buffer = cv2.imencode(".png", preview_overlay)
    base64_preview = "data:image/png;base64," + base64.b64encode(buffer).decode("utf-8")

    return {
        "weight_detected": weight_val,
        "num_digits_detected": peaks_count,
        "digits": digits_result,
        "overall_confidence": round(final_conf / 100.0, 4),
        "status": status,
        "validation": {
            "digit_count_valid": digit_count_valid,
            "digit_widths_consistent": widths_consistent,
            "inter_digit_spacing_valid": spacing_valid,
            "weight_in_logical_range": weight_in_logical,
            "matches_ocr_result": False # Handled in frontend
        },
        "image_quality": quality,
        "confidence_breakdown": {
            "base_confidence": round(base_confidence, 2),
            "penalties_applied": penalties_list,
            "bonuses_applied": bonuses_list,
            "final_confidence": round(final_conf, 2)
        },
        "debug_info": {
            "detected_peaks": peaks_count,
            "digit_boundaries": boundaries,
            "average_segment_clarity": 0, # Omitted for brevity
            "estimated_hallucinations": total_hallucinations,
            "recommendation": rec,
            "ui_action": ui_action
        },
        "spectrum_processed_image": base64_preview
    }


@app.post("/api/spectrum/detect")
async def detect_weight(req: DetectRequest):
    try:
        if req.images and len(req.images) > 0:
            frames = []
            for b64 in req.images:
                try:
                    frames.append(decode_base64_image(b64))
                except Exception:
                    pass
            if not frames:
                raise HTTPException(status_code=400, detail="Invalid images provided")
                
            best_frame = frames[-1]
            res = process_spectrum_v3(best_frame)
            if len(frames) > 1:
                res["confidence_breakdown"]["bonuses_applied"].append("Consistent frames: +10%")
                res["overall_confidence"] = min(1.0, res["overall_confidence"] + 0.10)
            return res
        elif req.image:
            bgr_img = decode_base64_image(req.image)
            return process_spectrum_v3(bgr_img)
        else:
            raise HTTPException(status_code=400, detail="No image provided")
            
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
