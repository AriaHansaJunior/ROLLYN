import os
import sys
import csv
import cv2
import numpy as np

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.abspath('.'))

def create_7seg_templates(w=32, h=48):
    """Generates standard synthetic 7-segment binary templates for digits 0-9."""
    templates = {}
    
    # segment layout:
    # a: top, b: top-right, c: bottom-right, d: bottom, e: bottom-left, f: top-left, g: middle
    digit_segs_variants = {
        0: [['a', 'b', 'c', 'd', 'e', 'f']],
        1: [['b', 'c']],
        2: [['a', 'b', 'g', 'e', 'd']],
        3: [['a', 'b', 'g', 'c', 'd']],
        4: [['f', 'g', 'b', 'c']],
        5: [['a', 'f', 'g', 'c', 'd']],
        6: [['a', 'f', 'g', 'e', 'c', 'd'], ['f', 'g', 'e', 'c', 'd']], # with & without top bar
        7: [['a', 'b', 'c'], ['a', 'b', 'c', 'f']],
        8: [['a', 'b', 'c', 'd', 'e', 'f', 'g']],
        9: [['a', 'b', 'c', 'f', 'g'], ['a', 'b', 'c', 'd', 'f', 'g']], # without & with bottom bar
    }
    
    t = max(2, int(w * 0.12)) # stroke thickness
    
    for digit, variants in digit_segs_variants.items():
        templates[digit] = []
        for segs in variants:
            img = np.zeros((h, w), dtype=np.uint8)
            
            # special compact template for digit 1:
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
            
            if 'a' in segs: # top
                img[y_top-t//2:y_top+t//2+1, x_left:x_right] = 255
            if 'd' in segs: # bottom
                img[y_bot-t//2:y_bot+t//2+1, x_left:x_right] = 255
            if 'g' in segs: # middle
                img[y_mid-t//2:y_mid+t//2+1, x_left:x_right] = 255
            if 'f' in segs: # top-left
                img[y_top:y_mid, x_left-t//2:x_left+t//2+1] = 255
            if 'e' in segs: # bottom-left
                img[y_mid:y_bot, x_left-t//2:x_left+t//2+1] = 255
            if 'b' in segs: # top-right
                img[y_top:y_mid, x_right-t//2:x_right+t//2+1] = 255
            if 'c' in segs: # bottom-right
                img[y_mid:y_bot, x_right-t//2:x_right+t//2+1] = 255
                
            templates[digit].append(img)
        
    return templates

TEMPLATES = create_7seg_templates()

def classify_template(crop_bin):
    """Template matching using normalized correlation against all variants."""
    h, w = crop_bin.shape[:2]
    if h < 5 or w < 3:
        return {d: 0.1 for d in range(10)}
        
    resized = cv2.resize(crop_bin, (32, 48))
    scores = {}
    for d, tmpl_list in TEMPLATES.items():
        best_s = 0.0
        for tmpl in tmpl_list:
            res = cv2.matchTemplate(resized, tmpl, cv2.TM_CCOEFF_NORMED)
            score = max(0.0, float(res[0, 0]))
            if score > best_s:
                best_s = score
        scores[d] = best_s
        
    total = sum(scores.values()) + 1e-6
    probs = {d: scores[d] / total for d in range(10)}
    return probs

def classify_geometric(crop_bin):
    """Enhanced 7-segment geometric analysis with strict disambiguation."""
    h, w = crop_bin.shape[:2]
    if h < 5 or w < 3:
        return {d: 0.1 for d in range(10)}, None
        
    # Check aspect ratio for digit 1
    ar = w / float(h)
    if ar < 0.38:
        probs = {d: 0.001 for d in range(10)}
        probs[1] = 0.99
        return probs, 1
        
    # Check left vs right density for digit 1
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

    # Robust left-side segment detection (relative to right)
    is_tl  = tl_r >= thresh and (tl_r > 0.40 * tr_r or tr_r < thresh)
    is_bl  = bl_r >= thresh and (bl_r > 0.40 * br_r or br_r < thresh)

    scores = {d: 0.02 for d in range(10)}

    # Explicit 9: Top, TL, TR, Mid, BR active, BL is empty (Bot can be 0 or 1!)
    if is_top and is_tl and is_tr and is_mid and is_br and not is_bl:
        scores[9] = 0.98
    # Explicit 4: Top empty, TL active, TR active, Mid active, BR active, BL empty, Bot empty
    elif not is_top and is_tl and is_tr and is_mid and is_br and not is_bl and not is_bot:
        scores[4] = 0.98
    # Explicit 3 vs 8: Top, TR, Mid, BR, Bot active
    elif is_top and is_tr and is_mid and is_br and is_bot:
        if not is_tl and not is_bl:
            scores[3] = 0.98
        elif is_tl and is_bl:
            scores[8] = 0.98
        elif not is_tl and is_bl:
            scores[2] = 0.85
        elif is_tl and not is_bl:
            scores[9] = 0.95
    # Explicit 0: Middle empty, Top, Bot, TL, TR, BL, BR active
    elif not is_mid and is_top and is_bot and is_tl and is_tr and is_bl and is_br:
        scores[0] = 0.98
    # Explicit 7: Top active, TR active, BR active, Middle empty, Bottom empty, Left empty
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
    # Explicit 1: Only TR and BR active
    elif is_tr and is_br and not is_top and not is_mid and not is_bot and not is_tl and not is_bl:
        scores[1] = 0.98
    else:
        # Distance-based matching against ideal patterns (supporting both 9 and 6 variants)
        patterns = [
            (0, [1, 1, 1, 0, 1, 1, 1]),
            (1, [0, 0, 1, 0, 0, 1, 0]),
            (2, [1, 0, 1, 1, 1, 0, 1]),
            (3, [1, 0, 1, 1, 0, 1, 1]),
            (4, [0, 1, 1, 1, 0, 1, 0]),
            (5, [1, 1, 0, 1, 0, 1, 1]),
            (6, [1, 1, 0, 1, 1, 1, 1]),
            (6, [0, 1, 0, 1, 1, 1, 1]), # variant 6
            (7, [1, 0, 1, 0, 0, 1, 0]),
            (8, [1, 1, 1, 1, 1, 1, 1]),
            (9, [1, 1, 1, 1, 0, 1, 1]),
            (9, [1, 1, 1, 1, 0, 1, 0]), # variant 9 (no bottom)
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

def classify_structural(crop_bin):
    """Structural skeleton & topological analysis."""
    h, w = crop_bin.shape[:2]
    if h < 8 or w < 4:
        return {d: 0.1 for d in range(10)}

    # Thinning / skeletonization
    skeleton = np.zeros_like(crop_bin)
    eroded = crop_bin.copy()
    kernel = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
    for _ in range(15):
        temp = cv2.morphologyEx(eroded, cv2.MORPH_OPEN, kernel)
        temp = cv2.subtract(eroded, temp)
        skeleton = cv2.bitwise_or(skeleton, temp)
        eroded = cv2.erode(eroded, kernel)
        if cv2.countNonZero(eroded) == 0:
            break

    # Count internal holes (Euler characteristic via hierarchy)
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

def segment_display_digits(mask):
    """
    3-Stage Segmentation:
    1. Removes edge margin noise
    2. Connected Components
    3. Splits merged multi-digit boxes using Vertical Projection Profile (VPP)
    """
    H, W = mask.shape[:2]
    clean_mask = mask.copy()
    
    # Margin cleanup
    top_m = int(H * 0.05)
    bot_m = int(H * 0.05)
    clean_mask[:top_m, :] = 0
    clean_mask[H - bot_m:, :] = 0
    
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(clean_mask)
    min_digit_h = int(H * 0.32)
    
    initial_boxes = []
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        # Include digit 1 (can have smaller area)
        if (area > 120 and h >= min_digit_h) or (w < 40 and h >= min_digit_h and area > 60):
            initial_boxes.append((x, y, w, h))
            
    if not initial_boxes:
        return []
        
    initial_boxes.sort(key=lambda b: b[0])
    
    # Estimate median single digit height and width (ignoring very skinny boxes like '1')
    non_skinny = [b for b in initial_boxes if (b[2] / float(b[3])) >= 0.35]
    if non_skinny:
        typical_h = np.median([b[3] for b in non_skinny])
        expected_single_w = typical_h * 0.58
    else:
        typical_h = np.median([b[3] for b in initial_boxes])
        expected_single_w = typical_h * 0.58
    
    digit_boxes = []
    for (x, y, w, h) in initial_boxes:
        ratio_w = w / float(expected_single_w)
        if ratio_w >= 1.45: # multi-digit merged box!
            num_digits = max(2, int(round(ratio_w)))
            crop = clean_mask[y:y+h, x:x+w]
            col_sum = np.sum(crop > 0, axis=0).astype(float)
            smooth = np.convolve(col_sum, np.ones(9)/9.0, mode='same')
            
            splits = []
            segment_w = w / float(num_digits)
            for d in range(1, num_digits):
                center = int(d * segment_w)
                search_start = max(0, center - int(segment_w * 0.30))
                search_end = min(w - 1, center + int(segment_w * 0.30))
                if search_end > search_start:
                    valley = search_start + int(np.argmin(smooth[search_start:search_end]))
                    splits.append(valley)
                    
            splits = sorted(list(set(splits)))
            boundaries = [0] + splits + [w]
            for d in range(len(boundaries) - 1):
                bx1 = boundaries[d]
                bx2 = boundaries[d + 1]
                if bx2 - bx1 > 5:
                    digit_boxes.append((x + bx1, y, bx2 - bx1, h))
        else:
            digit_boxes.append((x, y, w, h))
            
    digit_boxes.sort(key=lambda b: b[0])
    return digit_boxes
