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
    type PreprocessedVariant,
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

type EngineState =
    | "permission_modal"
    | "requesting"
    | "camera_active"
    | "processing"
    | "success"
    | "error"
    | "camera_denied";

interface WeightDetectionEngineProps {
    onWeightConfirmed: (
        weight: number,
        weightDisplay: string,
        source: "ocr" | "manual",
    ) => void;
    roi?: ROI;
}

export default function WeightDetectionEngine({
    onWeightConfirmed,
    roi = DEFAULT_ROI,
}: WeightDetectionEngineProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [engineState, setEngineState] = useState<EngineState>("permission_modal");
    const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
    const [ocrError, setOcrError] = useState<OcrError | null>(null);

    const [editedWeight, setEditedWeight] = useState<string>("");
    const [isManuallyEdited, setIsManuallyEdited] = useState(false);

    const latestVariantsRef = useRef<PreprocessedVariant[]>([]);
    const isProcessing = engineState === "processing";

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        setEngineState("requesting");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment",
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
            try {
                localStorage.setItem("rollyn_camera_permission", "granted");
            } catch (e) {}
            SystemUI.toast({
                message: "Camera active. Point at display to capture weight.",
                type: "info",
                duration: 4000,
            });
        } catch (err) {
            console.error("[OCR] Camera access denied:", err);
            setEngineState("camera_denied");
            try {
                localStorage.removeItem("rollyn_camera_permission");
            } catch (e) {}
        }
    }, []);

    useEffect(() => {
        initOCRWorker();

        const checkAndStartCamera = async () => {
            let alreadyGranted = false;

            try {
                if (navigator.permissions && navigator.permissions.query) {
                    const status = await navigator.permissions.query({ name: "camera" as PermissionName });
                    if (status.state === "granted") {
                        alreadyGranted = true;
                    } else if (status.state === "denied") {
                        setEngineState("camera_denied");
                        return;
                    }
                }
            } catch (e) {}

            if (!alreadyGranted) {
                try {
                    if (localStorage.getItem("rollyn_camera_permission") === "granted") {
                        alreadyGranted = true;
                    }
                } catch (e) {}
            }

            if (alreadyGranted) {
                startCamera();
            } else {
                SystemUI.confirm({
                    title: "Camera Access Required",
                    message:
                        "Rollyn needs camera access to read the weighing scale display automatically.",
                    confirmText: "Allow Camera Access",
                    cancelText: "Cancel",
                    onConfirm: (confirmed) => {
                        if (confirmed) startCamera();
                        else setEngineState("camera_denied");
                    },
                    onCancel: () => setEngineState("camera_denied"),
                });
            }
        };

        checkAndStartCamera();
    }, [startCamera]);

    useEffect(() => {
        return () => {
            stopCamera();
            terminateOCRWorker();
        };
    }, [stopCamera]);

    const takePhoto = useCallback(async () => {
        const video = videoRef.current;
        if (!video || !streamRef.current) return;

        setEngineState("processing");
        setOcrResult(null);
        setOcrError(null);

        try {
            const { variants, rawCanvas } = await preprocessImage(video, roi);
            latestVariantsRef.current = variants;

            const quality = analyseImageQuality(rawCanvas);
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
            console.error("[OCR] Error during recognition:", err);
            const errorTitle = "Processing Error";
            const errorMessage = "An unexpected error occurred while processing image.";
            setOcrError({ title: errorTitle, message: errorMessage });
            setEngineState("error");
            SystemUI.alert({ title: errorTitle, message: errorMessage });
        }
    }, [roi]);

    function retryCapture() {
        setOcrResult(null);
        setOcrError(null);
        setEditedWeight("");
        setIsManuallyEdited(false);
        setEngineState("camera_active");
    }

    function confirmWeight() {
        const numericWeight = parseFloat(editedWeight.replace(/,/g, ""));
        if (isNaN(numericWeight) || numericWeight <= 0) return;

        const digitalVariant = latestVariantsRef.current.find((v) => v.digital && v.canvas);
        if (digitalVariant && digitalVariant.canvas) {
            try {
                calibrateScaleFont(digitalVariant.canvas, String(numericWeight));
            } catch (err) {
                console.warn("[OCR] Calibration skipped:", err);
            }
        }

        const display = numericWeight.toLocaleString("en-US", {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0,
        });

        onWeightConfirmed(numericWeight, display, isManuallyEdited ? "manual" : "ocr");
    }

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
            <div className="card" style={{ padding: 16 }}>
                <h3 className="section-title" style={{ marginBottom: 12 }}>Camera Preview</h3>
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
                            <Loader size={28} style={{ color: "#5CB85C", animation: "spin 1s linear infinite" }} />
                            <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>Processing image…</span>
                        </div>
                    )}

                    {(engineState === "permission_modal" || engineState === "requesting") && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                            {engineState === "requesting" ? (
                                <Loader size={32} style={{ color: "rgba(255,255,255,0.5)", animation: "spin 1s linear infinite" }} />
                            ) : (
                                <Camera size={40} style={{ color: "rgba(255,255,255,0.3)" }} />
                            )}
                            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                                {engineState === "requesting" ? "Requesting camera access…" : "Camera permission pending"}
                            </span>
                        </div>
                    )}

                    {engineState === "camera_denied" && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 20, textAlign: "center" }}>
                            <AlertCircle size={36} style={{ color: "#e74c3c" }} />
                            <span style={{ color: "#e74c3c", fontSize: 13, fontWeight: 600 }}>Camera access denied</span>
                        </div>
                    )}
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {(engineState === "camera_active" || engineState === "processing" || engineState === "success" || engineState === "error") && (
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

                    {engineState === "camera_denied" && (
                        <button
                            id="ocr-grant-access-btn"
                            className="btn btn-primary"
                            onClick={() => {
                                setEngineState("permission_modal");
                                startCamera();
                            }}
                            style={{ flex: 1, justifyContent: "center" }}
                        >
                            <Camera size={13} /> Try Again
                        </button>
                    )}
                </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
                <h3 className="section-title" style={{ marginBottom: 12 }}>Weight Detection Result</h3>

                {(engineState === "permission_modal" || engineState === "requesting" || engineState === "camera_active" || engineState === "camera_denied") && (
                    <div style={{ textAlign: "center", padding: "36px 20px", color: "#999", fontSize: 13 }}>
                        <Camera size={32} style={{ color: "#ddd", marginBottom: 12 }} />
                        <p style={{ margin: 0 }}>Point camera at weighing display, then click <strong>Take Photo</strong>.</p>
                    </div>
                )}

                {engineState === "processing" && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 140, gap: 10, color: "#777", fontSize: 13 }}>
                        <Loader size={20} style={{ color: "#337AB7" }} />
                        Running local OCR — processing image…
                    </div>
                )}

                {engineState === "success" && ocrResult && (
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", background: "#f2f9f2", border: "1px solid #d4edda", borderRadius: 6, marginBottom: 14 }}>
                            <CheckCircle size={15} style={{ color: "#5CB85C", flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#3C763D" }}>Recognition Successful — {ocrResult.confidence.toFixed(1)}% confidence</span>
                        </div>

                        <div style={{ textAlign: "center", padding: "20px 0 16px" }}>
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Detected Weight</div>
                            <div style={{ fontSize: 56, fontWeight: 800, color: "#286090", fontFamily: "JetBrains Mono, Consolas, monospace", lineHeight: 1, letterSpacing: "-0.02em" }}>{ocrResult.weightDisplay}</div>
                            <div style={{ fontSize: 18, color: "#555", fontWeight: 600, marginTop: 4 }}>kg</div>
                        </div>

                        <div style={{ fontSize: 10, color: "#999", marginBottom: 14, padding: 8, background: "#f9f9f9", border: "1px solid #eee", borderRadius: 4, fontFamily: "monospace", lineHeight: 1.4 }}>
                            <div><strong>Raw OCR:</strong> "{ocrResult.rawText}"</div>
                            <div><strong>Variant:</strong> {ocrResult.variantLabel}</div>
                            <div style={{ marginTop: 8 }}><strong>Preprocessed Image:</strong>
                                <img src={ocrResult.variantDataUrl} alt="Preprocessed OCR input" style={{ width: "100%", marginTop: 4, borderRadius: 2, border: "1px solid #ddd" }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 5 }}>
                                <Edit3 size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />
                                Automatically detected. You may edit this value if needed.
                            </label>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input id="ocr-weight-edit-input" type="number" value={editedWeight} min={0} step={0.1} onChange={(e) => { setEditedWeight(e.target.value); setIsManuallyEdited(true); }} className="form-input" style={{ flex: 1 }} />
                                <span style={{ fontSize: 14, color: "#555", fontWeight: 600 }}>kg</span>
                            </div>
                            {isManuallyEdited && <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Value edited by administrator.</div>}
                        </div>

                        <button id="ocr-continue-btn" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={confirmWeight} disabled={!editedWeight || parseFloat(editedWeight) <= 0}>Continue to Roll Data Entry →</button>
                    </div>
                )}

                {engineState === "error" && ocrError && (
                    <div>
                        <div style={{ padding: "14px 16px", background: "#fdf2f2", border: "1px solid #f5c6cb", borderRadius: 6, marginBottom: 14 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                                <AlertCircle size={16} style={{ color: "#C0392B", flexShrink: 0, marginTop: 1 }} />
                                <span style={{ fontWeight: 700, fontSize: 13, color: "#C0392B" }}>{ocrError.title}</span>
                            </div>
                            <p style={{ fontSize: 13, color: "#555", margin: 0, lineHeight: 1.5 }}>{ocrError.message}</p>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 5 }}>Enter weight manually (kg)</label>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input id="ocr-manual-weight-input" type="number" value={editedWeight} min={0} step={0.1} placeholder="e.g. 1900" onChange={(e) => { setEditedWeight(e.target.value); setIsManuallyEdited(true); }} className="form-input" style={{ flex: 1 }} />
                                <span style={{ fontSize: 14, color: "#555", fontWeight: 600 }}>kg</span>
                            </div>
                        </div>

                        {editedWeight && parseFloat(editedWeight) > 0 && (
                            <button id="ocr-manual-continue-btn" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={confirmWeight}>Continue with Manual Weight →</button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
