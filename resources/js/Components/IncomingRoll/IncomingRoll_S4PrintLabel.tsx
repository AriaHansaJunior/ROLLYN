import React from "react";
import { Clock, ArrowLeft, Printer, RefreshCw } from "lucide-react";
import QRCodeSVG from "@/Components/QRCodeSVG";
import { WeightState, IncomingRollFormState } from "./IncomingRoll_types";

interface Step3PrintLabelProps {
    weight: WeightState;
    form: IncomingRollFormState;
    onEdit: () => void;
    onRegisterNewRoll: () => void;
}

export default function IncomingRoll_S4PrintLabel({
    weight,
    form,
    onEdit,
    onRegisterNewRoll,
}: Step3PrintLabelProps) {
    return (
        <div className="w-full space-y-4">
            <style>{`
                @media print {
                    @page {
                        size: auto;
                        margin: 5mm;
                    }
                    
                    /* Reset page structure */
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        overflow: hidden !important;
                    }

                    /* Hide ALL background/layout elements */
                    body * {
                        visibility: hidden !important;
                    }

                    /* Show ONLY the label and its children */
                    #printable-roll-label, #printable-roll-label * {
                        visibility: visible !important;
                    }
                    
                    /* Label fills paper width, starts from top */
                    #printable-roll-label {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        box-sizing: border-box !important;
                        
                        border: 2px solid #0f172a !important;
                        border-radius: 10px !important;
                        background: white !important;
                        padding: 14px 20px !important;
                        font-family: Arial, sans-serif !important;
                    }

                    /* --- STYLING HEADER --- */
                    #printable-roll-label #label-header {
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        border-bottom: 2px solid #0f172a !important;
                        padding-bottom: 8px !important;
                        margin-bottom: 12px !important;
                    }
                    #printable-roll-label #label-header .logo-area {
                        display: flex !important;
                        align-items: center !important;
                        gap: 8px !important;
                    }
                    #printable-roll-label #label-header .logo-box {
                        width: 28px !important;
                        height: 28px !important;
                        background: #1d4ed8 !important;
                        color: white !important;
                        font-weight: 900 !important;
                        font-size: 14px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        border-radius: 6px !important;
                    }
                    #printable-roll-label #label-header .logo-text {
                        font-size: 18px !important;
                        font-weight: 900 !important;
                        color: #0f172a !important;
                        letter-spacing: 1px !important;
                    }
                    #printable-roll-label #label-header .label-title {
                        font-size: 12px !important;
                        font-weight: 800 !important;
                        color: #0f172a !important;
                        letter-spacing: 0.5px !important;
                        text-transform: uppercase !important;
                    }

                    /* --- STYLING BODY --- */
                    #printable-roll-label #label-body {
                        display: flex !important;
                        flex-direction: row !important;
                        gap: 20px !important;
                        align-items: flex-start !important;
                    }
                    #printable-roll-label #label-specs {
                        flex: 1 !important;
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 5px !important; 
                    }
                    #printable-roll-label .spec-row {
                        display: flex !important;
                        flex-direction: row !important;
                        align-items: baseline !important;
                        gap: 0 !important;
                    }
                    #printable-roll-label .spec-label {
                        font-size: 11px !important;
                        font-weight: 700 !important;
                        color: #64748b !important;
                        width: 100px !important; 
                        flex-shrink: 0 !important;
                    }
                    #printable-roll-label .spec-value {
                        font-size: 12px !important;
                        font-weight: 700 !important;
                        color: #0f172a !important;
                    }
                    #printable-roll-label .spec-value.highlight {
                        font-size: 14px !important;
                        font-weight: 900 !important;
                        color: #1e3a8a !important;
                    }

                    /* --- STYLING QR CODE --- */
                    #printable-roll-label #label-qr {
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        gap: 5px !important;
                        flex-shrink: 0 !important;
                        width: 150px !important;
                        border: 2px solid #e2e8f0 !important;
                        padding: 10px !important;
                        border-radius: 10px !important;
                    }
                    #printable-roll-label #label-qr svg {
                        width: 120px !important;
                        height: 120px !important;
                    }
                    #printable-roll-label #label-qr .qr-caption {
                        font-size: 9px !important;
                        font-weight: 800 !important;
                        color: #64748b !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.5px !important;
                        text-align: center !important;
                        margin-top: 3px !important;
                    }
                }
            `}</style>
            <div className="card p-4 sm:p-8 flex flex-col items-center justify-center space-y-6">
                {/* Printable Roll Identification Label */}
                <div
                    id="printable-roll-label"
                    className="w-full max-w-3xl bg-white border-2 border-slate-900 rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg text-slate-900 font-sans"
                >
                    {/* Label Header */}
                    <div
                        id="label-header"
                        className="flex flex-col lg:flex-row items-center justify-between border-b-2 border-slate-900 pb-4 mb-5 gap-3 lg:gap-0 text-center lg:text-left"
                    >
                        <div className="logo-area flex items-center gap-2.5">
                            <div className="logo-box w-9 h-9 rounded-lg bg-blue-700 text-white font-black text-sm flex items-center justify-center">
                                R
                            </div>
                            <span className="logo-text font-extrabold text-xl tracking-wider text-slate-900">
                                ROLLYN
                            </span>
                        </div>
                        <span className="label-title font-extrabold text-sm tracking-wider text-slate-900 uppercase">
                            PRODUCTION IDENTIFICATION LABEL
                        </span>
                    </div>

                    {/* Label Body: Specs + QR Side by Side */}
                    <div
                        id="label-body"
                        className="flex flex-col lg:flex-row gap-6 items-center lg:items-start w-full"
                    >
                        {/* Specifications list */}
                        <div
                            id="label-specs"
                            className="w-full lg:flex-1 flex flex-col gap-2.5 text-sm"
                        >
                            <div className="spec-row flex gap-0">
                                <span className="spec-label font-bold text-slate-500 w-32 shrink-0">
                                    ROLL ID:
                                </span>{" "}
                                <span className="spec-value font-extrabold text-slate-900 font-mono text-base">
                                    {form.rollNumber || "104"}
                                </span>
                            </div>
                            <div className="spec-row flex gap-0">
                                <span className="spec-label font-bold text-slate-500 w-32 shrink-0">
                                    Grade:
                                </span>{" "}
                                <span className="spec-value font-bold text-slate-900">
                                    {form.grade || "SPECTA - TK4"}
                                </span>
                            </div>
                            <div className="spec-row flex gap-0">
                                <span className="spec-label font-bold text-slate-500 w-32 shrink-0">
                                    Job Order:
                                </span>{" "}
                                <span className="spec-value font-bold text-slate-900 font-mono">
                                    {form.jop || "JOP-0726-00028"}
                                </span>
                            </div>
                            <div className="spec-row flex gap-0">
                                <span className="spec-label font-bold text-slate-500 w-32 shrink-0">
                                    Jumbo Roll:
                                </span>{" "}
                                <span className="spec-value font-bold text-slate-900 font-mono">
                                    {form.jumboRoll || "-"}
                                </span>
                            </div>
                            <div className="spec-row flex gap-0">
                                <span className="spec-label font-bold text-slate-500 w-32 shrink-0">
                                    Thickness:
                                </span>{" "}
                                <span className="spec-value font-semibold text-slate-900">
                                    {form.thickness
                                        ? `${form.thickness} mm`
                                        : "155 mm"}
                                </span>
                            </div>
                            <div className="spec-row flex gap-0">
                                <span className="spec-label font-bold text-slate-500 w-32 shrink-0">
                                    Roll Width:
                                </span>{" "}
                                <span className="spec-value font-semibold text-slate-900">
                                    {form.width
                                        ? `${form.width} mm`
                                        : "1650 mm"}
                                </span>
                            </div>
                            <div className="spec-row flex gap-0">
                                <span className="spec-label font-bold text-slate-500 w-32 shrink-0">
                                    Weight:
                                </span>{" "}
                                <span className="spec-value highlight font-extrabold text-blue-900 font-mono text-base">
                                    {weight.display || "1,044"} kg
                                </span>
                            </div>
                            <div className="spec-row flex gap-0">
                                <span className="spec-label font-bold text-slate-500 w-32 shrink-0">
                                    Core Size:
                                </span>{" "}
                                <span className="spec-value font-semibold text-slate-900">
                                    {form.core || "76"} mm
                                </span>
                            </div>
                            <div className="spec-row flex gap-0">
                                <span className="spec-label font-bold text-slate-500 w-32 shrink-0">
                                    Visual Status:
                                </span>{" "}
                                <span className="spec-value font-bold text-slate-900">
                                    {form.visual || "OK"}
                                </span>
                            </div>
                            <div className="spec-row flex gap-0">
                                <span className="spec-label font-bold text-slate-500 w-32 shrink-0">
                                    PIC:
                                </span>{" "}
                                <span className="spec-value font-semibold text-slate-900 uppercase">
                                    {form.pic || "Budi"}
                                </span>
                            </div>
                        </div>

                        {/* Dynamic QR Code */}
                        <div
                            id="label-qr"
                            className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200 shrink-0 w-[200px]"
                        >
                            <QRCodeSVG
                                value={JSON.stringify({
                                    roll: form.rollNumber || "104",
                                    jumbo: form.jumboRoll || undefined,
                                    grade: form.grade || "SPECTA-TK4",
                                    jop: form.jop || "JOP-0726-00028",
                                    weight: weight.display || "1044",
                                    width: form.width || "1650",
                                    thickness: form.thickness || "155",
                                    core: form.core || "76",
                                    pic: form.pic || "Budi",
                                })}
                                size={180}
                            />
                            <span className="qr-caption text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-3 text-center">
                                ATTACH TO ROLL CORE
                            </span>
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                {form.status === "HOLD" && (
                    <div className="w-full bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-4 flex items-center justify-center gap-2">
                        <Clock size={18} className="text-amber-600" />
                        <span className="font-semibold text-sm">
                            Current Roll status is HOLD. Final label can only be
                            printed after specification is confirmed by QC.
                        </span>
                    </div>
                )}
                <div className="flex flex-wrap gap-3 justify-center pt-2">
                    <button
                        className="btn btn-secondary btn-md flex items-center gap-2 px-6 py-2.5 font-semibold cursor-pointer"
                        onClick={onEdit}
                    >
                        <ArrowLeft size={16} /> <span>Edit Data</span>
                    </button>
                    <button
                        className="btn btn-primary btn-md flex items-center gap-2 px-6 py-2.5 font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => window.print()}
                        disabled={form.status === "HOLD"}
                    >
                        <Printer size={16} /> <span>Print Label</span>
                    </button>
                    <button
                        className="btn btn-secondary btn-md flex items-center gap-2 px-6 py-2.5 font-semibold cursor-pointer"
                        onClick={onRegisterNewRoll}
                    >
                        <RefreshCw size={16} /> <span>Register New Roll</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
