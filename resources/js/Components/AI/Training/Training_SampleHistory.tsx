import React from "react";
import { Layers, RotateCw, Database } from "lucide-react";
import { DatasetStats, strToBool } from "./Training_types";

interface Props {
    stats: DatasetStats | null;
    isLoadingStats: boolean;
    fetchStats: () => void;
    setSelectedImage: (img: string | null) => void;
}

export default function Training_SampleHistory({
    stats,
    isLoadingStats,
    fetchStats,
    setSelectedImage,
}: Props) {
    return (
        <div
            style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <div
                style={{
                    padding: "14px 18px",
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                }}
            >
                <h3
                    style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#0f172a",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                    }}
                >
                    <Layers size={14} style={{ color: "#2563eb" }} />
                    Scale Photo Sample History
                    {stats?.total_samples != null && (
                        <span
                            style={{
                                marginLeft: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                background: "#dbeafe",
                                color: "#1e40af",
                                padding: "2px 7px",
                                borderRadius: 10,
                            }}
                        >
                            {stats.total_samples} samples
                        </span>
                    )}
                </h3>
                <button
                    onClick={fetchStats}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        color: "#475569",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        padding: "5px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                    }}
                >
                    <RotateCw
                        size={11}
                        style={{
                            animation: isLoadingStats
                                ? "spin 1s linear infinite"
                                : "none",
                        }}
                    />
                    Refresh
                </button>
            </div>

            <div style={{ overflowX: "auto", flex: 1 }}>
                {isLoadingStats ? (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "40px 0",
                            color: "#94a3b8",
                            gap: 8,
                        }}
                    >
                        <RotateCw
                            size={16}
                            style={{
                                animation: "spin 1s linear infinite",
                            }}
                        />
                        <span style={{ fontSize: 13 }}>
                            Loading sample data…
                        </span>
                    </div>
                ) : stats?.recent_entries && stats.recent_entries.length > 0 ? (
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: 12,
                        }}
                    >
                        <thead>
                            <tr
                                style={{
                                    background: "#f8fafc",
                                    borderBottom: "2px solid #e2e8f0",
                                }}
                            >
                                <th
                                    style={{
                                        padding: "10px 14px",
                                        textAlign: "left",
                                        fontWeight: 700,
                                        color: "#475569",
                                        fontSize: 10,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    Photo
                                </th>
                                <th
                                    style={{
                                        padding: "10px 14px",
                                        textAlign: "left",
                                        fontWeight: 700,
                                        color: "#475569",
                                        fontSize: 10,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                    }}
                                >
                                    File Name
                                </th>
                                <th
                                    style={{
                                        padding: "10px 14px",
                                        textAlign: "center",
                                        fontWeight: 700,
                                        color: "#475569",
                                        fontSize: 10,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    Operator Confirmation
                                </th>
                                <th
                                    style={{
                                        padding: "10px 14px",
                                        textAlign: "center",
                                        fontWeight: 700,
                                        color: "#475569",
                                        fontSize: 10,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    System Detection Result
                                </th>
                                <th
                                    style={{
                                        padding: "10px 14px",
                                        textAlign: "center",
                                        fontWeight: 700,
                                        color: "#475569",
                                        fontSize: 10,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                    }}
                                >
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recent_entries.map((row, idx) => {
                                const isCorr = strToBool(row.is_corrected);
                                const imgSrc = `/storage/dataset/images/${row.filename}`;
                                return (
                                    <tr
                                        key={idx}
                                        className="entry-row"
                                        style={{
                                            borderBottom: "1px solid #f1f5f9",
                                        }}
                                    >
                                        <td style={{ padding: "8px 14px" }}>
                                            <img
                                                src={imgSrc}
                                                alt={row.filename}
                                                className="preview-thumb"
                                                onClick={() =>
                                                    setSelectedImage(imgSrc)
                                                }
                                                onError={(e) => {
                                                    (
                                                        e.target as HTMLImageElement
                                                    ).src =
                                                        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="35" viewBox="0 0 50 35"><rect width="50" height="35" fill="%23f1f5f9"/><text x="25" y="20" font-size="9" text-anchor="middle" fill="%2394a3b8">No Image</text></svg>';
                                                }}
                                                style={{
                                                    width: 50,
                                                    height: 35,
                                                    objectFit: "cover",
                                                    borderRadius: 4,
                                                    border: "1px solid #cbd5e1",
                                                    background: "#f1f5f9",
                                                }}
                                            />
                                        </td>
                                        <td
                                            style={{
                                                padding: "8px 14px",
                                                fontFamily: "monospace",
                                                fontSize: 11,
                                                color: "#334155",
                                            }}
                                        >
                                            {row.filename}
                                        </td>
                                        <td
                                            style={{
                                                padding: "8px 14px",
                                                textAlign: "center",
                                                fontWeight: 800,
                                                color: "#16a34a",
                                                fontSize: 13,
                                            }}
                                        >
                                            {row.correct_weight}{" "}
                                            <span
                                                style={{
                                                    fontSize: 10,
                                                    fontWeight: 500,
                                                    color: "#64748b",
                                                }}
                                            >
                                                kg
                                            </span>
                                        </td>
                                        <td
                                            style={{
                                                padding: "8px 14px",
                                                textAlign: "center",
                                                fontFamily: "monospace",
                                                fontSize: 12,
                                                color: "#64748b",
                                            }}
                                        >
                                            {row.spectrum_predicted_weight ||
                                                "—"}{" "}
                                            kg
                                        </td>
                                        <td
                                            style={{
                                                padding: "8px 14px",
                                                textAlign: "center",
                                            }}
                                        >
                                            {isCorr ? (
                                                <span
                                                    style={{
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        background: "#fef3c7",
                                                        color: "#92400e",
                                                        padding: "3px 8px",
                                                        borderRadius: 99,
                                                    }}
                                                >
                                                    Corrected
                                                </span>
                                            ) : (
                                                <span
                                                    style={{
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        background: "#dcfce7",
                                                        color: "#166534",
                                                        padding: "3px 8px",
                                                        borderRadius: 99,
                                                    }}
                                                >
                                                    Matched
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "50px 20px",
                            textAlign: "center",
                        }}
                    >
                        <Database
                            size={36}
                            style={{ color: "#cbd5e1", marginBottom: 10 }}
                        />
                        <div
                            style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: "#64748b",
                                marginBottom: 4,
                            }}
                        >
                            No sample photos saved yet
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: "#94a3b8",
                                maxWidth: 360,
                            }}
                        >
                            Take scale photos via the live camera frame above or
                            upload photo files to start collecting samples.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
