import React, { useState, useEffect, useMemo } from "react";
import { usePage, router } from "@inertiajs/react";
import axios from "axios";
import { SystemUI } from "@/Utils/SystemUI";

import {
    STEPS,
    WeightState,
    JopOption,
    IncomingRollFormState,
    calculateNextRollNumber,
    sanitizeNumeric,
} from "@/Components/IncomingRoll/IncomingRoll_types";
import IncomingRoll_S1WeightDetection from "@/Components/IncomingRoll/IncomingRoll_S1WeightDetection";
import IncomingRoll_S2FormData from "@/Components/IncomingRoll/IncomingRoll_S2FormData";
import IncomingRoll_S3ReviewData from "@/Components/IncomingRoll/IncomingRoll_S3ReviewData";
import IncomingRoll_S4PrintLabel from "@/Components/IncomingRoll/IncomingRoll_S4PrintLabel";
import IncomingRoll_ConfirmSaveModal from "@/Components/IncomingRoll/IncomingRoll_ConfirmSaveModal";

export default function IncomingRoll() {
    const {
        jopList = [],
        jumboRolls = [],
        lastSavedRollNumber: initialLastSaved,
        recommendedRollNumber: initialRecommended,
    } = usePage<any>().props;

    const [recommendedRoll, setRecommendedRoll] = useState<string>(() => {
        if (initialRecommended) return String(initialRecommended);
        if (initialLastSaved)
            return calculateNextRollNumber(String(initialLastSaved));
        const savedRec = sessionStorage.getItem("incomingRoll_recommended");
        if (savedRec) return savedRec;
        const savedLast = sessionStorage.getItem("incomingRoll_lastSaved");
        if (savedLast) return calculateNextRollNumber(savedLast);
        return "";
    });

    useEffect(() => {
        if (initialRecommended) {
            setRecommendedRoll(String(initialRecommended));
            sessionStorage.setItem(
                "incomingRoll_recommended",
                String(initialRecommended),
            );
        } else if (initialLastSaved) {
            const next = calculateNextRollNumber(String(initialLastSaved));
            setRecommendedRoll(next);
            sessionStorage.setItem("incomingRoll_recommended", next);
        }
    }, [initialRecommended, initialLastSaved]);

    useEffect(() => {
        if (recommendedRoll) {
            sessionStorage.setItem("incomingRoll_recommended", recommendedRoll);
        }
    }, [recommendedRoll]);

    const [step, setStep] = useState<number>(() => {
        const saved = sessionStorage.getItem("incomingRoll_step");
        return saved ? JSON.parse(saved) : 0;
    });

    const [weight, setWeight] = useState<WeightState>(() => {
        const saved = sessionStorage.getItem("incomingRoll_weight");
        return saved
            ? JSON.parse(saved)
            : {
                  value: 0,
                  display: "",
                  source: "none",
              };
    });

    const [jops, setJops] = useState<JopOption[]>([]);
    const [jopSearch, setJopSearch] = useState("");
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [savedRollNumber, setSavedRollNumber] = useState(() => {
        return sessionStorage.getItem("incomingRoll_savedId") || "";
    });

    const [form, setForm] = useState<IncomingRollFormState>(() => {
        const defaultRoll =
            initialRecommended ||
            (initialLastSaved
                ? calculateNextRollNumber(String(initialLastSaved))
                : sessionStorage.getItem("incomingRoll_recommended") || "");
        const defaultState: IncomingRollFormState = {
            jop: "",
            jumboRoll: "",
            jumboRollId: null,
            grade: "",
            gsm: "",
            visual: "OK",
            status: "OK",
            rollNumber: defaultRoll,
            formNumber: "",
            plybond: "",
            diameter: "",
            width: "",
            thickness: "",
            bulk: "",
            core: "76",
            exMaterial: "IMPORT",
            cobb: "",
            shift: "1",
            entry_date: new Date().toISOString().split("T")[0],
            pic: "",
        };
        const saved = sessionStorage.getItem("incomingRoll_form");
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                ...defaultState,
                ...parsed,
                gsm: sanitizeNumeric(parsed.gsm || "", false),
                width: sanitizeNumeric(parsed.width || "", false),
                plybond: sanitizeNumeric(parsed.plybond || "", true),
                thickness: sanitizeNumeric(parsed.thickness || "", true),
                core: sanitizeNumeric(parsed.core || "", true),
                bulk: sanitizeNumeric(parsed.bulk || "", true),
                cobb: sanitizeNumeric(parsed.cobb || "", true),
                jumboRoll:
                    parsed.jumboRoll !== undefined ? parsed.jumboRoll : "",
                jumboRollId:
                    parsed.jumboRollId !== undefined
                        ? parsed.jumboRollId
                        : null,
                rollNumber:
                    parsed.rollNumber !== undefined && parsed.rollNumber !== ""
                        ? parsed.rollNumber
                        : defaultRoll,
            };
        }
        return defaultState;
    });

    useEffect(() => {
        if (recommendedRoll && !form.rollNumber.trim()) {
            setForm((f) => ({ ...f, rollNumber: recommendedRoll }));
        }
    }, [recommendedRoll]);

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
    const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
    const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

    useEffect(() => {
        const trimmed = (form.rollNumber || "").trim();
        if (!trimmed || trimmed === savedRollNumber) {
            setDuplicateWarning(null);
            return;
        }

        const timer = setTimeout(() => {
            setIsCheckingDuplicate(true);
            axios
                .get(
                    `/incoming-roll/check-roll-number?rollNumber=${encodeURIComponent(trimmed)}`,
                )
                .then((res) => {
                    if (res.data?.exists) {
                        setDuplicateWarning(res.data);
                    } else {
                        setDuplicateWarning(null);
                    }
                })
                .catch(() => {
                    setDuplicateWarning(null);
                })
                .finally(() => {
                    setIsCheckingDuplicate(false);
                });
        }, 400);

        return () => clearTimeout(timer);
    }, [form.rollNumber, savedRollNumber]);

    const availableJumboRolls = useMemo(() => {
        if (!form.jop) return [];
        const found = jops.find(
            (j) => j.jop === form.jop || String(j.id) === form.jop,
        );
        const jopId = found?.id;
        const fromProps = (jumboRolls as any[]).filter((jr) => {
            if (jopId && String(jr.jops_id) === String(jopId)) return true;
            if (jr.jop?.jop && jr.jop.jop === form.jop) return true;
            return false;
        });
        const fromJop =
            ((found?.jumboRolls || (found as any)?.jumbo_rolls) || []) as any[];
        const map = new Map<string, any>();
        [...fromProps, ...fromJop].forEach((jr) => {
            if (jr && jr.jumbo_roll_number) {
                map.set(jr.jumbo_roll_number.toUpperCase(), jr);
            }
        });
        return Array.from(map.values());
    }, [form.jop, jops, jumboRolls]);

    useEffect(() => {
        if (!form.jop) return;

        axios
            .get(
                `/incoming-roll/recommend-jumbo?jop=${encodeURIComponent(form.jop)}`,
            )
            .then((res) => {
                if (res.data && res.data.jumbo_roll) {
                    setForm((f) => {
                        if (!f.jumboRoll || f.jumboRoll.startsWith("JR-")) {
                            return {
                                ...f,
                                jumboRoll: res.data.jumbo_roll,
                                jumboRollId:
                                    res.data.jumbo_roll_id || f.jumboRollId,
                            };
                        }
                        return f;
                    });
                }
            })
            .catch(() => {});
    }, [form.jop]);

    useEffect(() => {
        if (!form.jop) return;

        axios
            .post("/incoming-roll/recommend-form", {
                jop: form.jop,
                grade: form.grade,
                width: form.width,
                entry_date: form.entry_date,
                jumbo_roll: form.jumboRoll,
            })
            .then((res) => {
                if (res.data && res.data.formNumber) {
                    setForm((f) => ({
                        ...f,
                        formNumber: String(res.data.formNumber),
                    }));
                }
            })
            .catch((err) => {
                console.error("Failed to fetch recommended form number:", err);
            });
    }, [form.jop, form.grade, form.width, form.entry_date, form.jumboRoll]);

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

        let widthVal = "";
        if (found) {
            const wObj = found.rollsWidth || found.rolls_width || found.width;
            if (typeof wObj === "object" && wObj !== null && "width" in wObj) {
                widthVal = String(wObj.width);
            } else if (wObj !== undefined && wObj !== null) {
                widthVal = String(wObj);
            }
        }

        let plybondVal = "";
        if (found) {
            const pb = found.plybond;
            if (typeof pb === "object" && pb !== null && "plybonds" in pb) {
                plybondVal = String(pb.plybonds);
            } else if (pb !== undefined && pb !== null) {
                plybondVal = String(pb);
            }
        }

        let thicknessVal = "";
        if (found) {
            const th = found.thickness;
            if (typeof th === "object" && th !== null && "thickness" in th) {
                thicknessVal = String(th.thickness);
            } else if (th !== undefined && th !== null) {
                thicknessVal = String(th);
            }
        }

        let coreVal = "";
        if (found) {
            const cr = found.core;
            if (typeof cr === "object" && cr !== null && "core" in cr) {
                coreVal = String(cr.core);
            } else if (cr !== undefined && cr !== null) {
                coreVal = String(cr);
            }
        }

        // Auto-resolve Jumbo Roll Number based on selected JOP
        let autoJumboRoll = "";
        let autoJumboRollId: number | null = null;

        const foundJopId = found?.id;
        const matchingJumbos = (jumboRolls as any[]).filter((jr) => {
            if (foundJopId && String(jr.jops_id) === String(foundJopId))
                return true;
            if (jr.jop?.jop && jr.jop.jop === selectedJop) return true;
            return false;
        });
        const jopJumbos =
            ((found?.jumboRolls || (found as any)?.jumbo_rolls) || []) as any[];
        const combined = [...matchingJumbos, ...jopJumbos];

        if (combined.length > 0) {
            const inProgress = combined.find(
                (jr) => jr.status === "IN_PROGRESS",
            );
            const chosen = inProgress || combined[0];
            autoJumboRoll = chosen.jumbo_roll_number;
            autoJumboRollId = chosen.id;
        } else if (selectedJop) {
            const jopCode = found?.jop || selectedJop;
            if (/^JOP-/i.test(jopCode)) {
                autoJumboRoll = jopCode.replace(/^JOP-/i, "JR-");
            } else if (!/^JR-/i.test(jopCode)) {
                autoJumboRoll = `JR-${jopCode}`;
            } else {
                autoJumboRoll = jopCode;
            }
        }

        setForm((f) => ({
            ...f,
            jop: selectedJop,
            jumboRoll: autoJumboRoll || f.jumboRoll,
            jumboRollId:
                autoJumboRollId !== null ? autoJumboRollId : f.jumboRollId,
            grade: gradeVal,
            gsm: gsmVal,
            width: widthVal,
            plybond: plybondVal || f.plybond,
            thickness: thicknessVal || f.thickness,
            core: coreVal || f.core,
        }));

        setErrors((err) => ({
            ...err,
            jop: undefined,
            jumboRoll: undefined,
            grade: undefined,
            gsm: undefined,
            plybond: undefined,
            thickness: undefined,
            core: undefined,
        }));
    }

    function validateStep1(): boolean {
        const errs: Record<string, string> = {};

        if (!form.jop.trim()) errs.jop = "JOP is required.";
        if (!form.jumboRoll.trim())
            errs.jumboRoll =
                "Jumbo Roll Number is required (Select JOP first).";
        if (!form.grade.trim())
            errs.grade = "Grade is required (Select JOP first).";

        // GSM Validation (Numeric only)
        if (!form.gsm.trim()) {
            errs.gsm = "GSM is required (Select JOP first).";
        } else if (
            isNaN(Number(form.gsm.replace(",", "."))) ||
            Number(form.gsm.replace(",", ".")) <= 0
        ) {
            errs.gsm = "GSM must be a valid positive number.";
        }

        if (!form.visual.trim()) errs.visual = "Visual status is required.";
        if (!form.rollNumber.trim()) {
            errs.rollNumber = "Roll number is required.";
        } else if (duplicateWarning && form.rollNumber !== savedRollNumber) {
            errs.rollNumber =
                "Roll number is already registered in the database (Anti-Duplicate). Please use another roll number.";
        }
        if (!form.formNumber.trim())
            errs.formNumber = "Form number is required.";

        // Plybond Validation (Numeric only)
        if (!form.plybond.trim()) {
            errs.plybond = "Plybond is required.";
        } else if (
            isNaN(Number(form.plybond.replace(",", "."))) ||
            Number(form.plybond.replace(",", ".")) <= 0
        ) {
            errs.plybond = "Plybond must be a valid positive number.";
        }

        if (!form.diameter.trim()) errs.diameter = "Roll diameter is required.";

        // Roll Width (RW) Validation (Numeric only)
        if (!form.width.trim()) {
            errs.width = "Roll width is required.";
        } else if (
            isNaN(Number(form.width.replace(",", "."))) ||
            Number(form.width.replace(",", ".")) <= 0
        ) {
            errs.width = "Roll width (RW) must be a valid positive number.";
        }

        // Thickness Validation (Numeric only)
        if (!form.thickness.trim()) {
            errs.thickness = "Thickness is required.";
        } else if (
            isNaN(Number(form.thickness.replace(",", "."))) ||
            Number(form.thickness.replace(",", ".")) <= 0
        ) {
            errs.thickness = "Thickness must be a valid positive number.";
        }

        // Bulk Validation (Numeric only)
        if (!form.bulk.trim()) {
            errs.bulk = "Bulk is required.";
        } else if (
            isNaN(Number(form.bulk.replace(",", "."))) ||
            Number(form.bulk.replace(",", ".")) <= 0
        ) {
            errs.bulk = "Bulk must be a valid positive number.";
        }

        // Core Validation (Numeric only)
        if (!form.core.trim()) {
            errs.core = "Core is required.";
        } else if (
            isNaN(Number(form.core.replace(",", "."))) ||
            Number(form.core.replace(",", ".")) <= 0
        ) {
            errs.core = "Core must be a valid positive number.";
        }
        if (!form.exMaterial.trim())
            errs.exMaterial = "Ex material is required.";

        // Cobb Validation (Numeric only)
        if (!form.cobb.trim()) {
            errs.cobb = "Cobb is required.";
        } else if (
            isNaN(Number(form.cobb.replace(",", "."))) ||
            Number(form.cobb.replace(",", ".")) <= 0
        ) {
            errs.cobb = "Cobb must be a valid positive number.";
        }

        if (!form.shift.trim()) errs.shift = "Shift is required.";
        if (!form.entry_date.trim())
            errs.entry_date = "Production Date is required.";
        if (!form.pic.trim()) errs.pic = "PIC (Officer) is required.";

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
            jumbo_roll: form.jumboRoll,
            jumbo_roll_id: form.jumboRollId,
            jumboRoll: form.jumboRoll,
            jumboRollId: form.jumboRollId,
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
            status: form.status,
            entry_date: form.entry_date,
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

            // Update last saved roll number and recommend next (+1)
            const savedRoll = form.rollNumber;
            const nextRec =
                res.data?.recommended_roll_number ||
                calculateNextRollNumber(savedRoll);

            setSavedRollNumber(savedRoll);
            setRecommendedRoll(nextRec);
            sessionStorage.setItem("incomingRoll_lastSaved", savedRoll);
            sessionStorage.setItem("incomingRoll_recommended", nextRec);

            // Instantly refresh jopList props from server for real-time tonnage tracking
            router.reload({ only: ["jopList"] });

            setStep(3);
        } catch (err: any) {
            console.error("[Roll Save Error]:", err);
            const errorMsg =
                err.response?.data?.message ||
                "Failed to save roll data to database.";

            if (err.response?.status === 422) {
                if (errorMsg.includes("Roll Number")) {
                    setErrors({ rollNumber: errorMsg });
                } else if (errorMsg.includes("Form Number")) {
                    setErrors({ formNumber: errorMsg });
                }
            }

            SystemUI.toast({ message: errorMsg, type: "error" });
        }
    }

    function handleRegisterNewRoll() {
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
            jumboRoll: "",
            jumboRollId: null,
            grade: "",
            gsm: "",
            visual: "OK",
            status: "OK",
            rollNumber: recommendedRoll || "",
            formNumber: "",
            plybond: "",
            diameter: "",
            width: "",
            thickness: "",
            bulk: "",
            core: "76",
            exMaterial: "IMPORT",
            cobb: "",
            shift: "1",
            entry_date: new Date().toISOString().split("T")[0],
            pic: "",
        });
        setErrors({});
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
                {STEPS.map((s, i) => (
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
                                className={`text-xs font-semibold whitespace-nowrap min-[680px]:inline hidden ${
                                    i === step
                                        ? "text-blue-700 font-bold"
                                        : "text-slate-500"
                                }`}
                            >
                                {s}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div
                                className={`flex-1 h-0.5 mx-3 transition-colors ${
                                    i < step ? "bg-green-500" : "bg-slate-200"
                                }`}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Step 0: Weight Detection */}
            {step === 0 && (
                <IncomingRoll_S1WeightDetection
                    onWeightConfirmed={handleWeightConfirmed}
                    form={form}
                    setForm={setForm}
                    recommendedRoll={recommendedRoll}
                    isCheckingDuplicate={isCheckingDuplicate}
                    duplicateWarning={duplicateWarning}
                    jopList={jopList}
                    jopSearch={jopSearch}
                    setJopSearch={setJopSearch}
                    handleJopSelect={handleJopSelect}
                />
            )}

            {/* Step 1: Form Data */}
            {step === 1 && (
                <IncomingRoll_S2FormData
                    weight={weight}
                    form={form}
                    setForm={setForm}
                    errors={errors}
                    setErrors={setErrors}
                    recommendedRoll={recommendedRoll}
                    duplicateWarning={duplicateWarning}
                    isCheckingDuplicate={isCheckingDuplicate}
                    jops={jops}
                    availableJumboRolls={availableJumboRolls}
                    handleJopSelect={handleJopSelect}
                    onBack={() => setStep(0)}
                    onNext={goToStep2}
                />
            )}

            {/* Step 2: Review & Save */}
            {step === 2 && (
                <IncomingRoll_S3ReviewData
                    weight={weight}
                    form={form}
                    onBack={() => setStep(1)}
                    onConfirmSave={() => setShowConfirmModal(true)}
                />
            )}

            {/* Step 3: Print Label & Dynamic QR Generation */}
            {step === 3 && (
                <IncomingRoll_S4PrintLabel
                    weight={weight}
                    form={form}
                    onEdit={() => setStep(1)}
                    onRegisterNewRoll={handleRegisterNewRoll}
                />
            )}

            {/* Confirm Save Modal */}
            <IncomingRoll_ConfirmSaveModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleSave}
            />
        </div>
    );
}
