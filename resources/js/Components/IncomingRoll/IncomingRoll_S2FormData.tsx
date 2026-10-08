import React from "react";
import {
    Scale,
    CheckCircle,
    Edit3,
    FileText,
    RefreshCw,
    AlertCircle,
    Layers,
    Clock,
    ArrowLeft,
    ArrowRight,
} from "lucide-react";
import {
    WeightState,
    JopOption,
    IncomingRollFormState,
    sanitizeNumeric,
    handleNumberKeyDown,
} from "./IncomingRoll_types";

interface Step1FormDataProps {
    weight: WeightState;
    form: IncomingRollFormState;
    setForm: React.Dispatch<React.SetStateAction<IncomingRollFormState>>;
    errors: Record<string, string>;
    setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    recommendedRoll: string;
    duplicateWarning: any;
    isCheckingDuplicate: boolean;
    jops: JopOption[];
    availableJumboRolls: any[];
    handleJopSelect: (jop: string) => void;
    onBack: () => void;
    onNext: () => void;
}

export default function IncomingRoll_S2FormData({
    weight,
    form,
    setForm,
    errors,
    setErrors,
    recommendedRoll,
    duplicateWarning,
    isCheckingDuplicate,
    jops,
    availableJumboRolls,
    handleJopSelect,
    onBack,
    onNext,
}: Step1FormDataProps) {
    return (
        <div className="w-full space-y-4 lg:space-y-6">
            {/* Weight Card Header */}
            <div className="card p-4">
                <div className="flex items-center justify-between gap-4 p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-xs text-white">
                            <Scale size={20} />
                        </div>
                        <div>
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                Confirmed Roll Weight
                            </div>
                            <div className="text-2xl font-extrabold text-blue-900 font-mono leading-tight">
                                {weight.display}{" "}
                                <span className="text-sm font-semibold text-slate-500">
                                    kg
                                </span>
                            </div>
                            <div className="text-[11px] mt-0.5 flex items-center gap-1.5">
                                {weight.source === "ocr" ? (
                                    <>
                                        <CheckCircle
                                            size={12}
                                            className="text-green-600 shrink-0"
                                        />
                                        <span className="text-green-700 font-semibold">
                                            Detected via OCR
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Edit3
                                            size={12}
                                            className="text-amber-600 shrink-0"
                                        />
                                        <span className="text-amber-700 font-semibold">
                                            Entered manually by administrator
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        className="btn btn-secondary btn-sm text-xs cursor-pointer shrink-0"
                        onClick={onBack}
                        title="Go back to re-detect weight"
                    >
                        Re-detect
                    </button>
                </div>
            </div>

            {/* Roll Data Entry Segments */}
            <div className="space-y-4">
                {/* Segment 1: Job Order & Auto-Filled Specifications */}
                <div className="card p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                        <FileText size={16} className="text-blue-600" />
                        <h3 className="text-sm font-bold text-slate-900">
                            Job Order & Specification (Auto-filled)
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                        {/* JOP Dropdown */}
                        <div>
                            <label className="form-label text-xs font-semibold block mb-1">
                                Job Order Production (JOP){" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.jop}
                                onChange={(e) => handleJopSelect(e.target.value)}
                                className={`form-input w-full ${errors.jop ? "border-red-500" : ""}`}
                            >
                                <option value="">-- Select JOP --</option>
                                {jops.map((j) => (
                                    <option
                                        key={j.id || j.jop}
                                        value={j.jop}
                                    >
                                        {j.jop}{" "}
                                        {typeof j.customer === "object" &&
                                        j.customer?.customer
                                            ? `(${j.customer.customer})`
                                            : typeof j.customer === "string"
                                              ? `(${j.customer})`
                                              : ""}
                                    </option>
                                ))}
                            </select>
                            {errors.jop && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {errors.jop}
                                </p>
                            )}
                            {form.jop &&
                                jops.find(
                                    (j) =>
                                        j.jop === form.jop ||
                                        String(j.id) === form.jop,
                                )?.noted_order && (
                                    <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-[11px] rounded border border-yellow-200 shadow-sm leading-snug">
                                        <strong>Note:</strong>{" "}
                                        {
                                            jops.find(
                                                (j) =>
                                                    j.jop === form.jop ||
                                                    String(j.id) === form.jop,
                                            )?.noted_order
                                        }
                                    </div>
                                )}
                        </div>

                        {/* Jumbo Roll Number */}
                        <div>
                            <label className="form-label text-xs font-semibold block mb-1 flex items-center justify-between">
                                <span>
                                    Jumbo Roll Number{" "}
                                    <span className="text-red-500">*</span>
                                </span>
                                <span className="text-[10px] text-blue-600 font-normal">
                                    (Auto from JOP / Editable)
                                </span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    list="jumbo-roll-datalist"
                                    value={form.jumboRoll}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const matched = availableJumboRolls.find(
                                            (jr) =>
                                                jr.jumbo_roll_number.toUpperCase() ===
                                                val.trim().toUpperCase(),
                                        );
                                        setForm((f) => ({
                                            ...f,
                                            jumboRoll: val,
                                            jumboRollId: matched ? matched.id : null,
                                        }));
                                        if (errors.jumboRoll) {
                                            setErrors((err) => ({
                                                ...err,
                                                jumboRoll: undefined,
                                            }));
                                        }
                                    }}
                                    placeholder="e.g. JR-0726-00001"
                                    className={`form-input w-full font-mono uppercase ${
                                        errors.jumboRoll ? "border-red-500" : ""
                                    }`}
                                />
                                <datalist id="jumbo-roll-datalist">
                                    {availableJumboRolls.map((jr) => (
                                        <option
                                            key={jr.id}
                                            value={jr.jumbo_roll_number}
                                        >
                                            {jr.jumbo_roll_number}{" "}
                                            {jr.status ? `(${jr.status})` : ""}{" "}
                                            {jr.weight ? `[${jr.weight} kg]` : ""}
                                        </option>
                                    ))}
                                </datalist>
                            </div>
                            {errors.jumboRoll ? (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {errors.jumboRoll}
                                </p>
                            ) : form.jumboRoll ? (
                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                    {availableJumboRolls.some(
                                        (jr) =>
                                            jr.jumbo_roll_number.toUpperCase() ===
                                            form.jumboRoll.trim().toUpperCase(),
                                    ) ? (
                                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                            <CheckCircle size={10} /> Registered in Master Jumbo
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                            ✨ Auto from JOP
                                        </span>
                                    )}
                                    {availableJumboRolls.length > 1 && (
                                        <span className="text-[10px] text-slate-500">
                                            ({availableJumboRolls.length} options available)
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <p className="text-slate-400 text-[10px] mt-1">
                                    Select JOP to auto-fill, or enter manually
                                </p>
                            )}
                        </div>

                        {/* Roll Number */}
                        <div>
                            {recommendedRoll && (
                                <div>
                                    {form.rollNumber !== recommendedRoll && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setForm((f) => ({
                                                    ...f,
                                                    rollNumber: recommendedRoll,
                                                }));
                                                if (errors.rollNumber) {
                                                    setErrors((err) => ({
                                                        ...err,
                                                        rollNumber: undefined,
                                                    }));
                                                }
                                            }}
                                            className="text-[11px] font-bold text-blue-700 bg-white hover:bg-blue-100 border border-blue-300 px-2.5 py-1 rounded-md shadow-2xs transition-colors shrink-0 cursor-pointer"
                                            title="Apply recommended roll number"
                                        >
                                            Use {recommendedRoll}
                                        </button>
                                    )}
                                </div>
                            )}

                            <label className="form-label text-xs font-semibold block mb-1">
                                Roll Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                value={form.rollNumber}
                                onChange={(e) => {
                                    setForm((f) => ({
                                        ...f,
                                        rollNumber: e.target.value,
                                    }));
                                    if (errors.rollNumber)
                                        setErrors((err) => ({
                                            ...err,
                                            rollNumber: undefined,
                                        }));
                                }}
                                className={`form-input w-full font-mono ${errors.rollNumber || duplicateWarning ? "border-red-500 bg-red-50/20" : ""}`}
                                placeholder="e.g. R-10425"
                            />
                            {isCheckingDuplicate && (
                                <p className="text-slate-400 text-[11px] mt-1 flex items-center gap-1">
                                    <RefreshCw
                                        size={11}
                                        className="animate-spin"
                                    />{" "}
                                    Checking roll number...
                                </p>
                            )}
                            {errors.rollNumber && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {errors.rollNumber}
                                </p>
                            )}
                            {duplicateWarning && (
                                <div className="mt-1.5 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-1.5 animate-in fade-in">
                                    <AlertCircle
                                        size={14}
                                        className="shrink-0 mt-0.5"
                                    />
                                    <div>
                                        <strong className="block font-bold">
                                            ⚠️ Anti-Duplicate: Duplicate Roll Number!
                                        </strong>
                                        <span>{duplicateWarning.message}</span>
                                        <div className="text-[10px] text-red-600 mt-0.5">
                                            Spec: {duplicateWarning.roll?.grade} | GSM:{" "}
                                            {duplicateWarning.roll?.gsm} | Shift:{" "}
                                            {duplicateWarning.roll?.shift} | Status:{" "}
                                            {duplicateWarning.roll?.status}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Form Number */}
                        <div>
                            <label className="form-label text-xs font-semibold block mb-1 flex items-center justify-between">
                                <span>
                                    Form Number <span className="text-red-500">*</span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                    (Jumbo + Grade + RW)
                                </span>
                            </label>
                            <input
                                value={form.formNumber}
                                onChange={(e) => {
                                    setForm((f) => ({
                                        ...f,
                                        formNumber: e.target.value,
                                    }));
                                    if (errors.formNumber)
                                        setErrors((err) => ({
                                            ...err,
                                            formNumber: undefined,
                                        }));
                                }}
                                className={`form-input w-full ${errors.formNumber ? "border-red-500" : ""}`}
                                placeholder="e.g. F-2241"
                            />
                            {errors.formNumber && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {errors.formNumber}
                                </p>
                            )}
                        </div>

                        {/* Grade (Editable) */}
                        <div>
                            <label className="form-label text-xs font-semibold block mb-1 flex items-center justify-between">
                                <span>
                                    Grade <span className="text-red-500">*</span>
                                </span>
                                <span className="text-[10px] text-blue-600 font-normal">
                                    (Editable / Realisasi Produk Samping)
                                </span>
                            </label>
                            <input
                                type="text"
                                value={form.grade}
                                onChange={(e) => {
                                    setForm((f) => ({
                                        ...f,
                                        grade: e.target.value,
                                    }));
                                    if (errors.grade)
                                        setErrors((err) => ({
                                            ...err,
                                            grade: undefined,
                                        }));
                                }}
                                placeholder="Enter Grade"
                                className={`form-input w-full ${errors.grade ? "border-red-500" : ""}`}
                            />
                            {errors.grade && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {errors.grade}
                                </p>
                            )}
                        </div>

                        {/* GSM (Editable) */}
                        <div>
                            <label className="form-label text-xs font-semibold block mb-1 flex items-center justify-between">
                                <span>
                                    GSM (g/m²) <span className="text-red-500">*</span>
                                </span>
                                <span className="text-[10px] text-blue-600 font-normal">
                                    (Editable / Realisasi)
                                </span>
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={form.gsm}
                                onKeyDown={(e) => handleNumberKeyDown(e, false)}
                                onChange={(e) => {
                                    const val = sanitizeNumeric(e.target.value, false);
                                    setForm((f) => ({
                                        ...f,
                                        gsm: val,
                                    }));
                                    if (errors.gsm)
                                        setErrors((err) => ({
                                            ...err,
                                            gsm: undefined,
                                        }));
                                }}
                                placeholder="Enter GSM (e.g. 420)"
                                className={`form-input w-full ${errors.gsm ? "border-red-500" : ""}`}
                            />
                            {errors.gsm && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {errors.gsm}
                                </p>
                            )}
                        </div>

                        {/* Roll Width (RW) */}
                        <div>
                            <label className="form-label text-xs font-semibold block mb-1 flex items-center justify-between">
                                <span>
                                    Roll Width (RW) (mm){" "}
                                    <span className="text-red-500">*</span>
                                </span>
                                <span className="text-[10px] text-blue-600 font-normal">
                                    (JOP Recommendation)
                                </span>
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={form.width}
                                onKeyDown={(e) => handleNumberKeyDown(e, false)}
                                onChange={(e) => {
                                    const val = sanitizeNumeric(e.target.value, false);
                                    setForm((f) => ({
                                        ...f,
                                        width: val,
                                    }));
                                    if (errors.width)
                                        setErrors((err) => ({
                                            ...err,
                                            width: undefined,
                                        }));
                                }}
                                className={`form-input w-full ${errors.width ? "border-red-500" : ""}`}
                                placeholder="e.g. 1650"
                            />
                            {errors.width && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {errors.width}
                                </p>
                            )}
                        </div>

                        {/* Plybond */}
                        <div>
                            <label className="form-label text-xs font-semibold block mb-1 flex items-center justify-between">
                                <span>
                                    Plybond <span className="text-red-500">*</span>
                                </span>
                                <span className="text-[10px] text-blue-600 font-normal">
                                    (PPIC Recommendation)
                                </span>
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={form.plybond}
                                onKeyDown={(e) => handleNumberKeyDown(e, true)}
                                onChange={(e) => {
                                    const val = sanitizeNumeric(e.target.value, true);
                                    setForm((f) => ({
                                        ...f,
                                        plybond: val,
                                    }));
                                    if (errors.plybond)
                                        setErrors((err) => ({
                                            ...err,
                                            plybond: undefined,
                                        }));
                                }}
                                className={`form-input w-full ${errors.plybond ? "border-red-500" : ""}`}
                                placeholder="e.g. 1.8 or 400"
                            />
                            {errors.plybond && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {errors.plybond}
                                </p>
                            )}
                        </div>

                        {/* Thickness */}
                        <div>
                            <label className="form-label text-xs font-semibold block mb-1 flex items-center justify-between">
                                <span>
                                    Thickness (mm){" "}
                                    <span className="text-red-500">*</span>
                                </span>
                                <span className="text-[10px] text-blue-600 font-normal">
                                    (PPIC Recommendation)
                                </span>
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={form.thickness}
                                onKeyDown={(e) => handleNumberKeyDown(e, true)}
                                onChange={(e) => {
                                    const val = sanitizeNumeric(e.target.value, true);
                                    setForm((f) => ({
                                        ...f,
                                        thickness: val,
                                    }));
                                    if (errors.thickness)
                                        setErrors((err) => ({
                                            ...err,
                                            thickness: undefined,
                                        }));
                                }}
                                className={`form-input w-full ${errors.thickness ? "border-red-500" : ""}`}
                                placeholder="e.g. 0.22 or 600"
                            />
                            {errors.thickness && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {errors.thickness}
                                </p>
                            )}
                        </div>

                        {/* Core */}
                        <div>
                            <label className="form-label text-xs font-semibold block mb-1 flex items-center justify-between">
                                <span>
                                    Core (mm / &quot;){" "}
                                    <span className="text-red-500">*</span>
                                </span>
                                <span className="text-[10px] text-blue-600 font-normal">
                                    (PPIC Recommendation)
                                </span>
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={form.core}
                                onKeyDown={(e) => handleNumberKeyDown(e, true)}
                                onChange={(e) => {
                                    const val = sanitizeNumeric(e.target.value, true);
                                    setForm((f) => ({
                                        ...f,
                                        core: val,
                                    }));
                                    if (errors.core)
                                        setErrors((err) => ({
                                            ...err,
                                            core: undefined,
                                        }));
                                }}
                                className={`form-input w-full ${errors.core ? "border-red-500" : ""}`}
                                placeholder="e.g. 3 or 76"
                            />
                            {errors.core && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {errors.core}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Segment 2: Physical & Dimension Specifications (Manual Input) */}
                <div className="card p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                        <Layers size={16} className="text-emerald-600" />
                        <h3 className="text-sm font-bold text-slate-900">
                            Roll Physical Measurements (Manual Input)
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                        {/* Roll Diameter (RD) */}
                        <div>
                            <label className="form-label text-xs font-semibold block mb-1 flex items-center justify-between">
                                <span>
                                    Roll Diameter (RD) (mm){" "}
                                    <span className="text-red-500">*</span>
                                </span>
                                <span className="text-[10px] text-emerald-600 font-normal">
                                    (Diisi Produksi)
                                </span>
                            </label>
                            <input
                                type="number"
                                value={form.diameter}
                                onChange={(e) => {
                                    setForm((f) => ({
                                        ...f,
                                        diameter: e.target.value,
                                    }));
                                    if (errors.diameter)
                                        setErrors((err) => ({
                                            ...err,
                                            diameter: undefined,
                                        }));
                                }}
                                className={`form-input w-full ${errors.diameter ? "border-red-500" : ""}`}
                                placeholder="e.g. 1120"
                            />
                            {errors.diameter && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {errors.diameter}
                                </p>
                            )}
                        </div>

                        {/* Bulk */}
                        <div>
                            <label className="form-label text-xs font-semibold block mb-1 flex items-center justify-between">
                                <span>
                                    Bulk <span className="text-red-500">*</span>
                                </span>
                                <span className="text-[10px] text-emerald-600 font-normal">
                                    (Diisi Produksi)
                                </span>
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={form.bulk}
                                onKeyDown={(e) => handleNumberKeyDown(e, true)}
                                onChange={(e) => {
                                    const val = sanitizeNumeric(e.target.value, true);
                                    setForm((f) => ({
                                        ...f,
                                        bulk: val,
                                    }));
                                    if (errors.bulk)
                                        setErrors((err) => ({
                                            ...err,
                                            bulk: undefined,
                                        }));
                                }}
                                className={`form-input w-full ${errors.bulk ? "border-red-500" : ""}`}
                                placeholder="e.g. 1.4 or 1,4"
                            />
                            {errors.bulk && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {errors.bulk}
                                </p>
                            )}
                        </div>

                        {/* Cobb */}
                        <div>
                            <label className="form-label text-xs font-semibold block mb-1 flex items-center justify-between">
                                <span>
                                    Cobb <span className="text-red-500">*</span>
                                </span>
                                <span className="text-[10px] text-emerald-600 font-normal">
                                    (Diisi Produksi)
                                </span>
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={form.cobb}
                                onKeyDown={(e) => handleNumberKeyDown(e, true)}
                                onChange={(e) => {
                                    const val = sanitizeNumeric(e.target.value, true);
                                    setForm((f) => ({
                                        ...f,
                                        cobb: val,
                                    }));
                                    if (errors.cobb)
                                        setErrors((err) => ({
                                            ...err,
                                            cobb: undefined,
                                        }));
                                }}
                                className={`form-input w-full ${errors.cobb ? "border-red-500" : ""}`}
                                placeholder="e.g. 150"
                            />
                            {errors.cobb && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {errors.cobb}
                                </p>
                            )}
                        </div>

                        {/* Ex Material */}
                        <div>
                            <label className="form-label text-xs font-semibold block mb-1">
                                Ex Material <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.exMaterial}
                                onChange={(e) => {
                                    setForm((f) => ({
                                        ...f,
                                        exMaterial: e.target.value,
                                    }));
                                    if (errors.exMaterial)
                                        setErrors((err) => ({
                                            ...err,
                                            exMaterial: undefined,
                                        }));
                                }}
                                className={`form-input w-full ${errors.exMaterial ? "border-red-500" : ""}`}
                            >
                                {["IMPORT", "LOCAL", "MIX"].map((o) => (
                                    <option key={o} value={o}>
                                        {o}
                                    </option>
                                ))}
                            </select>
                            {errors.exMaterial && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {errors.exMaterial}
                                </p>
                            )}
                        </div>

                        {/* Visual Status */}
                        <div>
                            <label className="form-label text-xs font-semibold block mb-1">
                                Visual Status <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.visual}
                                onChange={(e) => {
                                    setForm((f) => ({
                                        ...f,
                                        visual: e.target.value,
                                    }));
                                    if (errors.visual)
                                        setErrors((err) => ({
                                            ...err,
                                            visual: undefined,
                                        }));
                                }}
                                className={`form-input w-full ${errors.visual ? "border-red-500" : ""}`}
                            >
                                <option value="OK">OK</option>
                                <option value="PKP">PKP</option>
                                <option value="Reject">Reject</option>
                            </select>
                            {errors.visual && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {errors.visual}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Segment 3: Shift & Operational Details */}
                <div className="card p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                        <Clock size={16} className="text-purple-600" />
                        <h3 className="text-sm font-bold text-slate-900">
                            Shift & Operations
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
                        <div>
                            <label className="form-label text-xs font-semibold block mb-1">
                                Production Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={form.entry_date}
                                onChange={(e) => {
                                    setForm((f) => ({
                                        ...f,
                                        entry_date: e.target.value,
                                    }));
                                    if (errors.entry_date)
                                        setErrors((err) => ({
                                            ...err,
                                            entry_date: undefined,
                                        }));
                                }}
                                className={`form-input w-full ${errors.entry_date ? "border-red-500" : ""}`}
                            />
                            {errors.entry_date && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {errors.entry_date}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="form-label text-xs font-semibold block mb-1">
                                Shift <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.shift}
                                onChange={(e) => {
                                    setForm((f) => ({
                                        ...f,
                                        shift: e.target.value,
                                    }));
                                    if (errors.shift)
                                        setErrors((err) => ({
                                            ...err,
                                            shift: undefined,
                                        }));
                                }}
                                className={`form-input w-full ${errors.shift ? "border-red-500" : ""}`}
                            >
                                <option value="1">Shift 1</option>
                                <option value="2">Shift 2</option>
                                <option value="3">Shift 3</option>
                            </select>
                            {errors.shift && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {errors.shift}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="form-label text-xs font-semibold block mb-1">
                                Label Status (Roll Status){" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.status}
                                onChange={(e) => {
                                    setForm((f) => ({
                                        ...f,
                                        status: e.target.value,
                                    }));
                                }}
                                className="form-input w-full font-semibold"
                            >
                                <option value="OK">
                                    OK (Standard Passed)
                                </option>
                                <option value="HOLD">
                                    HOLD (Waiting for QC Spec Verification)
                                </option>
                            </select>
                            <p className="text-slate-400 text-[10px] mt-1">
                                Select HOLD if there are specification deviations
                                requiring QC verification in the warehouse.
                            </p>
                        </div>

                        <div>
                            <label className="form-label text-xs font-semibold block mb-1">
                                PIC (Officer) <span className="text-red-500">*</span>
                            </label>
                            <input
                                value={form.pic}
                                onChange={(e) => {
                                    setForm((f) => ({
                                        ...f,
                                        pic: e.target.value,
                                    }));
                                    if (errors.pic)
                                        setErrors((err) => ({
                                            ...err,
                                            pic: undefined,
                                        }));
                                }}
                                className={`form-input w-full ${errors.pic ? "border-red-500" : ""}`}
                                placeholder="e.g. Budi Suprapto"
                            />
                            {errors.pic && (
                                <p className="text-red-600 text-[11px] mt-1">
                                    {errors.pic}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Navigation buttons */}
                    <div className="flex gap-2 justify-end pt-4 mt-4 border-t border-slate-100">
                        <button
                            className="btn btn-secondary text-xs"
                            onClick={onBack}
                        >
                            <ArrowLeft size={13} /> <span>Back</span>
                        </button>
                        <button
                            className="btn btn-primary text-xs"
                            onClick={onNext}
                        >
                            <span>Review</span> <ArrowRight size={13} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
