import React from "react";

export interface DatasetStats {
    total_samples: number;
    corrections_count: number;
    last_trained: string;
    recent_entries: Array<{
        filename: string;
        correct_weight: string;
        spectrum_predicted_weight: string;
        is_corrected: string | boolean;
    }>;
}

export interface TrainingResult {
    status: string;
    samples_processed?: number;
    corrections_learned?: number;
    accuracy_gain?: string;
    val_accuracy?: string;
    crops_saved?: number;
    epochs?: number;
    model_version?: string;
    message?: string;
    phase?: string;
    progress_pct?: number;
}

export type FrameSizeMode = "small" | "medium" | "large" | "full";

export interface RoiConfig {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function strToBool(val: string | boolean): boolean {
    if (typeof val === "boolean") return val;
    return String(val).toLowerCase() === "true";
}
