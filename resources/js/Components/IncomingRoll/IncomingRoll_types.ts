import React from "react";

export const SCALE_ROI = { x: 0, y: 0, width: 1, height: 1 };

export const STEPS = [
    "Scanner & OCR Detection",
    "Fill Form Data",
    "Preview Data",
    "Print Label",
];

export interface WeightState {
    value: number;
    display: string;
    source: "ocr" | "spectrum" | "manual" | "none";
}

export interface JopOption {
    id: number | string;
    jop: string;
    spk?: string;
    po?: string;
    noted_order?: string;
    grade?: { grade: string } | string;
    gsm?: { gsm: number } | number | string;
    customer?: { customer: string } | string;
    jumboRolls?: any[];
    jumbo_rolls?: any[];
    rollsWidth?: { width: number } | number;
    rolls_width?: { width: number } | number;
    width?: { width: number } | number;
    plybond?: { plybonds: number } | number;
    thickness?: { thickness: number } | number;
    core?: { core: number } | number;
    weight?: number | string;
    quantity?: number | string;
    rolls?: any[];
    tph?: number | string;
    production_estimation?: {
        is_completed?: boolean;
        target_tonnage?: string | number;
        actual_tonnage?: string | number;
        remaining_tonnage?: string | number;
        tph?: string | number;
        estimated_duration_formatted?: string;
        estimated_finish_time?: string;
    };
}

export interface IncomingRollFormState {
    jop: string;
    jumboRoll: string;
    jumboRollId: number | null | string;
    grade: string;
    gsm: string;
    visual: string;
    status: string;
    rollNumber: string;
    formNumber: string;
    plybond: string;
    diameter: string;
    width: string;
    thickness: string;
    bulk: string;
    core: string;
    exMaterial: string;
    cobb: string;
    shift: string;
    entry_date: string;
    pic: string;
}

export function calculateNextRollNumber(lastRoll: string | null | undefined): string {
    if (!lastRoll || !String(lastRoll).trim()) return "";
    const trimmed = String(lastRoll).trim();
    const match = trimmed.match(/^(.*?)(\d+)$/);
    if (!match) return "";
    const prefix = match[1];
    const digits = match[2];
    try {
        const nextBigInt = BigInt(digits) + 1n;
        let nextStr = nextBigInt.toString();
        if (
            digits.length > 1 &&
            digits.startsWith("0") &&
            nextStr.length < digits.length
        ) {
            nextStr = nextStr.padStart(digits.length, "0");
        }
        return `${prefix}${nextStr}`;
    } catch {
        const nextNum = parseInt(digits, 10) + 1;
        return `${prefix}${nextNum}`;
    }
}

export function sanitizeNumeric(val: string, allowDecimal = true): string {
    if (!val) return "";
    if (!allowDecimal) {
        return val.replace(/[^0-9]/g, "");
    }
    // Remove any character that is not a digit, dot, or comma
    let cleaned = val.replace(/[^0-9.,]/g, "");
    // Keep at most one decimal separator
    const firstSep = cleaned.match(/[.,]/);
    if (firstSep) {
        const sep = firstSep[0];
        const parts = cleaned.split(/[.,]/);
        cleaned = parts[0] + sep + parts.slice(1).join("");
    }
    return cleaned;
}

export function handleNumberKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    allowDecimal = true
) {
    // Allow control and navigation keys
    if (
        [
            "Backspace",
            "Delete",
            "Tab",
            "Escape",
            "Enter",
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "Home",
            "End",
        ].includes(e.key) ||
        e.ctrlKey ||
        e.metaKey
    ) {
        return;
    }

    // Allow a single decimal point or comma if decimal is enabled
    if (allowDecimal && (e.key === "." || e.key === ",")) {
        const val = e.currentTarget.value;
        if (val.includes(".") || val.includes(",")) {
            e.preventDefault();
        }
        return;
    }

    // Prevent any key that is not 0-9
    if (!/^[0-9]$/.test(e.key)) {
        e.preventDefault();
    }
}
