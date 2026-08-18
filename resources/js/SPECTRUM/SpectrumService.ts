export interface SpectrumResult {
    status: "SUCCESS" | "WARNING_LOW_CONFIDENCE";
    weight_detected: number;
    confidence: number;
    spectrum_processed_image: string;
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
        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || "";
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
            confidence: 0,
            spectrum_processed_image: Array.isArray(base64Image) ? base64Image[0] : base64Image,
            engine_version: "5.1.0 (Adaptive 7-Segment & Temporal Consensus)",
            message: "SPECTRUM Engine microservice unreachable",
        };
    }
}

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
            message: "Failed to connect to SPECTRUM reading system.",
        };
    }
}
