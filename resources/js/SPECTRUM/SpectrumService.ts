import { getCsrfToken } from "../Utils/csrf";

export interface SpectrumResult {
    status: "SUCCESS" | "WARNING_AMBIGUOUS" | "WARNING_HALLUCINATION" | "ERROR" | "WARNING_LOW_CONFIDENCE" | "WARNING_ANOMALY_DETECTED";
    weight_detected: number;
    num_digits_detected: number;
    overall_confidence: number;
    spectrum_processed_image: string;
    
    digits?: Array<{
        position: number;
        digit: number | null;
        digit_confidence: number;
        is_hallucinated: boolean;
        hallucination_reason?: string;
        possible_alternatives?: Array<{digit: number, score: number}>;
        anomaly_flags?: string[];
        pattern_match_score?: number;
        pattern_match_distance?: number;
        segments: Record<string, {
            value: boolean;
            brightness: number;
            status: "STRONG" | "WEAK" | "AMBIGUOUS";
            confidence?: number;
        }>;
        breakdown?: any;
    }>;
    
    validation?: {
        digit_count_valid: boolean;
        digit_widths_consistent: boolean;
        inter_digit_spacing_valid: boolean;
        weight_in_logical_range: boolean;
        matches_ocr_result: boolean;
    };
    
    image_quality?: {
        contrast_ratio: number;
        sharpness_score: number;
        lighting_quality: string;
        estimated_angle_degrees?: number;
        detected_angle_degrees?: number;
        led_color_purity?: number;
        lighting_uniformity?: number;
    };
    
    confidence_breakdown?: {
        base_confidence: number;
        bonuses_applied: string[];
        penalties_applied: string[];
        final_confidence: number;
    };
    
    debug_info?: {
        detected_peaks?: number;
        digit_boundaries?: Array<{start_px: number, end_px: number, width: number}>;
        total_digits_detected?: number;
        average_segment_clarity: number;
        lighting_quality?: string;
        estimated_hallucinations?: number;
        detected_anomalies?: string[];
        recommendation: string;
        ui_action?: "AUTO_ACCEPT" | "VERIFY_MANUAL" | "RETRY_CAMERA" | "MANUAL_INPUT" | "SHOW_DEBUG_VERIFY" | "SHOW_ALTERNATIVES" | "VERIFY_REQUIRED" | "MANUAL_INPUT_REQUIRED" | "REQUEST_MANUAL_INPUT";
    };
    
    engine_version?: string;
    message?: string;
}

export interface SpectrumLogPayload {
    image_base64?: string;
    spectrum_processed_image?: string;
    ocr_legacy_result?: string;
    ocr_legacy_confidence?: number;
    spectrum_result?: string;
    spectrum_confidence?: number;
    actual_manual_input?: number;
    selected_source?: "ocr" | "spectrum" | "manual";
}

export async function detectSpectrumWeight(base64Image: string | string[]): Promise<SpectrumResult> {
    try {
        const csrfToken = getCsrfToken();
        const payload = Array.isArray(base64Image) ? { images: base64Image } : { image: base64Image };

        const response = await fetch("/api/spectrum/detect", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-CSRF-TOKEN": csrfToken,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`SPECTRUM API returned HTTP ${response.status}`);
        }

        const data: SpectrumResult = await response.json();
        return data;
    } catch (err) {
        console.error("[SPECTRUM Service] Detection failed:", err);
        return {
            status: "WARNING_LOW_CONFIDENCE",
            weight_detected: 0,
            num_digits_detected: 0,
            overall_confidence: 0,
            spectrum_processed_image: Array.isArray(base64Image) ? base64Image[0] : base64Image,
            engine_version: "6.0.0 (Anti-Hallucination Mode)",
            message: "SPECTRUM Engine microservice unreachable",
        };
    }
}

export async function logSpectrumTest(payload: SpectrumLogPayload): Promise<{ status: string; message: string }> {
    try {
        const csrfToken = getCsrfToken();

        const res = await fetch("/api/spectrum/log", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-CSRF-TOKEN": csrfToken,
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        return data;
    } catch (err) {
        console.warn("[SPECTRUM Service] Test log skipped:", err);
        return {
            status: "error",
            message: "Log active learning skipped",
        };
    }
}

export async function retrainSpectrumEngine(): Promise<{ status: string; samples_processed?: number; message?: string; accuracy_gain?: string }> {
    try {
        const csrfToken = getCsrfToken();

        const response = await fetch("/api/spectrum/retrain", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-CSRF-TOKEN": csrfToken,
            },
        });

        if (!response.ok) {
            throw new Error(`Retrain API returned HTTP ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (err) {
        console.error("[SPECTRUM Service] Retrain failed:", err);
        return {
            status: "ERROR",
            message: "Failed to connect to SPECTRUM reading system.",
        };
    }
}
