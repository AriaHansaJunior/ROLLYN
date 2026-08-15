/**
 * ============================================================
 * OCR/SpectrumService.ts
 * ============================================================
 * Service helper to communicate with SPECTRUM Engine AI microservice via Laravel.
 */

export interface SpectrumResult {
    status: "SUCCESS" | "WARNING_LOW_CONFIDENCE";
    weight_detected: number;
    confidence: number;
    spectrum_processed_image: string;
    message?: string;
}

export interface SpectrumLogPayload {
    image_base64?: string;
    ocr_legacy_result?: string;
    ocr_legacy_confidence?: number;
    spectrum_result?: string;
    spectrum_confidence?: number;
    actual_manual_input?: number;
    selected_source?: "ocr" | "spectrum" | "manual";
}

/**
 * Sends a captured frame (base64 image) to SPECTRUM AI Engine endpoint.
 */
export async function detectSpectrumWeight(base64Image: string): Promise<SpectrumResult> {
    try {
        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || "";

        const response = await fetch("/api/spectrum/detect", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-CSRF-TOKEN": csrfToken,
            },
            body: JSON.stringify({ image: base64Image }),
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
            confidence: 0,
            spectrum_processed_image: base64Image,
            message: "SPECTRUM Engine microservice unreachable",
        };
    }
}

/**
 * Logs test result comparison & saves frame image + CSV label to Active Learning dataset.
 */
export async function logSpectrumTest(payload: SpectrumLogPayload): Promise<{ status: string; message: string }> {
    try {
        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || "";

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

/**
 * Triggers local Auto-Teaching / Dataset Re-training.
 */
export async function retrainSpectrumEngine(): Promise<{ status: string; samples_processed?: number; message?: string; accuracy_gain?: string }> {
    try {
        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || "";

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
            message: "Failed to connect to SPECTRUM AI re-training endpoint.",
        };
    }
}
