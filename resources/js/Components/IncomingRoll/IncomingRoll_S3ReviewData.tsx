import React from "react";
import { ArrowLeft, Save } from "lucide-react";
import { WeightState, IncomingRollFormState } from "./IncomingRoll_types";

interface Step2ReviewDataProps {
    weight: WeightState;
    form: IncomingRollFormState;
    onBack: () => void;
    onConfirmSave: () => void;
}

export default function IncomingRoll_S3ReviewData({
    weight,
    form,
    onBack,
    onConfirmSave,
}: Step2ReviewDataProps) {
    return (
        <div className="w-full space-y-4">
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
                        [
                            "Jumbo Roll Number",
                            form.jumboRoll || "(not entered)",
                        ],
                        ["Grade", form.grade || "(not entered)"],
                        [
                            "GSM",
                            form.gsm
                                ? `${form.gsm} g/m²`
                                : "(not entered)",
                        ],
                        [
                            "Visual Status",
                            form.visual || "(not entered)",
                        ],
                        ["Roll Status", form.status || "(not entered)"],
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
                        [
                            "Ex Material",
                            form.exMaterial || "(not entered)",
                        ],
                        [
                            "Production Date",
                            form.entry_date || "(not entered)",
                        ],
                        ["Shift", form.shift || "(not entered)"],
                        ["PIC (Officer)", form.pic || "(not entered)"],
                    ].map(([label, value]) => (
                        <div
                            key={label}
                            className="flex justify-between items-center py-2 lg:py-3 border-b border-slate-100"
                        >
                            <span className="text-slate-500 font-medium">
                                {label}
                            </span>
                            <span
                                className={`font-semibold text-right ${
                                    typeof value === "string" &&
                                    value.includes("(not entered)")
                                        ? "text-amber-600"
                                        : "text-slate-900"
                                }`}
                            >
                                {value}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3 justify-end pt-6 mt-6 border-t border-slate-200">
                    <button
                        className="btn btn-secondary text-xs sm:text-sm px-4 py-2 lg:px-6 lg:py-2.5"
                        onClick={onBack}
                    >
                        <ArrowLeft size={16} /> <span>Edit</span>
                    </button>
                    <button
                        className="btn btn-primary text-xs sm:text-sm px-4 py-2 lg:px-6 lg:py-2.5"
                        onClick={onConfirmSave}
                    >
                        <Save size={16} />{" "}
                        <span>Save & Generate QR Label</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
