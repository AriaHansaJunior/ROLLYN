import React from "react";
import { X } from "lucide-react";
import {
    JopOption,
    ProductionScheduleFormData,
} from "./ProductionSchedule_types";

interface Props {
    show: boolean;
    editId: number | null;
    form: ProductionScheduleFormData;
    setForm: React.Dispatch<React.SetStateAction<ProductionScheduleFormData>>;
    formErrors: Record<string, string>;
    setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    selectedJop: JopOption | null;
    handleJopsIdChange: (id: string) => void;
    saving: boolean;
    onClose: () => void;
    onSave: () => void;
    jops: JopOption[];
    previewProductionHours: number | null;
    previewStopTime: string | null;
}

export default function ProductionSchedule_FormModal({
    show,
    editId,
    form,
    setForm,
    formErrors,
    setFormErrors,
    selectedJop,
    handleJopsIdChange,
    saving,
    onClose,
    onSave,
    jops,
    previewProductionHours,
    previewStopTime,
}: Props) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">
                            {editId
                                ? "Edit Production Schedule"
                                : "New Production Schedule"}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Select an SPK — existing data will populate
                            automatically
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto">
                    {/* SPK Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            SPK <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={form.jops_id}
                            onChange={(e) =>
                                handleJopsIdChange(e.target.value)
                            }
                            className={`form-input w-full ${formErrors.jops_id ? "border-red-500" : ""}`}
                        >
                            <option value="">-- Select SPK --</option>
                            {jops.map((j) => (
                                <option key={j.id} value={j.id}>
                                    {j.spk} — {j.jop}
                                    {j.customer
                                        ? ` (${j.customer})`
                                        : ""}
                                </option>
                            ))}
                        </select>
                        {formErrors.jops_id && (
                            <p className="text-red-600 text-[11px] mt-1">
                                {formErrors.jops_id}
                            </p>
                        )}
                    </div>

                    {/* Auto-populated info */}
                    {selectedJop && (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                            <div>
                                <div className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">
                                    PO
                                </div>
                                <div className="font-mono font-bold text-slate-800">
                                    {selectedJop.po || "-"}
                                </div>
                            </div>
                            <div>
                                <div className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">
                                    Grade
                                </div>
                                <div className="font-bold text-slate-800">
                                    {selectedJop.grade || "-"}
                                </div>
                            </div>
                            <div>
                                <div className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">
                                    GSM
                                </div>
                                <div className="font-bold text-slate-800">
                                    {selectedJop.gsm || "-"}
                                </div>
                            </div>
                            <div>
                                <div className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">
                                    Plybond
                                </div>
                                <div className="font-bold text-slate-800">
                                    {selectedJop.plybond || "-"}
                                </div>
                            </div>
                            <div>
                                <div className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">
                                    Thickness
                                </div>
                                <div className="font-bold text-slate-800">
                                    {selectedJop.thickness || "-"}
                                </div>
                            </div>
                            <div>
                                <div className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">
                                    Core
                                </div>
                                <div className="font-bold text-slate-800">
                                    {selectedJop.core || "-"}
                                </div>
                            </div>
                            <div className="col-span-1 sm:col-span-4">
                                <div className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">
                                    Customer
                                </div>
                                <div className="font-bold text-slate-800">
                                    {selectedJop.customer || "-"}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tonnage + Rewinder Cut */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Tonnage (MT){" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={form.tonnage}
                                onChange={(e) => {
                                    setForm((f) => ({
                                        ...f,
                                        tonnage: e.target.value,
                                    }));
                                    if (formErrors.tonnage)
                                        setFormErrors((er) => ({
                                            ...er,
                                            tonnage: "",
                                        }));
                                }}
                                className={`form-input w-full ${formErrors.tonnage ? "border-red-500" : ""}`}
                                placeholder="e.g. 59"
                            />
                            {formErrors.tonnage && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {formErrors.tonnage}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Rewinder Cut
                            </label>
                            <input
                                type="text"
                                value={form.rewinder_cut}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        rewinder_cut: e.target.value,
                                    }))
                                }
                                className="form-input w-full"
                                placeholder="e.g. (1120 x 3) + 1140"
                            />
                        </div>
                    </div>

                    {/* TPH + Production Hours */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                TPH (Ton/Hour){" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={form.tph}
                                onChange={(e) => {
                                    setForm((f) => ({
                                        ...f,
                                        tph: e.target.value,
                                    }));
                                    if (formErrors.tph)
                                        setFormErrors((er) => ({
                                            ...er,
                                            tph: "",
                                        }));
                                }}
                                className={`form-input w-full ${formErrors.tph ? "border-red-500" : ""}`}
                                placeholder="e.g. 20"
                            />
                            {formErrors.tph && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {formErrors.tph}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Production Hours{" "}
                            </label>
                            <div
                                className={`form-input w-full font-bold bg-slate-50 select-none ${previewProductionHours !== null ? "text-blue-700" : "text-slate-400"}`}
                            >
                                {previewProductionHours !== null
                                    ? `${previewProductionHours} hour(s)`
                                    : "—"}
                            </div>
                            {previewProductionHours !== null && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    ceil({form.tonnage} ÷ {form.tph}) ={" "}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Start + Stop */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Start{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={form.start_time}
                                onChange={(e) => {
                                    setForm((f) => ({
                                        ...f,
                                        start_time: e.target.value,
                                    }));
                                    if (formErrors.start_time)
                                        setFormErrors((er) => ({
                                            ...er,
                                            start_time: "",
                                        }));
                                }}
                                className={`form-input w-full ${formErrors.start_time ? "border-red-500" : ""}`}
                            />
                            {formErrors.start_time && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {formErrors.start_time}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Stop{" "}
                            </label>
                            <input
                                type="datetime-local"
                                value={previewStopTime || ""}
                                readOnly
                                className="form-input w-full bg-slate-50 text-slate-600 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* Remark */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Remark
                        </label>
                        <textarea
                            value={form.remark}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    remark: e.target.value,
                                }))
                            }
                            className="form-input w-full resize-none"
                            rows={2}
                            placeholder="Optional notes..."
                        />
                    </div>

                    {/* Status (Edit only) */}
                    {editId && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Schedule Status
                            </label>
                            <div className="flex items-center gap-3">
                                <label
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                                        form.status === "OPEN"
                                            ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="sched_status"
                                        value="OPEN"
                                        checked={form.status === "OPEN"}
                                        onChange={() =>
                                            setForm((f) => ({
                                                ...f,
                                                status: "OPEN",
                                            }))
                                        }
                                        className="text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span>OPEN</span>
                                </label>
                                <label
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                                        form.status === "CLOSED"
                                            ? "bg-red-50 border-red-300 text-red-800"
                                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="sched_status"
                                        value="CLOSED"
                                        checked={form.status === "CLOSED"}
                                        onChange={() =>
                                            setForm((f) => ({
                                                ...f,
                                                status: "CLOSED",
                                            }))
                                        }
                                        className="text-red-600 focus:ring-red-500"
                                    />
                                    <span>CLOSED</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary cursor-pointer"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        className="btn btn-primary cursor-pointer"
                        disabled={saving}
                    >
                        {saving
                            ? "Saving..."
                            : editId
                              ? "Update Schedule"
                              : "Create Schedule"}
                    </button>
                </div>
            </div>
        </div>
    );
}
