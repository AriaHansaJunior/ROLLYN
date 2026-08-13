/**
 * ============================================================
 * OCR/WeightDetectionEngine.tsx
 * ============================================================
 * Main orchestrating React component for weight OCR detection.
 *
 * RESPONSIBILITIES:
 *  1. Camera lifecycle  — starts on mount, stops on unmount.
 *  2. Custom permission modal — shown before getUserMedia().
 *  3. Live video preview — continuous; OCR is idle.
 *  4. "Take Photo" — single-frame capture → preprocessing → OCR.
 *  5. Result / error display — weight prominently displayed.
 *  6. Editable weight — administrator can correct OCR result.
 *  7. Callback to parent — onWeightConfirmed(weight: number).
 *
 * PORTABILITY:
 *   Zero dependency on IncomingRoll business logic.
 *   Parent only needs to:
 *     <WeightDetectionEngine onWeightConfirmed={(w) => setWeight(w)} />
 * ============================================================
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Camera,
    CheckCircle,
    AlertCircle,
    Loader,
    RefreshCw,
    Edit3,
} from "lucide-react";

import {
    preprocessImage,
    analyseImageQuality,
    DEFAULT_ROI,
    type ROI,
} from "./ImageProcessor";
import {
    initOCRWorker,
    recogniseWeight,
    terminateOCRWorker,
    calibrateScaleFont,
    type OcrResult,
    type OcrError,
} from "./OCRService";
import { SystemUI } from "@/Utils/SystemUI";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EngineState =
    | "permission_modal" // Showing custom permission explanation modal
    | "requesting" // Awaiting navigator.mediaDevices.getUserMedia()
    | "camera_active" // Camera live, OCR idle
    | "processing" // OCR in progress
    | "success" // OCR succeeded, showing result
    | "error" // OCR failed, showing diagnostic
    | "camera_denied"; // Camera permission was denied

interface WeightDetectionEngineProps {
    /**
     * Called when the administrator confirms the weight (via "Continue" button).
     * @param weight        - The final numeric weight value (integer or decimal)
     * @param weightDisplay - Formatted display string e.g. "1,900"
     * @param source        - 'ocr' if from detection, 'manual' if administrator edited it
     */
    onWeightConfirmed: (
        weight: number,
        weightDisplay: string,
        source: "ocr" | "manual",
    ) => void;

    /**
     * Region of Interest for OCR crop (fractional, 0–1).
     * Default: full frame.  Narrow this once the camera is physically mounted.
     *
     * Example for a display in the centre third of the frame:
     *   roi={{ x: 0.1, y: 0.25, width: 0.8, height: 0.5 }}
     */
    roi?: ROI;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WeightDetectionEngine({
    onWeightConfirmed,
    roi = DEFAULT_ROI,
}: WeightDetectionEngineProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [engineState, setEngineState] =
        useState<EngineState>("permission_modal");
    const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
    const [ocrError, setOcrError] = useState<OcrError | null>(null);

    // Editable weight — initialised from OCR result, administrator may change it
    const [editedWeight, setEditedWeight] = useState<string>("");
    const [isManuallyEdited, setIsManuallyEdited] = useState(false);

    // Pre-init OCR worker on mount (background, so first capture is fast)
    useEffect(() => {
        initOCRWorker();

        // Trigger permission modal on first load if needed
        if (engineState === "permission_modal") {
            SystemUI.confirm({
                title: "Camera Access Required",
                message:
                    "Rollyn needs camera access to read the weighing scale display automatically. After clicking Allow, your browser will ask for permission. No images are sent to any external server.",
                confirmText: "Allow Camera Access",
                cancelText: "Cancel",
                onConfirm: (confirmed) => {
                    if (confirmed) startCamera();
                },
                onCancel: () => setEngineState("camera_denied"),
            });
        }
    }, []);

    // Stop camera and terminate worker on unmount (page leave)
    useEffect(() => {
        return () => {
            stopCamera();
            terminateOCRWorker();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---------------------------------------------------------------------------
    // Camera management
    // ---------------------------------------------------------------------------

    function stopCamera() {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }

    const startCamera = useCallback(async () => {
        setEngineState("requesting");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment", // prefer rear camera on mobile
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setEngineState("camera_active");
            SystemUI.toast({
                message:
                    "Camera active. Point at the display to capture weight.",
                type: "info",
                duration: 4000,
            });
        } catch (err) {
            console.error("[OCR] Camera access denied:", err);
            setEngineState("camera_denied");
            SystemUI.alert({
                title: "Camera Access Denied",
                message:
                    "Please allow camera access in your browser settings to use this feature.",
            });
        }
    }, []);

    // ---------------------------------------------------------------------------
    // Take Photo — single frame capture + preprocessing + OCR
    // ---------------------------------------------------------------------------

    const latestVariantsRef = useRef<any[]>([]);

    const takePhoto = useCallback(async () => {
        const video = videoRef.current;
        if (!video || !streamRef.current) return;

        setEngineState("processing");
        setOcrResult(null);
        setOcrError(null);

        try {
            // 1. Preprocess: capture frame, crop ROI, produce 6 variants
            const { variants, rawCanvas } = await preprocessImage(video, roi);
            latestVariantsRef.current = variants;

            // 2. Analyse image quality for diagnostic generation
            const quality = analyseImageQuality(rawCanvas);

            // 3. Multi-pass OCR
            const outcome = await recogniseWeight(variants, quality);

            if ("result" in outcome) {
                setOcrResult(outcome.result);
                setEditedWeight(String(outcome.result.weight));
                setIsManuallyEdited(false);
                setEngineState("success");
                SystemUI.toast({
                    message: "Weight detected successfully!",
                    type: "success",
                });
            } else {
                setOcrError(outcome.error);
                setEngineState("error");
                SystemUI.alert({
                    title: outcome.error.title,
                    message: outcome.error.message,
                });
            }
        } catch (err) {
            console.error("[OCR] Unexpected error during recognition:", err);
            const errorTitle = "Processing Error";
            const errorMessage =
                "An unexpected error occurred while processing the image. Please try again.";
            setOcrError({
                title: errorTitle,
                message: errorMessage,
            });
            setEngineState("error");
            SystemUI.alert({ title: errorTitle, message: errorMessage });
        }
    }, [roi]);

    // ---------------------------------------------------------------------------
    // Retry — go back to camera_active without reloading page
    // ---------------------------------------------------------------------------

    function retryCapture() {
        setOcrResult(null);
        setOcrError(null);
        setEditedWeight("");
        setIsManuallyEdited(false);
        setEngineState("camera_active");
    }

    // ---------------------------------------------------------------------------
    // Confirm weight
    // ---------------------------------------------------------------------------

    function confirmWeight() {
        const numericWeight = parseFloat(editedWeight.replace(/,/g, ""));
        if (isNaN(numericWeight) || numericWeight <= 0) return;

        // Automatically calibrate digit templates for user's scale font
        const digitalVariant = latestVariantsRef.current.find(
            (v) => v.digital && v.canvas,
        );
        if (digitalVariant && digitalVariant.canvas) {
            try {
                calibrateScaleFont(
                    digitalVariant.canvas,
                    String(numericWeight),
                );
            } catch (err) {
                console.warn("[OCR] Calibration on confirm skipped:", err);
            }
        }

        const display = numericWeight.toLocaleString("en-US", {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0,
        });

        onWeightConfirmed(
            numericWeight,
            display,
            isManuallyEdited ? "manual" : "ocr",
        );
    }

    // ---------------------------------------------------------------------------
    // Render helpers
    // ---------------------------------------------------------------------------

    const isProcessing = engineState === "processing";
    const showConfirmButton = engineState === "success";

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                maxWidth: 900,
            }}
            className="max-[679px]:grid-cols-1!"
        >
            {/* ════ LEFT PANEL: Camera Preview ════ */}
            <div className="card" style={{ padding: 16 }}>
                <h3 className="section-title" style={{ marginBottom: 12 }}>
                    Camera Preview
                </h3>

                {/* Video container */}
                <div
                    style={{
                        background: "#0f1923",
                        borderRadius: 8,
                        height: 240,
                        position: "relative",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {/* Live video — always rendered but hidden when camera not active */}
                    <video
                        ref={videoRef}
                        id="ocr-camera-feed"
                        playsInline
                        muted
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display:
                                engineState === "camera_active" ||
                                engineState === "processing" ||
                                engineState === "success" ||
                                engineState === "error"
                                    ? "block"
                                    : "none",
                        }}
                    />

                    {/* ROI overlay — shows the expected capture region */}
                    {engineState === "camera_active" && (
                        <div
                            style={{
                                position: "absolute",
                                left: `${roi.x * 100}%`,
                                top: `${roi.y * 100}%`,
                                width: `${roi.width * 100}%`,
                                height: `${roi.height * 100}%`,
                                border: "2px solid rgba(92, 184, 92, 0.7)",
                                borderRadius: 4,
                                boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)",
                                pointerEvents: "none",
                            }}
                        >
                            <div
                                style={{
                                    position: "absolute",
                                    top: -22,
                                    left: 0,
                                    fontSize: 10,
                                    color: "rgba(92, 184, 92, 0.9)",
                                    background: "rgba(0,0,0,0.5)",
                                    padding: "2px 6px",
                                    borderRadius: 3,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                Detection area
                            </div>
                        </div>
                    )}

                    {/* Processing overlay */}
                    {isProcessing && (
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                background: "rgba(0,0,0,0.5)",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 10,
                            }}
                        >
                            <Loader
                                size={28}
                                style={{
                                    color: "#5CB85C",
                                    animation: "spin 1s linear infinite",
                                }}
                            />
                            <span
                                style={{
                                    color: "#fff",
                                    fontSize: 13,
                                    fontWeight: 500,
                                }}
                            >
                                Processing image…
                            </span>
                        </div>
                    )}

                    {/* States without active video */}
                    {(engineState === "permission_modal" ||
                        engineState === "requesting") && (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 10,
                            }}
                        >
                            {engineState === "requesting" ? (
                                <Loader
                                    size={32}
                                    style={{
                                        color: "rgba(255,255,255,0.5)",
                                        animation: "spin 1s linear infinite",
                                    }}
                                />
                            ) : (
                                <Camera
                                    size={40}
                                    style={{ color: "rgba(255,255,255,0.3)" }}
                                />
                            )}
                            <span
                                style={{
                                    color: "rgba(255,255,255,0.5)",
                                    fontSize: 13,
                                }}
                            >
                                {engineState === "requesting"
                                    ? "Requesting camera access…"
                                    : "Camera permission pending"}
                            </span>
                        </div>
                    )}

                    {engineState === "camera_denied" && (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 10,
                                padding: 20,
                                textAlign: "center",
                            }}
                        >
                            <AlertCircle
                                size={36}
                                style={{ color: "#e74c3c" }}
                            />
                            <span
                                style={{
                                    color: "#e74c3c",
                                    fontSize: 13,
                                    fontWeight: 600,
                                }}
                            >
                                Camera access denied
                            </span>
                            <span
                                style={{
                                    color: "rgba(255,255,255,0.5)",
                                    fontSize: 12,
                                }}
                            >
                                Allow camera access in browser settings, then
                                reload the page.
                            </span>
                        </div>
                    )}
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {/* Take Photo button */}
                    {(engineState === "camera_active" ||
                        engineState === "processing" ||
                        engineState === "success" ||
                        engineState === "error") && (
                        <button
                            id="ocr-take-photo-btn"
                            className="btn btn-primary"
                            onClick={takePhoto}
                            disabled={isProcessing}
                            style={{ flex: 1, justifyContent: "center" }}
                        >
                            <Camera size={13} />
                            {isProcessing ? "Processing…" : "Take Photo"}
                        </button>
                    )}

                    {/* Retry button (shown after success/error too) */}
                    {(engineState === "success" || engineState === "error") && (
                        <button
                            id="ocr-retry-btn"
                            className="btn btn-secondary btn-sm"
                            onClick={retryCapture}
                            title="Take another photo"
                        >
                            <RefreshCw size={13} />
                        </button>
                    )}

                    {/* Camera access denied — show grant-access button */}
                    {engineState === "camera_denied" && (
                        <button
                            id="ocr-grant-access-btn"
                            className="btn btn-primary"
                            onClick={() => {
                                setEngineState("permission_modal");
                                SystemUI.confirm({
                                    title: "Camera Access Required",
                                    message:
                                        "Rollyn needs camera access to read the weighing scale display automatically. After clicking Allow, your browser will ask for permission. No images are sent to any external server.",
                                    confirmText: "Allow Camera Access",
                                    cancelText: "Cancel",
                                    onConfirm: (confirmed) => {
                                        if (confirmed) startCamera();
                                    },
                                    onCancel: () =>
                                        setEngineState("camera_denied"),
                                });
                            }}
                            style={{ flex: 1, justifyContent: "center" }}
                        >
                            <Camera size={13} /> Try Again
                        </button>
                    )}
                </div>
            </div>

            {/* ════ RIGHT PANEL: Weight Detection Result ════ */}
            <div className="card" style={{ padding: 16 }}>
                <h3 className="section-title" style={{ marginBottom: 12 }}>
                    Weight Detection Result
                </h3>

                {/* ── IDLE state ── */}
                {(engineState === "permission_modal" ||
                    engineState === "requesting" ||
                    engineState === "camera_active" ||
                    engineState === "camera_denied") && (
                    <div
                        style={{
                            textAlign: "center",
                            padding: "36px 20px",
                            color: "#999",
                            fontSize: 13,
                        }}
                    >
                        <Camera
                            size={32}
                            style={{ color: "#ddd", marginBottom: 12 }}
                        />
                        <p style={{ margin: 0 }}>
                            Point the camera at the weighing display, then click{" "}
                            <strong>Take Photo</strong>.
                        </p>
                    </div>
                )}

                {/* ── PROCESSING state ── */}
                {engineState === "processing" && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: 140,
                            gap: 10,
                            color: "#777",
                            fontSize: 13,
                        }}
                    >
                        <Loader size={20} style={{ color: "#337AB7" }} />
                        Running local OCR — processing image…
                    </div>
                )}

                {/* ── SUCCESS state ── */}
                {engineState === "success" && ocrResult && (
                    <div>
                        {/* Confidence banner */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "9px 13px",
                                background: "#f2f9f2",
                                border: "1px solid #d4edda",
                                borderRadius: 6,
                                marginBottom: 14,
                            }}
                        >
                            <CheckCircle
                                size={15}
                                style={{ color: "#5CB85C", flexShrink: 0 }}
                            />
                            <span
                                style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "#3C763D",
                                }}
                            >
                                Recognition Successful —{" "}
                                {ocrResult.confidence.toFixed(1)}% confidence
                            </span>
                        </div>

                        {/* Detected weight — visually dominant */}
                        <div
                            style={{
                                textAlign: "center",
                                padding: "20px 0 16px",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 11,
                                    color: "#888",
                                    marginBottom: 6,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.06em",
                                }}
                            >
                                Detected Weight
                            </div>
                            <div
                                style={{
                                    fontSize: 56,
                                    fontWeight: 800,
                                    color: "#286090",
                                    fontFamily:
                                        "JetBrains Mono, Consolas, monospace",
                                    lineHeight: 1,
                                    letterSpacing: "-0.02em",
                                }}
                            >
                                {ocrResult.weightDisplay}
                            </div>
                            <div
                                style={{
                                    fontSize: 18,
                                    color: "#555",
                                    fontWeight: 600,
                                    marginTop: 4,
                                }}
                            >
                                kg
                            </div>
                        </div>

                        {/* Debug info — raw OCR text and variant */}
                        <div
                            style={{
                                fontSize: 10,
                                color: "#999",
                                marginBottom: 14,
                                padding: 8,
                                background: "#f9f9f9",
                                border: "1px solid #eee",
                                borderRadius: 4,
                                fontFamily: "monospace",
                                lineHeight: 1.4,
                            }}
                        >
                            <div>
                                <strong>Raw OCR:</strong> "{ocrResult.rawText}"
                            </div>
                            <div>
                                <strong>Variant:</strong>{" "}
                                {ocrResult.variantLabel}
                            </div>
                            <div style={{ marginTop: 8 }}>
                                <strong>Preprocessed Image:</strong>
                                <img
                                    src={ocrResult.variantDataUrl}
                                    alt="Preprocessed OCR input"
                                    style={{
                                        width: "100%",
                                        marginTop: 4,
                                        borderRadius: 2,
                                        border: "1px solid #ddd",
                                    }}
                                />
                            </div>
                        </div>

                        {/* Editable weight field */}
                        <div style={{ marginBottom: 14 }}>
                            <label
                                style={{
                                    fontSize: 12,
                                    color: "#666",
                                    display: "block",
                                    marginBottom: 5,
                                }}
                            >
                                <Edit3
                                    size={11}
                                    style={{
                                        marginRight: 4,
                                        verticalAlign: "middle",
                                    }}
                                />
                                Automatically detected. You may edit this value
                                if needed.
                            </label>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                }}
                            >
                                <input
                                    id="ocr-weight-edit-input"
                                    type="number"
                                    value={editedWeight}
                                    min={0}
                                    step={0.1}
                                    onChange={(e) => {
                                        setEditedWeight(e.target.value);
                                        setIsManuallyEdited(true);
                                    }}
                                    className="form-input"
                                    style={{ flex: 1 }}
                                />
                                <span
                                    style={{
                                        fontSize: 14,
                                        color: "#555",
                                        fontWeight: 600,
                                    }}
                                >
                                    kg
                                </span>
                            </div>
                            {isManuallyEdited && (
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "#888",
                                        marginTop: 4,
                                    }}
                                >
                                    Value edited by administrator.
                                </div>
                            )}
                        </div>

                        {/* Continue button */}
                        <button
                            id="ocr-continue-btn"
                            className="btn btn-primary"
                            style={{ width: "100%", justifyContent: "center" }}
                            onClick={confirmWeight}
                            disabled={
                                !editedWeight || parseFloat(editedWeight) <= 0
                            }
                        >
                            Continue to Roll Data Entry →
                        </button>
                    </div>
                )}

                {/* ── ERROR state ── */}
                {engineState === "error" && ocrError && (
                    <div>
                        <div
                            style={{
                                padding: "14px 16px",
                                background: "#fdf2f2",
                                border: "1px solid #f5c6cb",
                                borderRadius: 6,
                                marginBottom: 14,
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 8,
                                    marginBottom: 6,
                                }}
                            >
                                <AlertCircle
                                    size={16}
                                    style={{
                                        color: "#C0392B",
                                        flexShrink: 0,
                                        marginTop: 1,
                                    }}
                                />
                                <span
                                    style={{
                                        fontWeight: 700,
                                        fontSize: 13,
                                        color: "#C0392B",
                                    }}
                                >
                                    {ocrError.title}
                                </span>
                            </div>
                            <p
                                style={{
                                    fontSize: 13,
                                    color: "#555",
                                    margin: 0,
                                    lineHeight: 1.5,
                                }}
                            >
                                {ocrError.message}
                            </p>
                        </div>

                        <p
                            style={{
                                fontSize: 12,
                                color: "#888",
                                marginBottom: 14,
                            }}
                        >
                            You can click <strong>Take Photo</strong> again to
                            retry, or enter the weight manually below.
                        </p>

                        {/* Manual entry fallback */}
                        <div style={{ marginBottom: 14 }}>
                            <label
                                style={{
                                    fontSize: 12,
                                    color: "#666",
                                    display: "block",
                                    marginBottom: 5,
                                }}
                            >
                                Enter weight manually (kg)
                            </label>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                }}
                            >
                                <input
                                    id="ocr-manual-weight-input"
                                    type="number"
                                    value={editedWeight}
                                    min={0}
                                    step={0.1}
                                    placeholder="e.g. 1900"
                                    onChange={(e) => {
                                        setEditedWeight(e.target.value);
                                        setIsManuallyEdited(true);
                                    }}
                                    className="form-input"
                                    style={{ flex: 1 }}
                                />
                                <span
                                    style={{
                                        fontSize: 14,
                                        color: "#555",
                                        fontWeight: 600,
                                    }}
                                >
                                    kg
                                </span>
                            </div>
                        </div>

                        {editedWeight && parseFloat(editedWeight) > 0 && (
                            <button
                                id="ocr-manual-continue-btn"
                                className="btn btn-primary"
                                style={{
                                    width: "100%",
                                    justifyContent: "center",
                                }}
                                onClick={confirmWeight}
                            >
                                Continue with Manual Weight →
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
