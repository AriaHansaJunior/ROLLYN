
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Camera,
    CheckCircle,
    AlertCircle,
    Loader,
    RefreshCw,
    Edit3,
    Cpu,
    Zap,
    BookOpen,
    Sparkles,
} from "lucide-react";

import {
    preprocessImage,
    analyseImageQuality,
    DEFAULT_ROI,
    type ROI,
    type PreprocessedVariant,
} from "../OCR/ImageProcessor";
import {
    initOCRWorker,
    recogniseWeight,
    terminateOCRWorker,
    calibrateScaleFont,
    type OcrResult,
    type OcrError,
} from "../OCR/OCRService";
import {
    detectSpectrumWeight,
    logSpectrumTest,
    retrainSpectrumEngine,
    type SpectrumResult,
} from "./SpectrumService";
import { SystemUI } from "@/Utils/SystemUI";


type EngineState =
    | "permission_modal"
    | "requesting"
    | "camera_active"
    | "processing"
    | "success"
    | "error"
    | "camera_denied";

interface SpectrumWeightDetectionEngineProps {
    onWeightConfirmed: (
        weight: number,
        weightDisplay: string,
        source: "ocr" | "spectrum" | "manual",
    ) => void;

    roi?: ROI;
}


export default function SpectrumWeightDetectionEngine({
    onWeightConfirmed,
    roi = DEFAULT_ROI,
}: SpectrumWeightDetectionEngineProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const currentFrameBase64Ref = useRef<string>("");

    const [engineState, setEngineState] = useState<EngineState>("permission_modal");

    const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
    const [ocrError, setOcrError] = useState<OcrError | null>(null);
    const [spectrumResult, setSpectrumResult] = useState<SpectrumResult | null>(null);

    const [selectedEngine, setSelectedEngine] = useState<"spectrum" | "ocr">("spectrum");

    const [editedWeight, setEditedWeight] = useState<string>("");
    const [isManuallyEdited, setIsManuallyEdited] = useState(false);
    const [isRetraining, setIsRetraining] = useState(false);

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
            SystemUI.toast({
                message: "Camera active. Point at display to capture weight.",
                type: "info",
                duration: 4000,
            });
        } catch (err) {
            console.error("[OCR] Camera access denied:", err);
            setEngineState("camera_denied");
            SystemUI.alert({
                title: "Camera Access Denied",
                message: "Please allow camera access in browser settings.",
            });
        }
    }, []);

    useEffect(() => {
        initOCRWorker();

        if (engineState === "permission_modal") {
            SystemUI.confirm({
                title: "Camera Access Required",
                message:
                    "Rollyn needs camera access to read the weighing scale display automatically. After clicking Allow, your browser will ask for permission.",
                confirmText: "Allow Camera Access",
                cancelText: "Cancel",
                onConfirm: (confirmed) => {
                    if (confirmed) startCamera();
                },
                onCancel: () => setEngineState("camera_denied"),
            });
        }
    }, []);

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
        setSpectrumResult(null);

        try {
            const captureBase64 = async () => {
                const { rawCanvas } = await preprocessImage(video, roi);
                return rawCanvas.toDataURL("image/jpeg", 0.9);
            };

            const frames: string[] = [];
            const { variants, rawCanvas } = await preprocessImage(video, roi);
            latestVariantsRef.current = variants;

            const frameBase64 = rawCanvas.toDataURL("image/jpeg", 0.9);
            currentFrameBase64Ref.current = frameBase64;
            frames.push(frameBase64);

            await new Promise((r) => setTimeout(r, 50));
            frames.push(await captureBase64());
            await new Promise((r) => setTimeout(r, 50));
            frames.push(await captureBase64());

            const quality = analyseImageQuality(rawCanvas);
            const [legacyOutcome, spectrumData] = await Promise.all([
                recogniseWeight(variants, quality),
                detectSpectrumWeight(frames),
            ]);

            setSpectrumResult(spectrumData);

            if ("result" in legacyOutcome) {
                setOcrResult(legacyOutcome.result);
            } else {
                setOcrError(legacyOutcome.error);
            }

            if (spectrumData && spectrumData.weight_detected > 0 && spectrumData.confidence >= 0.80) {
                setSelectedEngine("spectrum");
                setEditedWeight(String(spectrumData.weight_detected));
            } else if ("result" in legacyOutcome) {
                setSelectedEngine("ocr");
                setEditedWeight(String(legacyOutcome.result.weight));
            } else if (spectrumData && spectrumData.weight_detected > 0) {
                setSelectedEngine("spectrum");
                setEditedWeight(String(spectrumData.weight_detected));
            }

            setIsManuallyEdited(false);
            setEngineState("success");

            if (spectrumData && spectrumData.confidence < 0.80) {
                SystemUI.toast({
                    message: "Warning: SPECTRUM 4.0 confidence < 80%. Please verify detected weight.",
                    type: "warning",
                });
            } else {
                SystemUI.toast({
                    message: "Detection complete — SPECTRUM 4.0 (Heuristic & NMS Active) ready!",
                    type: "success",
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

    const handleEngineToggle = (choice: "spectrum" | "ocr") => {
        setSelectedEngine(choice);
        setIsManuallyEdited(false);
        if (choice === "spectrum" && spectrumResult && spectrumResult.weight_detected > 0) {
            setEditedWeight(String(spectrumResult.weight_detected));
        } else if (choice === "ocr" && ocrResult) {
            setEditedWeight(String(ocrResult.weight));
        }
    };

    const handleAutoTeach = async () => {
        setIsRetraining(true);
        SystemUI.toast({ message: "Memperbarui sistem pembacaan timbangan…", type: "info" });
        try {
            const res = await retrainSpectrumEngine();
            if (res.status === "SUCCESS") {
                SystemUI.toast({
                    message: res.message || "Sistem pembacaan timbangan berhasil diperbarui!",
                    type: "success",
                    duration: 5000,
                });
            } else {
                SystemUI.toast({
                    message: res.message || "Belum ada dataset baru di storage sampel.",
                    type: "warning",
                    duration: 5000,
                });
            }
        } catch (err) {
            SystemUI.toast({ message: "Pembaruan sistem gagal dilakukan", type: "error" });
        } finally {
            setIsRetraining(false);
        }
    };


    function retryCapture() {
        setOcrResult(null);
        setOcrError(null);
        setSpectrumResult(null);
        setEditedWeight("");
        setIsManuallyEdited(false);
        setEngineState("camera_active");
    }

    async function confirmWeight() {
        const numericWeight = parseFloat(editedWeight.replace(/,/g, ""));
        if (isNaN(numericWeight) || numericWeight <= 0) return;

        const effectiveSource: "ocr" | "spectrum" | "manual" = isManuallyEdited
            ? "manual"
            : selectedEngine;

        const logRes = await logSpectrumTest({
            image_base64: currentFrameBase64Ref.current,
            spectrum_processed_image: spectrumResult ? spectrumResult.spectrum_processed_image : undefined,
            ocr_legacy_result: ocrResult ? String(ocrResult.weight) : undefined,
            ocr_legacy_confidence: ocrResult ? ocrResult.confidence : undefined,
            spectrum_result: spectrumResult ? String(spectrumResult.weight_detected) : undefined,
            spectrum_confidence: spectrumResult ? (spectrumResult.confidence * 100) : undefined,
            actual_manual_input: numericWeight,
            selected_source: effectiveSource,
        });

        const toastMsg = logRes.message || `Terima kasih! Foto & Koreksi Berat [${numericWeight} kg] Telah Disimpan ke Data Sampel.`;
        SystemUI.toast({
            message: toastMsg,
            type: "success",
            duration: 5000,
        });

        const digitalVariant = latestVariantsRef.current.find((v) => v.digital && v.canvas);
        if (digitalVariant && digitalVariant.canvas) {
            try {
                calibrateScaleFont(digitalVariant.canvas, String(numericWeight));
            } catch (err) {
                console.warn("[OCR] Calibration skipped:", err);
            }
        }

        const display = numericWeight.toLocaleString("en-US", {
            maximumFractionDigits: 0,
            minimumFractionDigits: 0,
        });

        onWeightConfirmed(numericWeight, display, effectiveSource);
    }


    const isSpectrumLowConf = spectrumResult && (spectrumResult.confidence < 0.80 || spectrumResult.status === "WARNING_LOW_CONFIDENCE");

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                maxWidth: 1100,
            }}
            className="max-[900px]:grid-cols-1!"
        >
            <div className="card" style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <h3 className="section-title" style={{ margin: 0 }}>
                        Pratinjau Kamera Live
                    </h3>
                    <div style={{ display: "flex", gap: 6 }}>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={handleAutoTeach}
                            disabled={isRetraining}
                            title="Perbarui sistem pembacaan dari sampel tersimpan"
                            style={{ fontSize: 11, padding: "4px 8px" }}
                        >
                            {isRetraining ? (
                                <Loader size={12} style={{ animation: "spin 1s linear infinite" }} />
                            ) : (
                                <Sparkles size={12} style={{ color: "#2563EB" }} />
                            )}
                            <span>{isRetraining ? "Memproses…" : "🔄 Perbarui Sistem"}</span>
                        </button>
                        <a
                            href="/training"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            title="Buka Halaman Kalibrasi Timbangan"
                            style={{ fontSize: 11, padding: "4px 8px", textDecoration: "none" }}
                        >
                            <BookOpen size={12} style={{ color: "#7c3aed" }} />
                            <span>Kalibrasi</span>
                        </a>
                    </div>
                </div>

                <div
                    style={{
                        background: "#0f1923",
                        borderRadius: 8,
                        height: 250,
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
                                background: "rgba(0,0,0,0.6)",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 10,
                            }}
                        >
                            <Loader
                                size={32}
                                style={{
                                    color: "#3B82F6",
                                    animation: "spin 1s linear infinite",
                                }}
                            />
                            <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
                                SPECTRUM 4.0 (Heuristic & NMS Active)…
                            </span>
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <h3 className="section-title" style={{ margin: 0 }}>
                        Hasil Pembacaan Timbangan
                    </h3>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe" }}>
                        SPECTRUM Engine 4.0
                    </span>
                </div>

                {(engineState === "permission_modal" || engineState === "requesting" || engineState === "camera_active" || engineState === "camera_denied") && (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "#999", fontSize: 13 }}>
                        <Camera size={36} style={{ color: "#ddd", marginBottom: 12 }} />
                        <p style={{ margin: 0 }}>
                            Arahkan kamera ke layar LED timbangan, lalu klik <strong>Ambil Foto</strong>.
                        </p>
                    </div>
                )}

                {engineState === "processing" && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160, gap: 10, color: "#777", fontSize: 13 }}>
                        <Loader size={22} style={{ color: "#2563EB" }} />
                        Memproses deteksi presisi LED timbangan…
                    </div>
                )}

                {engineState === "success" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", marginBottom: 6 }}>
                                Pilih Engine Berat Timbangan:
                            </div>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, color: selectedEngine === "spectrum" ? "#1e40af" : "#475569" }}>
                                    <input
                                        type="radio"
                                        name="engineChoice"
                                        checked={selectedEngine === "spectrum"}
                                        onChange={() => handleEngineToggle("spectrum")}
                                    />
                                    <Zap size={14} style={{ color: "#2563EB" }} />
                                    SPECTRUM 4.0 (Heuristic & NMS)
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, color: selectedEngine === "ocr" ? "#166534" : "#475569" }}>
                                    <input
                                        type="radio"
                                        name="engineChoice"
                                        checked={selectedEngine === "ocr"}
                                        onChange={() => handleEngineToggle("ocr")}
                                    />
                                    <Cpu size={14} style={{ color: "#16A34A" }} />
                                    OCR Lama (Tesseract)
                                </label>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="max-[600px]:grid-cols-1!">

                            <div style={{
                                padding: 12,
                                borderRadius: 8,
                                border: selectedEngine === "spectrum"
                                    ? isSpectrumLowConf ? "2px solid #eab308" : "2px solid #2563eb"
                                    : "1px solid #cbd5e1",
                                background: isSpectrumLowConf
                                    ? "#fefce8"
                                    : selectedEngine === "spectrum" ? "#eff6ff" : "#fff",
                            }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: isSpectrumLowConf ? "#854d0e" : "#1e3a8a", display: "flex", alignItems: "center", gap: 4 }}>
                                        <Zap size={12} style={{ color: isSpectrumLowConf ? "#ca8a04" : "#2563eb" }} /> SPECTRUM 4.0
                                    </span>
                                    {spectrumResult && (
                                        <span style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            padding: "2px 6px",
                                            borderRadius: 4,
                                            background: isSpectrumLowConf ? "#fef08a" : "#dcfce7",
                                            color: isSpectrumLowConf ? "#a16207" : "#166534",
                                            border: isSpectrumLowConf ? "1px solid #fde047" : "none",
                                        }}>
                                            {isSpectrumLowConf
                                                ? `LOW CONF (<80%) — ${(spectrumResult.confidence * 100).toFixed(0)}%`
                                                : `${(spectrumResult.confidence * 100).toFixed(0)}% Conf`}
                                        </span>
                                    )}
                                </div>

                                {spectrumResult ? (
                                    <>
                                        <div style={{ textAlign: "center", padding: "8px 0" }}>
                                            <div style={{
                                                fontSize: 32,
                                                fontWeight: 900,
                                                color: isSpectrumLowConf ? "#ca8a04" : "#1e40af",
                                                fontFamily: "JetBrains Mono, monospace",
                                                background: isSpectrumLowConf ? "#fef9c3" : "transparent",
                                                borderRadius: 4,
                                                display: "inline-block",
                                                padding: "0 8px",
                                            }}>
                                                {spectrumResult.weight_detected}
                                            </div>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>kg</div>
                                        </div>

                                        <div style={{ fontSize: 10, color: "#64748b" }}>
                                            <strong>Geometric 5x5 Mask:</strong>
                                            <img
                                                src={spectrumResult.spectrum_processed_image}
                                                alt="SPECTRUM 4.0 Output"
                                                style={{ width: "100%", height: 50, objectFit: "contain", marginTop: 4, background: "#000", borderRadius: 4 }}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: "16px 0" }}>
                                        Processing SPECTRUM 4.0…
                                    </div>
                                )}
                            </div>

                            <div style={{
                                padding: 12,
                                borderRadius: 8,
                                border: selectedEngine === "ocr" ? "2px solid #16a34a" : "1px solid #cbd5e1",
                                background: selectedEngine === "ocr" ? "#f0fdf4" : "#fff",
                            }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "#14532d", display: "flex", alignItems: "center", gap: 4 }}>
                                        <Cpu size={12} style={{ color: "#16a34a" }} /> OCR Lama
                                    </span>
                                    {ocrResult && (
                                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#dcfce7", color: "#166534" }}>
                                            {ocrResult.confidence.toFixed(0)}% Conf
                                        </span>
                                    )}
                                </div>

                                {ocrResult ? (
                                    <>
                                        <div style={{ textAlign: "center", padding: "8px 0" }}>
                                            <div style={{ fontSize: 32, fontWeight: 900, color: "#15803d", fontFamily: "JetBrains Mono, monospace" }}>
                                                {ocrResult.weightDisplay}
                                            </div>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>kg</div>
                                        </div>

                                        <div style={{ fontSize: 10, color: "#64748b" }}>
                                            <strong>Tesseract Variant:</strong>
                                            <img
                                                src={ocrResult.variantDataUrl}
                                                alt="Legacy OCR Output"
                                                style={{ width: "100%", height: 50, objectFit: "contain", marginTop: 4, background: "#f1f5f9", borderRadius: 4 }}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: "16px 0" }}>
                                        {ocrError ? ocrError.title : "No result"}
                                    </div>
                                )}
                            </div>

                        </div>

                        <div>
                            <label style={{ fontSize: 11, color: "#475569", display: "block", marginBottom: 4 }}>
                                <Edit3 size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />
                                Formatted Weight (Admin editable - 3 to 4 pure digits):
                            </label>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input
                                    id="ocr-weight-edit-input"
                                    type="number"
                                    value={editedWeight}
                                    min={0}
                                    step={1}
                                    onChange={(e) => {
                                        setEditedWeight(e.target.value);
                                        setIsManuallyEdited(true);
                                    }}
                                    className="form-input"
                                    style={{ flex: 1 }}
                                />
                                <span style={{ fontSize: 13, color: "#475569", fontWeight: 700 }}>kg</span>
                            </div>
                            {isManuallyEdited && (
                                <div style={{ fontSize: 10, color: "#d97706", marginTop: 2 }}>
                                    Edited manually by administrator (will be saved to Active Learning dataset).
                                </div>
                            )}
                        </div>

                        <button
                            id="ocr-continue-btn"
                            className="btn btn-primary"
                            style={{ width: "100%", justifyContent: "center" }}
                            onClick={confirmWeight}
                            disabled={!editedWeight || parseFloat(editedWeight) <= 0}
                        >
                            Continue to Roll Data Entry →
                        </button>

                    </div>
                )}

                {engineState === "error" && ocrError && (
                    <div>
                        <div style={{ padding: "12px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, marginBottom: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                <AlertCircle size={15} style={{ color: "#dc2626" }} />
                                <span style={{ fontWeight: 700, fontSize: 13, color: "#991b1b" }}>{ocrError.title}</span>
                            </div>
                            <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>{ocrError.message}</p>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 4 }}>Enter weight manually (kg)</label>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input
                                    id="ocr-manual-weight-input"
                                    type="number"
                                    value={editedWeight}
                                    min={0}
                                    step={1}
                                    placeholder="e.g. 1900"
                                    onChange={(e) => {
                                        setEditedWeight(e.target.value);
                                        setIsManuallyEdited(true);
                                    }}
                                    className="form-input"
                                    style={{ flex: 1 }}
                                />
                                <span style={{ fontSize: 13, color: "#475569", fontWeight: 700 }}>kg</span>
                            </div>
                        </div>

                        {editedWeight && parseFloat(editedWeight) > 0 && (
                            <button
                                id="ocr-manual-continue-btn"
                                className="btn btn-primary"
                                style={{ width: "100%", justifyContent: "center" }}
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
