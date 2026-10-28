import React from "react";
import { Camera, RotateCw, Sparkles, Check } from "lucide-react";
import { type SpectrumResult } from "@/SPECTRUM/SpectrumService";
import { FrameSizeMode, RoiConfig } from "./Training_types";

interface Props {
    isCameraOpen: boolean;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    frameSizeMode: FrameSizeMode;
    setFrameSizeMode: (mode: FrameSizeMode) => void;
    getRoiConfig: () => RoiConfig;
    handleCaptureAndDetect: () => void;
    isCapturing: boolean;
    isDetecting: boolean;
    capturedFrame: string | null;
    spectrumData: SpectrumResult | null;
    confirmedWeightInput: string;
    setConfirmedWeightInput: (val: string) => void;
    isCorrecting: boolean;
    setIsCorrecting: (val: boolean) => void;
    handleSaveCapturedToDataset: () => void;
    isSaving: boolean;
}

export default function Training_LiveCamera({
    isCameraOpen,
    videoRef,
    frameSizeMode,
    setFrameSizeMode,
    getRoiConfig,
    handleCaptureAndDetect,
    isCapturing,
    isDetecting,
    capturedFrame,
    spectrumData,
    confirmedWeightInput,
    setConfirmedWeightInput,
    isCorrecting,
    setIsCorrecting,
    handleSaveCapturedToDataset,
    isSaving,
}: Props) {
    if (!isCameraOpen) return null;

    return (
        <div
            style={{
                background: "#0f172a",
                border: "2px solid #3b82f6",
                borderRadius: 14,
                padding: 20,
                marginBottom: 20,
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 14,
                    flexWrap: "wrap",
                    gap: 10,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "#38bdf8",
                        fontSize: 14,
                        fontWeight: 800,
                    }}
                >
                    <Camera size={18} /> LIVE CAMERA VIEW — PRECISION TARGETING FRAME
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                        style={{
                            fontSize: 11,
                            color: "#94a3b8",
                            fontWeight: 600,
                        }}
                    >
                        Frame Size:
                    </span>
                    {(
                        [
                            { id: "small", label: "📱 Small (50%)" },
                            { id: "medium", label: "📷 Medium (65%)" },
                            { id: "large", label: "🖼️ Large (80%)" },
                            { id: "full", label: "🖥️ Full" },
                        ] as const
                    ).map((size) => (
                        <button
                            key={size.id}
                            onClick={() => setFrameSizeMode(size.id)}
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "4px 8px",
                                borderRadius: 5,
                                cursor: "pointer",
                                background:
                                    frameSizeMode === size.id
                                        ? "#2563eb"
                                        : "#1e293b",
                                color:
                                    frameSizeMode === size.id
                                        ? "#fff"
                                        : "#94a3b8",
                                border: `1px solid ${frameSizeMode === size.id ? "#3b82f6" : "#334155"}`,
                            }}
                        >
                            {size.label}
                        </button>
                    ))}
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 16,
                }}
                className="min-[900px]:grid-cols-[1fr_360px]!"
            >
                <div
                    style={{
                        position: "relative",
                        background: "#000",
                        borderRadius: 10,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 320,
                        border: "1px solid #334155",
                    }}
                >
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                        }}
                    />

                    {(() => {
                        const roi = getRoiConfig();
                        return (
                            <div
                                style={{
                                    position: "absolute",
                                    top: `${roi.y * 100}%`,
                                    left: `${roi.x * 100}%`,
                                    width: `${roi.width * 100}%`,
                                    height: `${roi.height * 100}%`,
                                    border: "2px solid #22c55e",
                                    boxShadow:
                                        "0 0 0 9999px rgba(0, 0, 0, 0.55)",
                                    borderRadius: 8,
                                    pointerEvents: "none",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    padding: 6,
                                    boxSizing: "border-box",
                                    transition: "all 0.3s ease",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 14,
                                            height: 14,
                                            borderTop: "3px solid #4ade80",
                                            borderLeft: "3px solid #4ade80",
                                        }}
                                    />
                                    <div
                                        style={{
                                            width: 14,
                                            height: 14,
                                            borderTop: "3px solid #4ade80",
                                            borderRight: "3px solid #4ade80",
                                        }}
                                    />
                                </div>

                                <div style={{ textAlign: "center" }}>
                                    <span
                                        style={{
                                            fontSize: 10,
                                            fontWeight: 800,
                                            background:
                                                "rgba(22, 163, 74, 0.9)",
                                            color: "#fff",
                                            padding: "3px 8px",
                                            borderRadius: 4,
                                            letterSpacing: "0.04em",
                                        }}
                                    >
                                        🎯 Position Scale LED Here
                                    </span>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 14,
                                            height: 14,
                                            borderBottom: "3px solid #4ade80",
                                            borderLeft: "3px solid #4ade80",
                                        }}
                                    />
                                    <div
                                        style={{
                                            width: 14,
                                            height: 14,
                                            borderBottom: "3px solid #4ade80",
                                            borderRight: "3px solid #4ade80",
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })()}

                    <div
                        style={{
                            position: "absolute",
                            bottom: 12,
                            left: 12,
                            right: 12,
                            display: "flex",
                            justifyContent: "center",
                            gap: 10,
                        }}
                    >
                        <button
                            onClick={handleCaptureAndDetect}
                            disabled={isCapturing || isDetecting}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "10px 22px",
                                fontSize: 13,
                                fontWeight: 800,
                                background: "#22c55e",
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                cursor:
                                    isCapturing || isDetecting
                                        ? "wait"
                                        : "pointer",
                                boxShadow: "0 4px 14px rgba(34,197,94,0.4)",
                            }}
                        >
                            {isCapturing || isDetecting ? (
                                <>
                                    <RotateCw
                                        size={16}
                                        style={{
                                            animation:
                                                "spin 1s linear infinite",
                                        }}
                                    />
                                    Processing Photo...
                                </>
                            ) : (
                                <>
                                    <Camera size={16} /> 📸 Capture LED Photo
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div
                    style={{
                        background: "#1e293b",
                        borderRadius: 10,
                        border: "1px solid #334155",
                        padding: 14,
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <h4
                        style={{
                            margin: "0 0 10px",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#f8fafc",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <Sparkles size={14} style={{ color: "#38bdf8" }} /> Photo
                        Reading Result
                    </h4>

                    {capturedFrame ? (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                                flex: 1,
                            }}
                        >
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: 8,
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            fontSize: 10,
                                            color: "#94a3b8",
                                            marginBottom: 4,
                                            fontWeight: 600,
                                        }}
                                    >
                                        Original Cropped Photo
                                    </div>
                                    <img
                                        src={capturedFrame}
                                        alt="Cropped Frame"
                                        style={{
                                            width: "100%",
                                            height: 100,
                                            objectFit: "contain",
                                            background: "#000",
                                            borderRadius: 6,
                                            border: "1px solid #475569",
                                        }}
                                    />
                                </div>
                                <div>
                                    <div
                                        style={{
                                            fontSize: 10,
                                            color: "#38bdf8",
                                            marginBottom: 4,
                                            fontWeight: 600,
                                        }}
                                    >
                                        Precision Detection
                                    </div>
                                    {spectrumData?.spectrum_processed_image ? (
                                        <img
                                            src={
                                                spectrumData.spectrum_processed_image
                                            }
                                            alt="Mask Processed"
                                            style={{
                                                width: "100%",
                                                height: 100,
                                                objectFit: "contain",
                                                background: "#000",
                                                borderRadius: 6,
                                                border: "1px solid #0284c7",
                                            }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                width: "100%",
                                                height: 100,
                                                background: "#090d16",
                                                borderRadius: 6,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: "#64748b",
                                                fontSize: 10,
                                            }}
                                        >
                                            {isDetecting
                                                ? "Processing..."
                                                : "LED Mark"}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div
                                style={{
                                    background: "#0f172a",
                                    borderRadius: 8,
                                    padding: 12,
                                    border: "1px solid #334155",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "#94a3b8",
                                        marginBottom: 4,
                                    }}
                                >
                                    Reading Result Number:
                                </div>
                                {isCorrecting ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 6,
                                            alignItems: "center",
                                        }}
                                    >
                                        <input
                                            type="number"
                                            value={confirmedWeightInput}
                                            onChange={(e) =>
                                                setConfirmedWeightInput(
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Type weight number..."
                                            autoFocus
                                            style={{
                                                width: "100%",
                                                background: "#1e293b",
                                                border: "1px solid #3b82f6",
                                                color: "#fff",
                                                padding: "6px 10px",
                                                borderRadius: 6,
                                                fontSize: 16,
                                                fontWeight: 800,
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "baseline",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 24,
                                                fontWeight: 900,
                                                color:
                                                    confirmedWeightInput !== "0"
                                                        ? "#4ade80"
                                                        : "#f59e0b",
                                            }}
                                        >
                                            {confirmedWeightInput || "0"}{" "}
                                            <span
                                                style={{
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                kg
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setIsCorrecting(true)}
                                            style={{
                                                fontSize: 11,
                                                color: "#38bdf8",
                                                background: "none",
                                                border: "none",
                                                cursor: "pointer",
                                                textDecoration: "underline",
                                                padding: 0,
                                            }}
                                        >
                                            ✏️ Edit Number
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleSaveCapturedToDataset}
                                disabled={isSaving}
                                style={{
                                    marginTop: "auto",
                                    width: "100%",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 8,
                                    padding: "10px 14px",
                                    fontSize: 12,
                                    fontWeight: 800,
                                    background: isSaving
                                        ? "#64748b"
                                        : "#16a34a",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 8,
                                    cursor: isSaving ? "wait" : "pointer",
                                    boxShadow:
                                        "0 4px 12px rgba(22,163,74,0.3)",
                                }}
                            >
                                {isSaving ? (
                                    <>
                                        <RotateCw
                                            size={15}
                                            style={{
                                                animation:
                                                    "spin 1s linear infinite",
                                            }}
                                        />
                                        Saving Sample Photo...
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} />
                                        💾 Save Sample & Update System
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div
                            style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#64748b",
                                padding: "30px 10px",
                                textAlign: "center",
                                border: "2px dashed #334155",
                                borderRadius: 8,
                            }}
                        >
                            <Camera
                                size={32}
                                style={{
                                    color: "#475569",
                                    marginBottom: 8,
                                }}
                            />
                            <div
                                style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "#94a3b8",
                                }}
                            >
                                No photo captured yet
                            </div>
                            <div
                                style={{
                                    fontSize: 11,
                                    color: "#64748b",
                                    marginTop: 4,
                                }}
                            >
                                Position phone screen / scale within the green
                                frame, then click "📸 Capture LED Photo".
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
