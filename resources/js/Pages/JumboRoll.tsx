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
import {
    JopOption,
    IncomingRollItem,
    JumboRollItem,
    SummaryData,
} from "@/Components/JumboRoll/JumboRoll_types";
import JumboRoll_FormModal from "@/Components/JumboRoll/JumboRoll_FormModal";
import JumboRoll_DetailModal from "@/Components/JumboRoll/JumboRoll_DetailModal";
import JumboRoll_LinkModal from "@/Components/JumboRoll/JumboRoll_LinkModal";

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
                <div className="flex items-center gap-2">
                    <a
                        href={`/jumbo-roll/export-excel?search=${encodeURIComponent(searchTerm)}&status=${encodeURIComponent(statusFilter)}&date_from=${encodeURIComponent(dateFilter)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm text-slate-700 bg-white border border-slate-300 hover:bg-slate-50"
                    >
                        <FileText size={15} className="text-slate-500" />
                        <span className="font-semibold text-sm">Export</span>
                    </a>
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
            <div className="card p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 w-full">
                    {/* Search Input */}
                    <div className="relative w-full sm:max-w-xs md:max-w-sm">
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
                            className="form-input text-xs w-full !pl-9"
                            style={{ paddingLeft: '2.35rem' }}
                        />
                    </div>

                    {/* Status & Date Filters */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="flex-1 sm:w-36">
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

                        <div className="flex-1 sm:w-40">
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
                                className="btn btn-secondary btn-sm py-1.5 px-2.5 text-[11px] text-slate-600 hover:text-slate-900 whitespace-nowrap"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                <div className="text-xs text-slate-500 font-medium self-end sm:self-auto">
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
            <JumboRoll_FormModal
                isOpen={showFormModal}
                onClose={() => setShowFormModal(false)}
                editingId={editingId}
                form={form}
                setForm={setForm}
                formErrors={formErrors}
                setFormErrors={setFormErrors}
                jopList={jopList as JopOption[]}
                currentSelectedJop={currentSelectedJop}
                saving={saving}
                onSubmit={handleSaveForm}
            />

            {/* DETAIL MODAL */}
            <JumboRoll_DetailModal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                selectedJumbo={selectedJumbo}
                canManage={canManage}
                formatWeight={formatWeight}
                formatTonnage={formatTonnage}
                formatDate={formatDate}
                handleOpenLinkModal={handleOpenLinkModal}
                handleOpenEdit={handleOpenEdit}
                handleRemoveRoll={handleRemoveRoll}
            />

            {/* LINK EXISTING ROLLS MODAL */}
            <JumboRoll_LinkModal
                isOpen={showLinkModal}
                onClose={() => setShowLinkModal(false)}
                selectedJumbo={selectedJumbo}
                linkRollSearch={linkRollSearch}
                setLinkRollSearch={setLinkRollSearch}
                selectedRollNos={selectedRollNos}
                toggleRollSelection={toggleRollSelection}
                loadingAvailable={loadingAvailable}
                filteredAvailableRolls={filteredAvailableRolls}
                linking={linking}
                handleSaveLinkedRolls={handleSaveLinkedRolls}
                formatDate={formatDate}
                formatWeight={formatWeight}
            />
        </div>
    );
}
