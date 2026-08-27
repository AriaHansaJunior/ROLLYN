import { useState, useEffect } from "react";
import {
    CheckCircle,
    Save,
    Scale,
    Edit3,
    ArrowLeft,
    ArrowRight,
    FileText,
    Layers,
    Clock,
    Lock,
    Printer,
    RefreshCw,
} from "lucide-react";
import WeightDetectionEngine from "../SPECTRUM/SpectrumWeightDetectionEngine";
import QRCodeSVG from "@/Components/QRCodeSVG";
import { SystemUI } from "@/Utils/SystemUI";
import { router, usePage } from "@inertiajs/react";
import axios from "axios";

const SCALE_ROI = { x: 0, y: 0, width: 1, height: 1 };
const steps = [
    "Scanner & OCR Detection",
    "Fill Form Data",
    "Preview Data",
    "Print Label",
];

interface WeightState {
    value: number;
    display: string;
    source: "ocr" | "spectrum" | "manual" | "none";
}

interface JopOption {
    id: number | string;
    jop: string;
    spk?: string;
    grade?: { grade: string } | string;
    gsm?: { gsm: number } | number | string;
    customer?: { customer: string } | string;
}

export default function IncomingRoll() {
    const { jopList = [] } = usePage<any>().props;
    const [step, setStep] = useState(() => {
        const saved = sessionStorage.getItem("incomingRoll_step");
        return saved ? JSON.parse(saved) : 0;
    });
    const [weight, setWeight] = useState<WeightState>(() => {
        const saved = sessionStorage.getItem("incomingRoll_weight");
        return saved ? JSON.parse(saved) : {
            value: 0,
            display: "",
            source: "none",
        };
    });
    const [jops, setJops] = useState<JopOption[]>([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [savedRollNumber, setSavedRollNumber] = useState(() => {
        return sessionStorage.getItem("incomingRoll_savedId") || "";
    });

    const [form, setForm] = useState(() => {
        const saved = sessionStorage.getItem("incomingRoll_form");
        return saved ? JSON.parse(saved) : {
            jop: "",
            grade: "",
            gsm: "",
            visual: "OK",
            rollNumber: "",
            formNumber: "",
            plybond: "",
            diameter: "",
            width: "",
            thickness: "",
            bulk: "",
            core: "76",
            exMaterial: "OCC",
            cobb: "",
            shift: "Shift A",
            pic: "",
        };
    });

    useEffect(() => {
        sessionStorage.setItem("incomingRoll_step", JSON.stringify(step));
    }, [step]);

    useEffect(() => {
        sessionStorage.setItem("incomingRoll_weight", JSON.stringify(weight));
    }, [weight]);

    useEffect(() => {
        sessionStorage.setItem("incomingRoll_form", JSON.stringify(form));
    }, [form]);

    useEffect(() => {
        if (savedRollNumber) {
            sessionStorage.setItem("incomingRoll_savedId", savedRollNumber);
        } else {
            sessionStorage.removeItem("incomingRoll_savedId");
        }
    }, [savedRollNumber]);

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        let list: JopOption[] = [];
        if (Array.isArray(jopList) && jopList.length > 0) {
            list = jopList;
        }

        axios
            .get("/api/v1/jops")
            .then((res) => {
                const apiData =
                    res.data?.data?.data || res.data?.data || res.data || [];
                if (Array.isArray(apiData) && apiData.length > 0) {
                    setJops(apiData);
                } else if (list.length > 0) {
                    setJops(list);
                } else {
                    setJops([
                        {
                            id: 1,
                            jop: "JOP-0726-00028",
                            grade: { grade: "SPECTA - TK4" },
                            gsm: { gsm: 420 },
                            customer: "Dummy Customer",
                        },
                        {
                            id: 2,
                            jop: "JOP-240710",
                            grade: { grade: "KLB-150" },
                            gsm: { gsm: 150 },
                            customer: "PT Paper Packaging",
                        },
                        {
                            id: 3,
                            jop: "JOP-240711",
                            grade: { grade: "KLB-175" },
                            gsm: { gsm: 175 },
                            customer: "PT Box Indonesia",
                        },
                    ]);
                }
            })
            .catch(() => {
                if (list.length > 0) {
                    setJops(list);
                } else {
                    setJops([
                        {
                            id: 1,
                            jop: "JOP-0726-00028",
                            grade: { grade: "SPECTA - TK4" },
                            gsm: { gsm: 420 },
                            customer: "Dummy Customer",
                        },
                        {
                            id: 2,
                            jop: "JOP-240710",
                            grade: { grade: "KLB-150" },
                            gsm: { gsm: 150 },
                            customer: "PT Paper Packaging",
                        },
                        {
                            id: 3,
                            jop: "JOP-240711",
                            grade: { grade: "KLB-175" },
                            gsm: { gsm: 175 },
                            customer: "PT Box Indonesia",
                        },
                    ]);
                }
            });
    }, [jopList]);

    function handleWeightConfirmed(
        value: number,
        display: string,
        source: "ocr" | "spectrum" | "manual",
    ) {
        setWeight({ value, display, source });
        setStep(1);
    }

    function handleJopSelect(selectedJop: string) {
        const found = jops.find(
            (j) => j.jop === selectedJop || String(j.id) === selectedJop,
        );

        let gradeVal = "";
        if (found) {
            if (
                typeof found.grade === "object" &&
                found.grade !== null &&
                "grade" in found.grade
            ) {
                gradeVal = found.grade.grade;
            } else if (typeof found.grade === "string") {
                gradeVal = found.grade;
            }
        }

        let gsmVal = "";
        if (found) {
            if (
                typeof found.gsm === "object" &&
                found.gsm !== null &&
                "gsm" in found.gsm
            ) {
                gsmVal = String(found.gsm.gsm);
            } else if (found.gsm !== undefined && found.gsm !== null) {
                gsmVal = String(found.gsm);
            }
        }

        setForm((f) => ({
            ...f,
            jop: selectedJop,
            grade: gradeVal,
            gsm: gsmVal,
        }));

        setErrors((err) => ({
            ...err,
            jop: undefined,
            grade: undefined,
            gsm: undefined,
        }));
    }

    function validateStep1() {
        const errs: Record<string, string> = {};

        if (!form.jop.trim()) errs.jop = "JOP is required.";
        if (!form.grade.trim())
            errs.grade = "Grade is required (Select JOP first).";
        if (!form.gsm.trim()) errs.gsm = "GSM is required (Select JOP first).";
        if (!form.visual.trim()) errs.visual = "Visual status is required.";
        if (!form.rollNumber.trim())
            errs.rollNumber = "Roll number is required.";
        if (!form.formNumber.trim())
            errs.formNumber = "Form number is required.";
        if (!form.plybond.trim()) errs.plybond = "Plybond is required.";
        if (!form.diameter.trim()) errs.diameter = "Roll diameter is required.";
        if (!form.width.trim()) errs.width = "Roll width is required.";
        if (!form.thickness.trim()) errs.thickness = "Thickness is required.";
        if (!form.bulk.trim()) errs.bulk = "Bulk is required.";
        if (!form.core.trim()) errs.core = "Core is required.";
        if (!form.exMaterial.trim())
            errs.exMaterial = "Ex material is required.";
        if (!form.cobb.trim()) errs.cobb = "Cobb is required.";
        if (!form.shift.trim()) errs.shift = "Shift is required.";
        if (!form.pic.trim()) errs.pic = "PIC (Petugas) is required.";

        setErrors(errs);

        if (Object.keys(errs).length > 0) {
            SystemUI.toast({
                message: "Please fill in all required fields!",
                type: "error",
            });
            return false;
        }
        return true;
    }

    function goToStep2() {
        if (validateStep1()) {
            setStep(2);
        }
    }

    async function handleSave() {
        const payload = {
            rollNumber: form.rollNumber,
            formNumber: form.formNumber,
            shift: form.shift,
            jop: form.jop,
            grade: form.grade,
            gsm: form.gsm,
            plybond: form.plybond,
            thickness: form.thickness,
            bulk: form.bulk,
            width: form.width,
            diameter: form.diameter,
            core: form.core,
            cobb: form.cobb,
            exMaterial: form.exMaterial,
            visual: form.visual,
            pic: form.pic,
            weight:
                weight.value ||
                (weight.display
                    ? parseFloat(weight.display.replace(/,/g, ""))
                    : 0),
            is_update: form.rollNumber === savedRollNumber,
        };

        try {
            SystemUI.toast({
                message: "Saving roll data to database…",
                type: "info",
            });
            const res = await axios.post("/incoming-roll", payload);

            SystemUI.toast({
                message:
                    res.data?.message ||
                    `Roll ${form.rollNumber || "data"} saved successfully!`,
                type: "success",
            });

            setSavedRollNumber(form.rollNumber);
            setStep(3);
        } catch (err: any) {
            console.error("[Roll Save Error]:", err);
            const errorMsg =
                err.response?.data?.message ||
                "Failed to save roll data to database.";
            SystemUI.toast({ message: errorMsg, type: "error" });
        }
    }

    return (
        <div className="py-4 px-2.5 sm:px-6 space-y-4">
            <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    Incoming Roll
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                    Physical roll weight capture and specification logging
                </p>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-2 w-full lg:max-w-4xl py-2">
                {steps.map((s, i) => (
                    <div
                        key={s}
                        className="flex items-center flex-1 last:flex-none"
                    >
                        <div className="flex items-center gap-2">
                            <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                                    i < step
                                        ? "bg-green-600 text-white"
                                        : i === step
                                          ? "bg-blue-600 text-white shadow-xs"
                                          : "bg-slate-200 text-slate-600"
                                }`}
                            >
                                {i < step ? "✓" : i + 1}
                            </div>
                            <span
                                className={`text-xs font-semibold whitespace-nowrap min-[680px]:inline hidden ${i === step ? "text-blue-700 font-bold" : "text-slate-500"}`}
                            >
                                {s}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div
                                className={`flex-1 h-0.5 mx-3 transition-colors ${i < step ? "bg-green-500" : "bg-slate-200"}`}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Step 0: Weight Detection */}
            {step === 0 && (
                <WeightDetectionEngine
                    onWeightConfirmed={handleWeightConfirmed}
                    roi={SCALE_ROI}
                />
            )}

            {/* Step 1: Form Data */}
            {step === 1 && (
                <div className="w-full 2xl:max-w-7xl space-y-4 lg:space-y-6">
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
                                                    Entered manually by
                                                    administrator
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                className="btn btn-secondary btn-sm text-xs cursor-pointer shrink-0"
                                onClick={() => setStep(0)}
                                title="Go back to re-detect weight"
                            >
                                Re-detect
                            </button>
                        </div>
                    </div>

                    {/* Roll Data Entry Segments */}
                    <div className="space-y-4">
                        {/* Segment 1: Job Order & Specification */}
                        <div className="card p-4 sm:p-5">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                                <FileText size={16} className="text-blue-600" />
                                <h3 className="text-sm font-bold text-slate-900">
                                    Job Order & Specification
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                {/* JOP Dropdown */}
                                <div>
                                    <label className="form-label text-xs font-semibold block mb-1">
                                        Job Order Production (JOP){" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.jop}
                                        onChange={(e) =>
                                            handleJopSelect(e.target.value)
                                        }
                                        className={`form-input w-full ${errors.jop ? "border-red-500" : ""}`}
                                    >
                                        <option value="">
                                            -- Select JOP --
                                        </option>
                                        {jops.map((j) => (
                                            <option
                                                key={j.id || j.jop}
                                                value={j.jop}
                                            >
                                                {j.jop}{" "}
                                                {typeof j.customer ===
                                                    "object" &&
                                                j.customer?.customer
                                                    ? `(${j.customer.customer})`
                                                    : typeof j.customer ===
                                                        "string"
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
                                </div>

                                {/* Grade (Auto-filled & Disabled) */}
                                <div>
                                    <label className="form-label text-xs font-semibold block mb-1 flex items-center justify-between">
                                        <span>
                                            Grade{" "}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.grade}
                                        readOnly
                                        disabled
                                        placeholder="Select JOP first"
                                        className={`form-input w-full bg-slate-100 text-slate-700 font-semibold cursor-not-allowed ${errors.grade ? "border-red-500" : ""}`}
                                    />
                                    {errors.grade && (
                                        <p className="text-red-600 text-[11px] mt-1">
                                            {errors.grade}
                                        </p>
                                    )}
                                </div>

                                {/* GSM (Auto-filled & Disabled) */}
                                <div>
                                    <label className="form-label text-xs font-semibold block mb-1 flex items-center justify-between">
                                        <span>
                                            GSM (g/m²){" "}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.gsm}
                                        readOnly
                                        disabled
                                        placeholder="Select JOP first"
                                        className={`form-input w-full bg-slate-100 text-slate-700 font-semibold cursor-not-allowed ${errors.gsm ? "border-red-500" : ""}`}
                                    />
                                    {errors.gsm && (
                                        <p className="text-red-600 text-[11px] mt-1">
                                            {errors.gsm}
                                        </p>
                                    )}
                                </div>

                                {/* Visual Status */}
                                <div>
                                    <label className="form-label text-xs font-semibold block mb-1">
                                        Visual Status{" "}
                                        <span className="text-red-500">*</span>
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
                                        <option value="REJ">REJ</option>
                                        <option value="C/S">C/S</option>
                                    </select>
                                    {errors.visual && (
                                        <p className="text-red-600 text-[11px] mt-1">
                                            {errors.visual}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Segment 2: Physical & Dimension Specifications */}
                        <div className="card p-4 sm:p-5">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                                <Layers
                                    size={16}
                                    className="text-emerald-600"
                                />
                                <h3 className="text-sm font-bold text-slate-900">
                                    Roll Identification & Physical Specs
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4">
                                {/* Row 1 */}
                                <div>
                                    <label className="form-label text-xs font-semibold block mb-1">
                                        Roll Number{" "}
                                        <span className="text-red-500">*</span>
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
                                        className={`form-input w-full ${errors.rollNumber ? "border-red-500" : ""}`}
                                        placeholder="e.g. R-10425"
                                    />
                                    {errors.rollNumber && (
                                        <p className="text-red-600 text-[11px] mt-1">
                                            {errors.rollNumber}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="form-label text-xs font-semibold block mb-1">
                                        Form Number{" "}
                                        <span className="text-red-500">*</span>
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

                                <div>
                                    <label className="form-label text-xs font-semibold block mb-1">
                                        Plybond{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.plybond}
                                        onChange={(e) => {
                                            setForm((f) => ({
                                                ...f,
                                                plybond: e.target.value,
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

                                {/* Row 2 */}
                                <div>
                                    <label className="form-label text-xs font-semibold block mb-1">
                                        Roll Diameter (mm){" "}
                                        <span className="text-red-500">*</span>
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

                                <div>
                                    <label className="form-label text-xs font-semibold block mb-1">
                                        Roll Width (mm){" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={form.width}
                                        onChange={(e) => {
                                            setForm((f) => ({
                                                ...f,
                                                width: e.target.value,
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

                                <div>
                                    <label className="form-label text-xs font-semibold block mb-1">
                                        Thickness (mm){" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.thickness}
                                        onChange={(e) => {
                                            setForm((f) => ({
                                                ...f,
                                                thickness: e.target.value,
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

                                {/* Row 3 */}
                                <div>
                                    <label className="form-label text-xs font-semibold block mb-1">
                                        Bulk{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.bulk}
                                        onChange={(e) => {
                                            setForm((f) => ({
                                                ...f,
                                                bulk: e.target.value,
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

                                <div>
                                    <label className="form-label text-xs font-semibold block mb-1">
                                        Core (mm){" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={form.core}
                                        onChange={(e) => {
                                            setForm((f) => ({
                                                ...f,
                                                core: e.target.value,
                                            }));
                                            if (errors.core)
                                                setErrors((err) => ({
                                                    ...err,
                                                    core: undefined,
                                                }));
                                        }}
                                        className={`form-input w-full ${errors.core ? "border-red-500" : ""}`}
                                        placeholder="e.g. 76"
                                    />
                                    {errors.core && (
                                        <p className="text-red-600 text-[11px] mt-1">
                                            {errors.core}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="form-label text-xs font-semibold block mb-1">
                                        Ex Material{" "}
                                        <span className="text-red-500">*</span>
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
                                        {["OCC", "NDLKP", "DIP", "Mixed"].map(
                                            (o) => (
                                                <option key={o} value={o}>
                                                    {o}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                    {errors.exMaterial && (
                                        <p className="text-red-600 text-[11px] mt-1">
                                            {errors.exMaterial}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="form-label text-xs font-semibold block mb-1">
                                        Cobb{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.cobb}
                                        onChange={(e) => {
                                            setForm((f) => ({
                                                ...f,
                                                cobb: e.target.value,
                                            }));
                                            if (errors.cobb)
                                                setErrors((err) => ({
                                                    ...err,
                                                    cobb: undefined,
                                                }));
                                        }}
                                        className={`form-input w-full ${errors.cobb ? "border-red-500" : ""}`}
                                        placeholder="e.g. 150-250"
                                    />
                                    {errors.cobb && (
                                        <p className="text-red-600 text-[11px] mt-1">
                                            {errors.cobb}
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="form-label text-xs font-semibold block mb-1">
                                        Shift{" "}
                                        <span className="text-red-500">*</span>
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
                                        <option value="Shift A">Shift A</option>
                                        <option value="Shift B">Shift B</option>
                                        <option value="Shift C">Shift C</option>
                                    </select>
                                    {errors.shift && (
                                        <p className="text-red-600 text-[11px] mt-1">
                                            {errors.shift}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="form-label text-xs font-semibold block mb-1">
                                        PIC (Petugas){" "}
                                        <span className="text-red-500">*</span>
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
                                    onClick={() => setStep(0)}
                                >
                                    <ArrowLeft size={13} /> <span>Back</span>
                                </button>
                                <button
                                    className="btn btn-primary text-xs"
                                    onClick={goToStep2}
                                >
                                    <span>Review</span> <ArrowRight size={13} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Review & Save */}
            {step === 2 && (
                <div className="w-full 2xl:max-w-7xl space-y-4">
                    <div className="card p-4 sm:p-6 lg:p-8">
                        <h3 className="text-sm sm:text-base lg:text-xl font-extrabold text-slate-900 mb-4 pb-3 border-b border-slate-200">
                            Review & Save
                        </h3>
                        <div className="grid grid-cols-1 min-[680px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-2 sm:gap-y-3 lg:gap-y-4 text-xs sm:text-sm lg:text-base">
                            {[
                                [
                                    "Job Order Production",
                                    form.jop || "(not entered)",
                                ],
                                ["Grade", form.grade || "(not entered)"],
                                [
                                    "GSM",
                                    form.gsm
                                        ? `${form.gsm} g/m²`
                                        : "(not entered)",
                                ],
                                ["Visual Status", form.visual],
                                [
                                    "Roll Number",
                                    form.rollNumber || "(not entered)",
                                ],
                                [
                                    "Form Number",
                                    form.formNumber || "(not entered)",
                                ],
                                ["Weight", `${weight.display} kg`],
                                ["Plybond", form.plybond || "(not entered)"],
                                [
                                    "Thickness",
                                    form.thickness
                                        ? `${form.thickness} mm`
                                        : "(not entered)",
                                ],
                                [
                                    "Roll Width",
                                    form.width
                                        ? `${form.width} mm`
                                        : "(not entered)",
                                ],
                                [
                                    "Diameter",
                                    form.diameter
                                        ? `${form.diameter} mm`
                                        : "(not entered)",
                                ],
                                ["Core", `${form.core} mm`],
                                ["Cobb", form.cobb || "(not entered)"],
                                ["Ex Material", form.exMaterial],
                                ["Shift", form.shift],
                                ["PIC (Petugas)", form.pic || "(not entered)"],
                            ].map(([label, value]) => (
                                <div
                                    key={label}
                                    className="flex justify-between items-center py-2 lg:py-3 border-b border-slate-100"
                                >
                                    <span className="text-slate-500 font-medium">
                                        {label}
                                    </span>
                                    <span
                                        className={`font-semibold text-right ${value.includes("(not entered)") ? "text-amber-600" : "text-slate-900"}`}
                                    >
                                        {value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3 justify-end pt-6 mt-6 border-t border-slate-200">
                            <button
                                className="btn btn-secondary text-xs sm:text-sm px-4 py-2 lg:px-6 lg:py-2.5"
                                onClick={() => setStep(1)}
                            >
                                <ArrowLeft size={16} /> <span>Edit</span>
                            </button>
                            <button
                                className="btn btn-primary text-xs sm:text-sm px-4 py-2 lg:px-6 lg:py-2.5"
                                onClick={() => setShowConfirmModal(true)}
                            >
                                <Save size={16} />{" "}
                                <span>Save & Generate QR Label</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Print Label & Dynamic QR Generation */}
            {step === 3 && (
                <div className="w-full 2xl:max-w-4xl space-y-4">
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
                        <div className="flex flex-wrap gap-3 justify-center pt-2">
                            <button
                                className="btn btn-secondary btn-md flex items-center gap-2 px-6 py-2.5 font-semibold cursor-pointer"
                                onClick={() => setStep(1)}
                            >
                                <ArrowLeft size={16} /> <span>Edit Data</span>
                            </button>
                            <button
                                className="btn btn-primary btn-md flex items-center gap-2 px-6 py-2.5 font-bold cursor-pointer"
                                onClick={() => window.print()}
                            >
                                <Printer size={16} /> <span>Print Label</span>
                            </button>
                            <button
                                className="btn btn-secondary btn-md flex items-center gap-2 px-6 py-2.5 font-semibold cursor-pointer"
                                onClick={() => {
                                    sessionStorage.removeItem("incomingRoll_step");
                                    sessionStorage.removeItem("incomingRoll_weight");
                                    sessionStorage.removeItem("incomingRoll_form");
                                    sessionStorage.removeItem("incomingRoll_savedId");
                                    setSavedRollNumber("");
                                    setStep(0);
                                    setWeight({
                                        value: 0,
                                        display: "",
                                        source: "none",
                                    });
                                    setForm({
                                        jop: "",
                                        grade: "",
                                        gsm: "",
                                        visual: "OK",
                                        rollNumber: "",
                                        formNumber: "",
                                        plybond: "",
                                        diameter: "",
                                        width: "",
                                        thickness: "",
                                        bulk: "",
                                        core: "76",
                                        exMaterial: "OCC",
                                        cobb: "",
                                        shift: "Shift A",
                                        pic: "",
                                    });
                                    setErrors({});
                                }}
                            >
                                <RefreshCw size={16} />{" "}
                                <span>Register New Roll</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {showConfirmModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-fade-in-up">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-5">
                            <Save size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Confirm Data</h3>
                        <p className="text-slate-500 text-center text-sm mb-6">
                            Are you sure all filled data is correct? This process will save the data to the system and generate the QR Label.
                        </p>
                        <div className="flex gap-3">
                            <button
                                className="btn btn-secondary flex-1 flex justify-center"
                                onClick={() => setShowConfirmModal(false)}
                            >
                                Review
                            </button>
                            <button
                                className="btn btn-primary flex-1 flex justify-center"
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    handleSave();
                                }}
                            >
                                Yes, Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
