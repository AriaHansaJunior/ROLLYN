import React, { useState, useMemo } from "react";
import { usePage, router, Link } from "@inertiajs/react";
import {
    Disc,
    Plus,
    Search,
    Filter,
    Calendar,
    TrendingUp,
    Eye,
    Edit3,
    Trash2,
    X,
    Link2,
    Unlink,
    CheckCircle,
    Clock,
    ArrowUpRight,
    FileText,
    Layers,
    Package,
    AlertCircle,
    Scale,
    TruckIcon,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { SystemUI } from "@/Utils/SystemUI";
import axios from "axios";

interface JopOption {
    id: number;
    jop: string;
    spk: string;
    po: string;
    customer: string;
    grade: string;
    gsm: number | null;
    width: number | null;
    weight: number | null;
    quantity: number | null;
}

interface IncomingRollItem {
    no: number;
    no_roll: string;
    form: number | string | null;
    weight: number;
    grade: string;
    gsm: string | number;
    shift: string;
    width?: number | null;
    diameter?: number | null;
    core?: string | null;
    status: string;
    location: string;
    entry_date: string;
    pic?: string;
}

interface JumboRollItem {
    id: number;
    jumbo_roll_number: string;
    jops_id: number;
    weight: number;
    production_date: string | null;
    status: string;
    notes: string | null;
    created_at: string | null;
    user: string;
    jop: {
        id: number;
        jop: string;
        spk: string;
        po: string;
        customer: string;
        grade: string;
        gsm: number | null;
        width: number | null;
        target_weight: number | null;
    };
    rolls_count: number;
    total_cut_weight: number;
    remaining_weight: number;
    yield_percentage: number;
    rolls: IncomingRollItem[];
}

interface SummaryData {
    totalJumboRolls: number;
    totalJumboWeight: number;
    totalCutRolls: number;
    totalCutWeight: number;
    averageYield: number;
}

const EMPTY_FORM = {
    jumbo_roll_number: "",
    jops_id: "",
    weight: "",
    production_date: new Date().toISOString().split("T")[0],
    status: "IN_PROGRESS",
    notes: "",
};

export default function JumboRoll() {
    const {
        jumboRolls = [],
        jopList = [],
        summary = {
            totalJumboRolls: 0,
            totalJumboWeight: 0,
            totalCutRolls: 0,
            totalCutWeight: 0,
            averageYield: 0,
        },
        filters = { search: "", status: "", date_from: "", date_to: "" },
        auth,
    } = usePage<any>().props;

    const userRole = (auth?.user?.role || "admin").toLowerCase();
    const canManage = userRole === "admin" || userRole === "production" || userRole === "ppic";

    // Filter states
    const [searchTerm, setSearchTerm] = useState(filters.search || "");
    const [statusFilter, setStatusFilter] = useState(filters.status || "ALL");
    const [dateFilter, setDateFilter] = useState(filters.date_from || "");

    // Modal states
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    // Detail modal states
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedJumbo, setSelectedJumbo] = useState<JumboRollItem | null>(null);

    // Link rolls modal states
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [availableRolls, setAvailableRolls] = useState<IncomingRollItem[]>([]);
    const [selectedRollNos, setSelectedRollNos] = useState<number[]>([]);
    const [loadingAvailable, setLoadingAvailable] = useState(false);
    const [linking, setLinking] = useState(false);
    const [linkRollSearch, setLinkRollSearch] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Filtered items
    const filteredJumboRolls = useMemo(() => {
        return (jumboRolls as JumboRollItem[]).filter((jr) => {
            const matchesSearch =
                searchTerm === "" ||
                jr.jumbo_roll_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                jr.jop?.jop?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                jr.jop?.spk?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                jr.jop?.po?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                jr.jop?.customer?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus =
                statusFilter === "ALL" || statusFilter === "" || jr.status === statusFilter;

            const matchesDate =
                dateFilter === "" || jr.production_date === dateFilter;

            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [jumboRolls, searchTerm, statusFilter, dateFilter]);

    // Paginated rows
    const totalPages = Math.ceil(filteredJumboRolls.length / pageSize) || 1;
    const paginatedRolls = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredJumboRolls.slice(start, start + pageSize);
    }, [filteredJumboRolls, currentPage]);

    // Selected JOP in form
    const currentSelectedJop = useMemo(() => {
        if (!form.jops_id) return null;
        return (jopList as JopOption[]).find((j) => String(j.id) === String(form.jops_id)) || null;
    }, [form.jops_id, jopList]);

    // Open create modal
    function handleOpenCreate() {
        setEditingId(null);
        setForm({
            ...EMPTY_FORM,
            production_date: new Date().toISOString().split("T")[0],
        });
        setFormErrors({});
        setShowFormModal(true);
    }

    // Open edit modal
    function handleOpenEdit(item: JumboRollItem) {
        setEditingId(item.id);
        setForm({
            jumbo_roll_number: item.jumbo_roll_number,
            jops_id: String(item.jops_id),
            weight: String(item.weight),
            production_date: item.production_date || "",
            status: item.status || "IN_PROGRESS",
            notes: item.notes || "",
        });
        setFormErrors({});
        setShowFormModal(true);
    }

    // Save form (create / update)
    async function handleSaveForm(e: React.FormEvent) {
        e.preventDefault();

        // Client-side validation
        const errors: Record<string, string> = {};
        if (!form.jumbo_roll_number.trim()) {
            errors.jumbo_roll_number = "Jumbo Roll Number is required.";
        }
        if (!form.jops_id) {
            errors.jops_id = "Please select an associated JOP.";
        }
        const weightNum = parseFloat(form.weight);
        if (!form.weight || isNaN(weightNum) || weightNum <= 0) {
            errors.weight = "Please enter a valid weight in kg.";
        }
        if (!form.production_date) {
            errors.production_date = "Production Date is required.";
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSaving(true);
        setFormErrors({});

        try {
            const payload = {
                jumbo_roll_number: form.jumbo_roll_number.trim(),
                jops_id: parseInt(form.jops_id, 10),
                weight: weightNum,
                production_date: form.production_date,
                status: form.status,
                notes: form.notes.trim() || null,
            };

            if (editingId) {
                await axios.put(`/jumbo-roll/${editingId}`, payload);
                SystemUI.toast({
                    message: `Jumbo Roll ${form.jumbo_roll_number} updated successfully.`,
                    type: "success",
                });
            } else {
                await axios.post("/jumbo-roll", payload);
                SystemUI.toast({
                    message: `Jumbo Roll ${form.jumbo_roll_number} created successfully.`,
                    type: "success",
                });
            }

            setShowFormModal(false);
            router.reload();
        } catch (err: any) {
            if (err.response?.status === 422 && err.response.data?.errors) {
                const apiErrors: Record<string, string> = {};
                for (const key of Object.keys(err.response.data.errors)) {
                    apiErrors[key] = err.response.data.errors[key][0];
                }
                setFormErrors(apiErrors);
            } else {
                SystemUI.toast({
                    message: err.response?.data?.message || "Failed to save Jumbo Roll.",
                    type: "error",
                });
            }
        } finally {
            setSaving(false);
        }
    }

    // Safe Delete
    async function handleDelete(item: JumboRollItem) {
        // Safe check: if associated rolls exist, block with styled SystemUI alert
        if (item.rolls_count > 0) {
            await SystemUI.alert({
                title: "Cannot Delete Jumbo Roll",
                message: `Jumbo Roll "${item.jumbo_roll_number}" is currently associated with ${item.rolls_count} Incoming Roll(s). You must unassign or remove these rolls before deleting to protect production data integrity.`,
            });
            return;
        }

        const confirmed = await SystemUI.confirm({
            title: "Delete Jumbo Roll",
            message: `Are you sure you want to delete Jumbo Roll "${item.jumbo_roll_number}"? This action cannot be undone.`,
            confirmText: "Delete",
            cancelText: "Cancel",
        });

        if (!confirmed) return;

        try {
            const res = await axios.delete(`/jumbo-roll/${item.id}`);
            SystemUI.toast({
                message: res.data?.message || "Jumbo Roll deleted successfully.",
                type: "success",
            });
            router.reload();
        } catch (err: any) {
            SystemUI.toast({
                message: err.response?.data?.message || "Failed to delete Jumbo Roll.",
                type: "error",
            });
        }
    }

    // Open detail modal
    async function handleOpenDetail(item: JumboRollItem) {
        try {
            const res = await axios.get(`/jumbo-roll/${item.id}`);
            setSelectedJumbo(res.data);
            setShowDetailModal(true);
        } catch {
            setSelectedJumbo(item);
            setShowDetailModal(true);
        }
    }

    // Refresh detail
    async function refreshDetail(id: number) {
        try {
            const res = await axios.get(`/jumbo-roll/${id}`);
            setSelectedJumbo(res.data);
        } catch {
            // fallback
        }
    }

    // Unlink / Remove an incoming roll from jumbo roll
    async function handleRemoveRoll(rollNo: number | string, rollNumber: string) {
        if (!selectedJumbo) return;

        const confirmed = await SystemUI.confirm({
            title: "Unlink Incoming Roll",
            message: `Remove Incoming Roll "${rollNumber}" from Jumbo Roll "${selectedJumbo.jumbo_roll_number}"? The roll will remain intact in inventory as an independent roll.`,
            confirmText: "Unlink",
            cancelText: "Cancel",
        });

        if (!confirmed) return;

        try {
            await axios.delete(`/jumbo-roll/${selectedJumbo.id}/rolls/${rollNo}`);
            SystemUI.toast({
                message: `Incoming Roll ${rollNumber} unlinked successfully.`,
                type: "success",
            });
            await refreshDetail(selectedJumbo.id);
            router.reload();
        } catch (err: any) {
            SystemUI.toast({
                message: err.response?.data?.message || "Failed to unlink roll.",
                type: "error",
            });
        }
    }

    // Open Link rolls modal
    async function handleOpenLinkModal() {
        if (!selectedJumbo) return;
        setLoadingAvailable(true);
        setSelectedRollNos([]);
        setLinkRollSearch("");
        setShowLinkModal(true);

        try {
            const res = await axios.get(`/jumbo-roll/${selectedJumbo.id}/available-rolls`);
            setAvailableRolls(res.data || []);
        } catch (err: any) {
            SystemUI.toast({
                message: "Failed to load candidate incoming rolls.",
                type: "error",
            });
            setAvailableRolls([]);
        } finally {
            setLoadingAvailable(false);
        }
    }

    // Toggle roll selection
    function toggleRollSelection(rollNo: number) {
        setSelectedRollNos((prev) =>
            prev.includes(rollNo) ? prev.filter((id) => id !== rollNo) : [...prev, rollNo]
        );
    }

    // Submit linked rolls
    async function handleSaveLinkedRolls() {
        if (!selectedJumbo || selectedRollNos.length === 0) return;

        setLinking(true);
        try {
            const res = await axios.post(`/jumbo-roll/${selectedJumbo.id}/assign-rolls`, {
                roll_ids: selectedRollNos,
            });
            SystemUI.toast({
                message: res.data?.message || "Incoming rolls linked successfully.",
                type: "success",
            });
            setShowLinkModal(false);
            await refreshDetail(selectedJumbo.id);
            router.reload();
        } catch (err: any) {
            SystemUI.toast({
                message: err.response?.data?.message || "Failed to link incoming rolls.",
                type: "error",
            });
        } finally {
            setLinking(false);
        }
    }

    // Helper formatting
    function formatWeight(kg: number | null | undefined): string {
        if (kg === null || kg === undefined) return "0 kg";
        return `${Number(kg).toLocaleString("en-US", { maximumFractionDigits: 2 })} kg`;
    }

    function formatTonnage(kg: number | null | undefined): string {
        if (!kg) return "0.00 MT";
        return `${(kg / 1000).toFixed(2)} MT`;
    }

    function formatDate(dateStr: string | null | undefined): string {
        if (!dateStr) return "—";
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
        } catch {
            return dateStr;
        }
    }

    const filteredAvailableRolls = useMemo(() => {
        if (!linkRollSearch.trim()) return availableRolls;
        const q = linkRollSearch.toLowerCase();
        return availableRolls.filter(
            (r) =>
                r.no_roll.toLowerCase().includes(q) ||
                (r.form && String(r.form).includes(q)) ||
                r.grade.toLowerCase().includes(q)
        );
    }, [availableRolls, linkRollSearch]);

    return (
        <div className="py-4 px-2.5 sm:px-6 space-y-5">
            {/* Page Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                            <Disc size={18} />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                            Jumbo Roll
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Track raw paper jumbo rolls, cutting/rewinding outputs, and associated incoming rolls.
                    </p>
                </div>
                {canManage && (
                    <button
                        onClick={handleOpenCreate}
                        className="btn btn-primary flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                    >
                        <Plus size={15} />
                        <span>New Jumbo Roll</span>
                    </button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Total Jumbo Rolls */}
                <div className="card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <Disc size={20} />
                    </div>
                    <div>
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                            Total Jumbo Rolls
                        </div>
                        <div className="text-xl font-extrabold text-slate-900">
                            {summary.totalJumboRolls}
                        </div>
                    </div>
                </div>

                {/* Total Jumbo Weight */}
                <div className="card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <Scale size={20} />
                    </div>
                    <div>
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                            Total Jumbo Weight
                        </div>
                        <div className="text-xl font-extrabold text-slate-900">
                            {formatTonnage(summary.totalJumboWeight)}
                            <span className="text-xs font-medium text-slate-500 ml-1.5">
                                ({formatWeight(summary.totalJumboWeight)})
                            </span>
                        </div>
                    </div>
                </div>

                {/* Rewinders / Incoming Rolls Cut */}
                <div className="card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                        <TruckIcon size={20} />
                    </div>
                    <div>
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                            Rewinder Rolls Cut
                        </div>
                        <div className="text-xl font-extrabold text-slate-900">
                            {summary.totalCutRolls}
                            <span className="text-xs font-medium text-slate-500 ml-1.5">
                                Rolls Produced
                            </span>
                        </div>
                    </div>
                </div>

                {/* Total Cut Weight & Average Yield */}
                <div className="card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                            Cut Weight & Yield
                        </div>
                        <div className="text-xl font-extrabold text-slate-900">
                            {formatTonnage(summary.totalCutWeight)}
                            <span className="text-xs font-bold text-emerald-600 ml-1.5">
                                ({summary.averageYield}%)
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="card p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                            type="text"
                            placeholder="Search Jumbo Roll No, JOP, SPK, Customer..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="form-input text-xs pl-8 w-full"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="w-36">
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="form-input text-xs w-full py-1.5"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="HOLD">On Hold</option>
                        </select>
                    </div>

                    {/* Date Filter */}
                    <div className="w-40">
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => {
                                setDateFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="form-input text-xs w-full py-1.5"
                            title="Filter by Production Date"
                        />
                    </div>

                    {(searchTerm || statusFilter !== "ALL" || dateFilter) && (
                        <button
                            onClick={() => {
                                setSearchTerm("");
                                setStatusFilter("ALL");
                                setDateFilter("");
                                setCurrentPage(1);
                            }}
                            className="btn btn-secondary btn-sm py-1.5 px-2 text-[11px] text-slate-600 hover:text-slate-900"
                        >
                            Clear
                        </button>
                    )}
                </div>

                <div className="text-xs text-slate-500 font-medium">
                    Showing <strong>{filteredJumboRolls.length}</strong> Jumbo Rolls
                </div>
            </div>

            {/* Jumbo Roll Table */}
            <div className="card overflow-x-auto shadow-sm">
                <table className="data-table w-full min-w-[1000px] text-xs">
                    <thead>
                        <tr>
                            <th style={{ textAlign: "left", width: "160px" }}>Jumbo Roll No</th>
                            <th style={{ textAlign: "left" }}>Associated JOP & Order</th>
                            <th style={{ textAlign: "center", width: "120px" }}>Jumbo Weight</th>
                            <th style={{ textAlign: "center", width: "120px" }}>Prod. Date</th>
                            <th style={{ textAlign: "center", width: "130px" }}>Rewinder Rolls</th>
                            <th style={{ textAlign: "center", width: "140px" }}>Cut Weight & Yield</th>
                            <th style={{ textAlign: "center", width: "110px" }}>Status</th>
                            <th style={{ textAlign: "center", width: "120px" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedRolls.length > 0 ? (
                            paginatedRolls.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                                    {/* Jumbo Roll No */}
                                    <td className="font-mono font-bold text-slate-900">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0 font-bold">
                                                JR
                                            </div>
                                            <div>
                                                <div className="font-extrabold text-blue-900 text-xs">
                                                    {row.jumbo_roll_number}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-normal">
                                                    ID: #{row.id}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* JOP & SPK */}
                                    <td>
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-slate-800">
                                                    {row.jop.jop}
                                                </span>
                                                <span className="text-[11px] text-slate-400 font-mono">
                                                    ({row.jop.spk})
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                                <span>{row.jop.customer}</span>
                                                <span>•</span>
                                                <span className="font-medium text-slate-700">
                                                    {row.jop.grade} {row.jop.gsm ? `${row.jop.gsm} GSM` : ""}
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Weight */}
                                    <td className="text-center font-mono">
                                        <div className="font-bold text-slate-900">
                                            {formatWeight(row.weight)}
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                            {formatTonnage(row.weight)}
                                        </div>
                                    </td>

                                    {/* Production Date */}
                                    <td className="text-center text-slate-700 font-medium">
                                        {formatDate(row.production_date)}
                                    </td>

                                    {/* Rewinder / Incoming Rolls Count */}
                                    <td className="text-center">
                                        <button
                                            onClick={() => handleOpenDetail(row)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                                            title="Click to view associated incoming rolls"
                                        >
                                            <Layers size={12} />
                                            <span>{row.rolls_count} {row.rolls_count === 1 ? "Roll" : "Rolls"}</span>
                                        </button>
                                    </td>

                                    {/* Cut Weight & Yield */}
                                    <td className="text-center">
                                        <div className="font-mono font-bold text-slate-800">
                                            {formatWeight(row.total_cut_weight)}
                                        </div>
                                        <div className="text-[10px] font-semibold text-emerald-600">
                                            Yield: {row.yield_percentage}%
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="text-center">
                                        {row.status === "COMPLETED" ? (
                                            <span className="badge badge-success inline-flex items-center gap-1">
                                                <CheckCircle size={10} />
                                                <span>Completed</span>
                                            </span>
                                        ) : row.status === "HOLD" ? (
                                            <span className="badge badge-warning inline-flex items-center gap-1">
                                                <AlertCircle size={10} />
                                                <span>On Hold</span>
                                            </span>
                                        ) : (
                                            <span className="badge badge-info inline-flex items-center gap-1">
                                                <Clock size={10} />
                                                <span>In Progress</span>
                                            </span>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => handleOpenDetail(row)}
                                                className="btn btn-secondary btn-sm py-1 px-2 text-[11px] flex items-center gap-1 cursor-pointer"
                                                title="View Details & Associated Rolls"
                                            >
                                                <Eye size={12} />
                                                <span>View</span>
                                            </button>
                                            {canManage && (
                                                <>
                                                    <button
                                                        onClick={() => handleOpenEdit(row)}
                                                        className="btn btn-secondary btn-sm py-1 px-2 text-[11px] flex items-center gap-1 cursor-pointer"
                                                        title="Edit Jumbo Roll"
                                                    >
                                                        <Edit3 size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(row)}
                                                        className="btn btn-sm py-1 px-2 text-[11px] flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 cursor-pointer"
                                                        title="Delete Jumbo Roll"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="text-center py-16 text-slate-400">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <Disc size={44} className="text-slate-300 stroke-1" />
                                        <div className="text-lg font-bold text-slate-700">
                                            No Jumbo Rolls found
                                        </div>
                                        <div className="text-sm sm:text-base text-slate-500 max-w-md text-center leading-relaxed">
                                            <div>No Jumbo Roll records match your current filter.</div>
                                            <div className="mt-1">
                                                Click <strong className="text-blue-600 font-semibold">New Jumbo Roll</strong> to register an initial large paper roll.
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                    <div>
                        Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (
                        {filteredJumboRolls.length} total)
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className="btn btn-secondary btn-sm flex items-center gap-1"
                        >
                            <ChevronLeft size={13} />
                            <span>Previous</span>
                        </button>
                        <button
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className="btn btn-secondary btn-sm flex items-center gap-1"
                        >
                            <span>Next</span>
                            <ChevronRight size={13} />
                        </button>
                    </div>
                </div>
            )}

            {/* CREATE / EDIT MODAL */}
            {showFormModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-slate-50/70 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
                                    <Disc size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                                        {editingId ? "Edit Jumbo Roll" : "Register New Jumbo Roll"}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                                        Record the initial large paper roll entering production
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowFormModal(false)}
                                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer p-2 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSaveForm} className="p-5 sm:p-7 space-y-5 overflow-y-auto">
                            {/* JOP Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Associated JOP <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={form.jops_id}
                                    onChange={(e) => {
                                        setForm((f) => ({ ...f, jops_id: e.target.value }));
                                        if (formErrors.jops_id) setFormErrors((err) => ({ ...err, jops_id: "" }));
                                    }}
                                    className={`form-input w-full h-11 text-sm rounded-lg px-3.5 ${formErrors.jops_id ? "border-red-500" : ""}`}
                                >
                                    <option value="">-- Select JOP --</option>
                                    {(jopList as JopOption[]).map((j) => (
                                        <option key={j.id} value={j.id}>
                                            {j.jop} ({j.spk}) — {j.customer} — {j.grade} {j.gsm ? `${j.gsm} GSM` : ""}
                                        </option>
                                    ))}
                                </select>
                                {formErrors.jops_id && (
                                    <p className="text-red-600 text-xs mt-1">{formErrors.jops_id}</p>
                                )}
                            </div>

                            {/* Auto-populated JOP Info Preview */}
                            {currentSelectedJop && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-100 rounded-xl text-xs sm:text-sm">
                                    <div>
                                        <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">
                                            SPK / PO
                                        </span>
                                        <span className="font-bold text-slate-800 text-sm sm:text-base">
                                            {currentSelectedJop.spk}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">
                                            Customer
                                        </span>
                                        <span className="font-bold text-slate-800 text-sm sm:text-base">
                                            {currentSelectedJop.customer}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">
                                            Grade & GSM
                                        </span>
                                        <span className="font-bold text-slate-800 text-sm sm:text-base">
                                            {currentSelectedJop.grade} {currentSelectedJop.gsm ? `${currentSelectedJop.gsm}g` : ""}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">
                                            Target Weight
                                        </span>
                                        <span className="font-bold text-slate-800 text-sm sm:text-base">
                                            {currentSelectedJop.weight ? `${currentSelectedJop.weight} kg` : "—"}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Jumbo Roll Number & Weight */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Jumbo Roll Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. JR-001"
                                        value={form.jumbo_roll_number}
                                        onChange={(e) => {
                                            setForm((f) => ({ ...f, jumbo_roll_number: e.target.value }));
                                            if (formErrors.jumbo_roll_number)
                                                setFormErrors((err) => ({ ...err, jumbo_roll_number: "" }));
                                        }}
                                        className={`form-input w-full h-11 text-sm sm:text-base font-mono font-bold rounded-lg px-3.5 ${
                                            formErrors.jumbo_roll_number ? "border-red-500" : ""
                                        }`}
                                    />
                                    {formErrors.jumbo_roll_number ? (
                                        <p className="text-red-600 text-xs mt-1">
                                            {formErrors.jumbo_roll_number}
                                        </p>
                                    ) : (
                                        <p className="text-slate-400 text-xs mt-1">
                                            Unique identifier for this jumbo paper roll
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Jumbo Roll Weight (kg) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        placeholder="e.g. 18500"
                                        value={form.weight}
                                        onChange={(e) => {
                                            setForm((f) => ({ ...f, weight: e.target.value }));
                                            if (formErrors.weight) setFormErrors((err) => ({ ...err, weight: "" }));
                                        }}
                                        className={`form-input w-full h-11 text-sm sm:text-base font-mono rounded-lg px-3.5 ${
                                            formErrors.weight ? "border-red-500" : ""
                                        }`}
                                    />
                                    {formErrors.weight ? (
                                        <p className="text-red-600 text-xs mt-1">{formErrors.weight}</p>
                                    ) : (
                                        <p className="text-slate-400 text-xs mt-1">
                                            {form.weight && parseFloat(form.weight) > 0
                                                ? `Equivalent to ${(parseFloat(form.weight) / 1000).toFixed(2)} Metric Tons`
                                                : "Weight in kilograms (typically 15,000–20,000 kg)"}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Production Date & Status */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Production Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={form.production_date}
                                        onChange={(e) => {
                                            setForm((f) => ({ ...f, production_date: e.target.value }));
                                            if (formErrors.production_date)
                                                setFormErrors((err) => ({ ...err, production_date: "" }));
                                        }}
                                        className={`form-input w-full h-11 text-sm rounded-lg px-3.5 ${
                                            formErrors.production_date ? "border-red-500" : ""
                                        }`}
                                    />
                                    {formErrors.production_date && (
                                        <p className="text-red-600 text-xs mt-1">
                                            {formErrors.production_date}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Status
                                    </label>
                                    <select
                                        value={form.status}
                                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                                        className="form-input w-full h-11 text-sm rounded-lg px-3.5 font-medium"
                                    >
                                        <option value="IN_PROGRESS">In Progress (Cutting / Rewinding)</option>
                                        <option value="COMPLETED">Completed (Fully Cut)</option>
                                        <option value="HOLD">On Hold</option>
                                    </select>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Notes & Remarks (Optional)
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Add any production notes, machine details, or cutting instructions..."
                                    value={form.notes}
                                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                                    className="form-input w-full text-sm rounded-lg p-3"
                                />
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowFormModal(false)}
                                    className="btn btn-secondary text-sm px-4 py-2.5 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn btn-primary text-sm font-bold px-6 py-2.5 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>{editingId ? "Update Jumbo Roll" : "Register Jumbo Roll"}</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DETAIL MODAL (SECTION 14: JUMBO ROLL DETAIL VIEW) */}
            {showDetailModal && selectedJumbo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                        {/* Detail Header */}
                        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0 font-extrabold text-sm">
                                    <Disc size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                                            Jumbo Roll: {selectedJumbo.jumbo_roll_number}
                                        </h3>
                                        <span
                                            className={`badge text-[11px] ${
                                                selectedJumbo.status === "COMPLETED"
                                                    ? "badge-success"
                                                    : selectedJumbo.status === "HOLD"
                                                    ? "badge-warning"
                                                    : "badge-info"
                                            }`}
                                        >
                                            {selectedJumbo.status.replace("_", " ")}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Registered on {formatDate(selectedJumbo.production_date)} • Operator:{" "}
                                        {selectedJumbo.user}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-md"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Detail Content */}
                        <div className="p-5 space-y-5 overflow-y-auto">
                            {/* Key Metrics / Yield Bar */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Jumbo Weight
                                    </div>
                                    <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                                        {formatWeight(selectedJumbo.weight)}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                        {formatTonnage(selectedJumbo.weight)}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Total Cut Weight
                                    </div>
                                    <div className="text-lg font-extrabold text-blue-700 mt-0.5">
                                        {formatWeight(selectedJumbo.total_cut_weight)}
                                    </div>
                                    <div className="text-[11px] text-blue-600 font-semibold">
                                        {selectedJumbo.rolls_count} Incoming Rolls
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Cutting Yield
                                    </div>
                                    <div className="text-lg font-extrabold text-emerald-600 mt-0.5">
                                        {selectedJumbo.yield_percentage}%
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                        Efficiency rate
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Trim / Balance
                                    </div>
                                    <div className="text-lg font-extrabold text-amber-700 mt-0.5">
                                        {formatWeight(selectedJumbo.remaining_weight)}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                        Remaining uncut
                                    </div>
                                </div>
                            </div>

                            {/* Associated JOP Specifications */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <FileText size={14} className="text-slate-400" />
                                    <span>Associated JOP & Specifications</span>
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-white rounded-lg border border-slate-200 text-xs">
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                            JOP Code
                                        </span>
                                        <span className="font-bold text-slate-900">{selectedJumbo.jop.jop}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                            SPK & PO
                                        </span>
                                        <span className="font-mono font-bold text-slate-800">
                                            {selectedJumbo.jop.spk} / {selectedJumbo.jop.po}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                            Customer
                                        </span>
                                        <span className="font-bold text-slate-800">
                                            {selectedJumbo.jop.customer}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                            Paper Grade & GSM
                                        </span>
                                        <span className="font-bold text-slate-800">
                                            {selectedJumbo.jop.grade}{" "}
                                            {selectedJumbo.jop.gsm ? `(${selectedJumbo.jop.gsm} GSM)` : ""}
                                        </span>
                                    </div>
                                    {selectedJumbo.notes && (
                                        <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-100 text-slate-600">
                                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                                Notes
                                            </span>
                                            <p className="mt-0.5">{selectedJumbo.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Associated Rewinder / Incoming Rolls Table */}
                            <div>
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <TruckIcon size={14} className="text-blue-500" />
                                            <span>Rewinder / Associated Incoming Rolls</span>
                                        </h4>
                                        <span className="badge badge-info text-[10px]">
                                            {selectedJumbo.rolls?.length || 0} Rolls
                                        </span>
                                    </div>

                                    {canManage && (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={handleOpenLinkModal}
                                                className="btn btn-secondary btn-sm py-1 px-2.5 text-[11px] flex items-center gap-1 cursor-pointer"
                                                title="Link existing unassigned incoming rolls to this Jumbo Roll"
                                            >
                                                <Link2 size={13} />
                                                <span>Link Incoming Rolls</span>
                                            </button>
                                            <Link
                                                href={`/incoming-roll?jumbo=${encodeURIComponent(
                                                    selectedJumbo.jumbo_roll_number
                                                )}`}
                                                className="btn btn-primary btn-sm py-1 px-2.5 text-[11px] flex items-center gap-1"
                                                title="Create a new incoming roll cut from this Jumbo Roll"
                                            >
                                                <Plus size={13} />
                                                <span>Cut New Roll</span>
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                                    <table className="data-table w-full text-xs">
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: "left" }}>Roll Number</th>
                                                <th style={{ textAlign: "center" }}>Form</th>
                                                <th style={{ textAlign: "center" }}>Weight</th>
                                                <th style={{ textAlign: "center" }}>Grade / GSM</th>
                                                <th style={{ textAlign: "center" }}>Shift</th>
                                                <th style={{ textAlign: "center" }}>Location</th>
                                                <th style={{ textAlign: "center" }}>Status</th>
                                                <th style={{ textAlign: "center" }}>Entry Date</th>
                                                {canManage && (
                                                    <th style={{ textAlign: "center", width: "90px" }}>
                                                        Action
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedJumbo.rolls && selectedJumbo.rolls.length > 0 ? (
                                                selectedJumbo.rolls.map((roll) => (
                                                    <tr key={roll.no} className="hover:bg-slate-50/80">
                                                        <td className="font-mono font-bold text-blue-900">
                                                            <Link
                                                                href={`/roll-detail/${roll.no}`}
                                                                className="hover:underline flex items-center gap-1"
                                                                title="View Roll Inventory Detail"
                                                            >
                                                                <span>{roll.no_roll}</span>
                                                                <ArrowUpRight size={11} className="text-slate-400" />
                                                            </Link>
                                                        </td>
                                                        <td className="text-center font-mono text-slate-600">
                                                            {roll.form ? `F-${roll.form}` : "—"}
                                                        </td>
                                                        <td className="text-center font-mono font-bold text-slate-800">
                                                            {formatWeight(roll.weight)}
                                                        </td>
                                                        <td className="text-center text-slate-700">
                                                            {roll.grade} {roll.gsm ? `${roll.gsm}g` : ""}
                                                        </td>
                                                        <td className="text-center font-medium">
                                                            Shift {roll.shift}
                                                        </td>
                                                        <td className="text-center font-semibold text-slate-600">
                                                            {roll.location || "Unallocated"}
                                                        </td>
                                                        <td className="text-center">
                                                            <span
                                                                className={`badge text-[10px] ${
                                                                    roll.status === "OK"
                                                                        ? "badge-success"
                                                                        : "badge-warning"
                                                                }`}
                                                            >
                                                                {roll.status}
                                                            </span>
                                                        </td>
                                                        <td className="text-center text-slate-500">
                                                            {formatDate(roll.entry_date)}
                                                        </td>
                                                        {canManage && (
                                                            <td className="text-center">
                                                                <button
                                                                    onClick={() =>
                                                                        handleRemoveRoll(roll.no, roll.no_roll)
                                                                    }
                                                                    className="btn btn-sm py-0.5 px-2 text-[10px] text-red-600 hover:bg-red-50 border border-red-200"
                                                                    title="Unlink roll from this Jumbo Roll"
                                                                >
                                                                    <Unlink size={11} className="mr-0.5 inline" />
                                                                    <span>Unlink</span>
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td
                                                        colSpan={canManage ? 9 : 8}
                                                        className="text-center py-8 text-slate-400"
                                                    >
                                                        <div className="flex flex-col items-center justify-center gap-1.5">
                                                            <Package size={24} className="text-slate-300 stroke-1" />
                                                            <p className="text-xs">
                                                                No incoming rolls have been cut from this Jumbo Roll yet.
                                                            </p>
                                                            {canManage && (
                                                                <button
                                                                    onClick={handleOpenLinkModal}
                                                                    className="btn btn-secondary btn-sm text-[11px] mt-1"
                                                                >
                                                                    <Link2 size={12} className="mr-1 inline" />
                                                                    Link Existing Incoming Rolls
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Detail Modal Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
                            <div className="text-xs text-slate-500">
                                Jumbo Roll #{selectedJumbo.id} • {selectedJumbo.jumbo_roll_number}
                            </div>
                            <div className="flex items-center gap-2">
                                {canManage && (
                                    <button
                                        onClick={() => {
                                            setShowDetailModal(false);
                                            handleOpenEdit(selectedJumbo);
                                        }}
                                        className="btn btn-secondary text-xs flex items-center gap-1"
                                    >
                                        <Edit3 size={12} />
                                        <span>Edit Jumbo Roll</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="btn btn-primary text-xs"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LINK EXISTING ROLLS MODAL */}
            {showLinkModal && selectedJumbo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Link Incoming Rolls to {selectedJumbo.jumbo_roll_number}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Select unassigned incoming rolls produced from this jumbo roll
                                </p>
                            </div>
                            <button
                                onClick={() => setShowLinkModal(false)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Search & Selector */}
                        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search
                                    size={14}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                />
                                <input
                                    type="text"
                                    placeholder="Search by Roll Number, Form, or Grade..."
                                    value={linkRollSearch}
                                    onChange={(e) => setLinkRollSearch(e.target.value)}
                                    className="form-input text-xs pl-8 w-full"
                                />
                            </div>
                            <div className="text-xs text-slate-600 font-semibold shrink-0">
                                Selected: <strong>{selectedRollNos.length}</strong>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="p-4 overflow-y-auto flex-1">
                            {loadingAvailable ? (
                                <div className="text-center py-10 text-slate-400 text-xs">
                                    Loading unassigned rolls...
                                </div>
                            ) : filteredAvailableRolls.length > 0 ? (
                                <div className="space-y-1.5">
                                    {filteredAvailableRolls.map((r) => {
                                        const isSelected = selectedRollNos.includes(r.no);
                                        return (
                                            <div
                                                key={r.no}
                                                onClick={() => toggleRollSelection(r.no)}
                                                className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                                                    isSelected
                                                        ? "bg-blue-50 border-blue-300 text-blue-900"
                                                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-800"
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {}}
                                                        className="rounded text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <div>
                                                        <div className="font-mono font-bold text-slate-900">
                                                            {r.no_roll}{" "}
                                                            {r.form ? (
                                                                <span className="text-[11px] text-slate-500 font-normal">
                                                                    (Form: {r.form})
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500">
                                                            {r.grade} {r.gsm ? `${r.gsm}g` : ""} • Shift {r.shift} •{" "}
                                                            {formatDate(r.entry_date)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-mono font-bold text-slate-800">
                                                        {formatWeight(r.weight)}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        {r.location || "Unallocated"}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-slate-400 text-xs">
                                    No available unassigned incoming rolls found.
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowLinkModal(false)}
                                className="btn btn-secondary text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={linking || selectedRollNos.length === 0}
                                onClick={handleSaveLinkedRolls}
                                className="btn btn-primary text-xs flex items-center gap-1.5"
                            >
                                {linking ? (
                                    <span>Linking...</span>
                                ) : (
                                    <span>Link {selectedRollNos.length} Selected Roll(s)</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
