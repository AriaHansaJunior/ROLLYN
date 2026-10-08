import React from "react";
import {
    RefreshCw,
    AlertCircle,
    Check,
    Layers,
    Search,
} from "lucide-react";
import WeightDetectionEngine from "../../SPECTRUM/SpectrumWeightDetectionEngine";
import { SystemUI } from "@/Utils/SystemUI";
import { SCALE_ROI, IncomingRollFormState } from "./IncomingRoll_types";

interface Step0WeightDetectionProps {
    onWeightConfirmed: (
        value: number,
        display: string,
        source: "ocr" | "spectrum" | "manual",
    ) => void;
    form: IncomingRollFormState;
    setForm: React.Dispatch<React.SetStateAction<IncomingRollFormState>>;
    recommendedRoll: string;
    isCheckingDuplicate: boolean;
    duplicateWarning: any;
    jopList: any[];
    jopSearch: string;
    setJopSearch: (val: string) => void;
    handleJopSelect: (jop: string) => void;
}

export default function IncomingRoll_S1WeightDetection({
    onWeightConfirmed,
    form,
    setForm,
    recommendedRoll,
    isCheckingDuplicate,
    duplicateWarning,
    jopList,
    jopSearch,
    setJopSearch,
    handleJopSelect,
}: Step0WeightDetectionProps) {
    return (
        <div className="space-y-4">
            <WeightDetectionEngine
                onWeightConfirmed={onWeightConfirmed}
                roi={SCALE_ROI}
            />

            {/* Anti-Salah Quick Roll Number & Barcode Verification Card */}
            <div className="card p-3.5 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 border border-blue-200/80 rounded-xl shadow-xs">
                {recommendedRoll && (
                    <div className="mb-2 flex items-center justify-between px-0.5">
                        {form.rollNumber !== recommendedRoll && (
                            <button
                                type="button"
                                onClick={() =>
                                    setForm((f) => ({
                                        ...f,
                                        rollNumber: recommendedRoll,
                                    }))
                                }
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                                Use Recommended
                            </button>
                        )}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                        type="text"
                        value={form.rollNumber}
                        onChange={(e) =>
                            setForm((f) => ({
                                ...f,
                                rollNumber: e.target.value,
                            }))
                        }
                        placeholder="Scan camera barcode / type roll number (e.g. R-10425)..."
                        className="form-input text-xs flex-1 bg-white font-mono"
                    />
                    {form.rollNumber.trim() && (
                        <div className="shrink-0 flex items-center gap-1.5">
                            {isCheckingDuplicate ? (
                                <span className="text-xs text-slate-500 flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 rounded-lg">
                                    <RefreshCw
                                        size={12}
                                        className="animate-spin"
                                    />{" "}
                                    Checking...
                                </span>
                            ) : duplicateWarning ? (
                                <span className="text-xs font-bold text-red-700 flex items-center gap-1 px-2.5 py-1.5 bg-red-100 border border-red-200 rounded-lg">
                                    <AlertCircle size={13} /> DUPLICATE
                                    DETECTED
                                </span>
                            ) : (
                                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 px-2.5 py-1.5 bg-emerald-100 border border-emerald-200 rounded-lg">
                                    <Check size={13} /> ROLL NUMBER VALID
                                </span>
                            )}
                        </div>
                    )}
                </div>
                {duplicateWarning && (
                    <div className="mt-2 text-[11px] text-red-700 bg-white/95 p-2.5 rounded-lg border border-red-200 flex items-start gap-1.5">
                        <AlertCircle
                            size={14}
                            className="shrink-0 mt-0.5 text-red-600"
                        />
                        <div>
                            <strong className="block font-bold">
                                ⚠️ ANTI-DUPLICATE WARNING:
                            </strong>
                            <span>{duplicateWarning.message}</span>
                            <div className="text-[10px] text-red-600 mt-0.5 font-medium">
                                Database record: Grade{" "}
                                {duplicateWarning.roll?.grade} | GSM{" "}
                                {duplicateWarning.roll?.gsm} | Shift{" "}
                                {duplicateWarning.roll?.shift} | Date:{" "}
                                {duplicateWarning.roll?.entry_date} | Status:{" "}
                                {duplicateWarning.roll?.status}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Active Incomplete JOPs Target Tracker */}
            <div className="card p-4 space-y-3 bg-white border border-slate-200 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold shrink-0">
                            <Layers size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                    Incomplete JOP List (Production Target)
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                                    {
                                        (jopList || []).filter(
                                            (j: any) =>
                                                !j.production_estimation
                                                    ?.is_completed,
                                        ).length
                                    }{" "}
                                    Active JOPs
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                                Monitor the remaining rolls needed to complete
                                each Job Order Production
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs w-full sm:w-64">
                            <Search
                                size={14}
                                className="text-slate-400 shrink-0"
                            />
                            <input
                                type="text"
                                value={jopSearch}
                                onChange={(e) => setJopSearch(e.target.value)}
                                placeholder="Search JOP, SPK, Customer..."
                                className="bg-transparent border-none outline-none text-xs w-full text-slate-800 placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Incomplete JOPs Table */}
                <div className="overflow-x-auto">
                    <table className="data-table w-full text-xs">
                        <thead>
                            <tr>
                                <th style={{ textAlign: "left" }}>
                                    JOP Number
                                </th>
                                <th style={{ textAlign: "center" }}>SPK</th>
                                <th style={{ textAlign: "center" }}>
                                    Customer
                                </th>
                                <th style={{ textAlign: "center" }}>
                                    Grade / GSM
                                </th>
                                <th style={{ textAlign: "center" }}>
                                    Target Tonnage
                                </th>
                                <th style={{ textAlign: "center" }}>
                                    Actual Prod
                                </th>
                                <th style={{ textAlign: "center" }}>
                                    Remaining
                                </th>
                                <th style={{ textAlign: "center" }}>TPH</th>
                                <th style={{ textAlign: "center" }}>
                                    Est. Duration
                                </th>
                                <th style={{ textAlign: "center" }}>
                                    Est. Finish
                                </th>
                                <th style={{ textAlign: "center" }}>
                                    Select JOP
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const incomplete = (jopList || [])
                                    .map((j: any) => {
                                        const est =
                                            j.production_estimation || {};

                                        // Calculate Actual Tonnage from rolls (in kg / 1000)
                                        const actualWeightKg = j.rolls
                                            ? j.rolls.reduce(
                                                  (
                                                      sum: number,
                                                      r: any,
                                                  ) =>
                                                      sum +
                                                      (Number(r.weight) || 0),
                                                  0,
                                              )
                                            : 0;
                                        const actualTonnage =
                                            actualWeightKg / 1000;

                                        // Target Tonnage from Production Schedule (est.target_tonnage) or fallback
                                        const targetTonnageNum =
                                            est.target_tonnage &&
                                            est.target_tonnage !== "-"
                                                ? Number(est.target_tonnage)
                                                : (Number(j.weight) || 0) /
                                                  1000;

                                        const remainingTonnage =
                                            targetTonnageNum > 0
                                                ? Math.max(
                                                      0,
                                                      targetTonnageNum -
                                                          actualTonnage,
                                                  )
                                                : 0;

                                        const isCompleted =
                                            est.is_completed !== undefined
                                                ? est.is_completed
                                                : (targetTonnageNum > 0 &&
                                                      remainingTonnage <= 0) ||
                                                  (j.rolls
                                                      ? j.rolls.length
                                                      : 0) >=
                                                      (Number(j.quantity) || 1);

                                        return {
                                            ...j,
                                            est: {
                                                ...est,
                                                target_tonnage:
                                                    targetTonnageNum > 0
                                                        ? targetTonnageNum.toFixed(
                                                              2,
                                                          )
                                                        : est.target_tonnage ||
                                                          "-",
                                                actual_tonnage:
                                                    actualTonnage.toFixed(2),
                                                remaining_tonnage:
                                                    targetTonnageNum > 0
                                                        ? remainingTonnage.toFixed(
                                                              2,
                                                          )
                                                        : "-",
                                                tph:
                                                    est.tph ||
                                                    (j.tph
                                                        ? String(j.tph)
                                                        : "-"),
                                            },
                                            isCompleted,
                                        };
                                    })
                                    .filter((j: any) => !j.isCompleted)
                                    .filter((j: any) => {
                                        if (!jopSearch.trim()) return true;
                                        const q = jopSearch.toLowerCase();
                                        return (
                                            (j.jop || "")
                                                .toLowerCase()
                                                .includes(q) ||
                                            (j.spk || "")
                                                .toLowerCase()
                                                .includes(q) ||
                                            (j.po || "")
                                                .toLowerCase()
                                                .includes(q) ||
                                            (j.customer?.customer || "")
                                                .toLowerCase()
                                                .includes(q) ||
                                            (j.grade?.grade || "")
                                                .toLowerCase()
                                                .includes(q)
                                        );
                                    });

                                if (incomplete.length === 0) {
                                    return (
                                        <tr>
                                            <td
                                                colSpan={11}
                                                className="text-center py-6 text-slate-400"
                                            >
                                                {jopSearch
                                                    ? "No JOPs matched your search."
                                                    : "All JOP targets have been completed 100%!"}
                                            </td>
                                        </tr>
                                    );
                                }

                                return incomplete.map((j: any) => {
                                    const isSelected = form.jop === j.jop;
                                    return (
                                        <tr
                                            key={j.id || j.jop}
                                            className={`hover:bg-slate-50 transition-colors ${
                                                isSelected
                                                    ? "bg-blue-50/60 font-semibold"
                                                    : ""
                                            }`}
                                        >
                                            <td
                                                className="font-bold text-blue-700 font-mono text-xs"
                                                style={{ textAlign: "left" }}
                                            >
                                                {j.jop}
                                            </td>
                                            <td
                                                className="font-mono text-slate-600"
                                                style={{ textAlign: "center" }}
                                            >
                                                {j.spk || "-"}
                                            </td>
                                            <td
                                                className="text-slate-800"
                                                style={{ textAlign: "center" }}
                                            >
                                                {j.customer?.customer ||
                                                    j.customer ||
                                                    "-"}
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <span className="font-medium text-slate-900">
                                                    {j.grade?.grade ||
                                                        j.grade ||
                                                        "-"}
                                                </span>
                                                <span className="text-slate-400 mx-1">
                                                    /
                                                </span>
                                                <span className="text-slate-600">
                                                    {j.gsm?.gsm ||
                                                        j.gsm ||
                                                        "-"}{" "}
                                                    g/m²
                                                </span>
                                            </td>
                                            <td
                                                className="font-semibold text-slate-700"
                                                style={{ textAlign: "center" }}
                                            >
                                                {j.est?.target_tonnage &&
                                                j.est.target_tonnage !== "-"
                                                    ? `${j.est.target_tonnage} Ton`
                                                    : "-"}
                                            </td>
                                            <td
                                                className="font-bold text-slate-900"
                                                style={{ textAlign: "center" }}
                                            >
                                                {j.est?.actual_tonnage ??
                                                    "0.00"}{" "}
                                                Ton
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-extrabold text-[11px] bg-amber-100 text-amber-800 border border-amber-200">
                                                    Remaining{" "}
                                                    {j.est?.remaining_tonnage &&
                                                    j.est.remaining_tonnage !==
                                                        "-"
                                                        ? `${j.est.remaining_tonnage} Ton`
                                                        : "-"}
                                                </span>
                                            </td>
                                            <td
                                                className="font-semibold text-slate-700"
                                                style={{ textAlign: "center" }}
                                            >
                                                {j.est?.tph ?? "-"}
                                            </td>
                                            <td
                                                className="font-mono text-slate-700"
                                                style={{ textAlign: "center" }}
                                            >
                                                {j.est
                                                    ?.estimated_duration_formatted ??
                                                    "N/A"}
                                            </td>
                                            <td
                                                className="font-mono text-slate-900 text-[11px]"
                                                style={{ textAlign: "center" }}
                                            >
                                                {j.est?.estimated_finish_time ??
                                                    "N/A"}
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <button
                                                    onClick={() => {
                                                        handleJopSelect(j.jop);
                                                        SystemUI.toast({
                                                            message: `JOP ${j.jop} selected for roll input!`,
                                                            type: "success",
                                                        });
                                                    }}
                                                    className={`btn btn-sm text-xs py-1 px-2.5 cursor-pointer flex items-center gap-1 mx-auto ${
                                                        isSelected
                                                            ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                                                            : "btn-primary"
                                                    }`}
                                                    title="Select this JOP to fill in Form Data"
                                                >
                                                    {isSelected ? (
                                                        <>
                                                            <Check size={12} />
                                                            <span>Selected</span>
                                                        </>
                                                    ) : (
                                                        <span>Select</span>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
