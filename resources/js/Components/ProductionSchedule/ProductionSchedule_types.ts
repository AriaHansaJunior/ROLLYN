export interface JopOption {
    id: number;
    spk: string;
    jop: string;
    po: string;
    customer: string | null;
    grade: string | null;
    gsm: number | null;
    plybond: number | null;
    thickness: number | null;
    core: string | null;
    tph?: number | null;
}

export interface ScheduleRow {
    id: number;
    jops_id: number;
    spk: string;
    jop: string;
    po: string;
    customer: string | null;
    grade: string | null;
    gsm: number | null;
    plybond: number | null;
    thickness: number | null;
    core: string | null;
    tonnage: number;
    rewinder_cut: string | null;
    tph: number;
    production_hours: number;
    start_time: string;
    stop_time: string;
    remark: string | null;
    status: string;
}

export interface ProductionScheduleFormData {
    jops_id: string;
    tonnage: string;
    rewinder_cut: string;
    tph: string;
    start_time: string;
    remark: string;
    status: string;
}

export const EMPTY_FORM: ProductionScheduleFormData = {
    jops_id: "",
    tonnage: "",
    rewinder_cut: "",
    tph: "20",
    start_time: "",
    remark: "",
    status: "OPEN",
};
