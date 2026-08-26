import { useState } from "react";
import {
    Sparkles,
    Search,
    Filter,
    Download,
    CheckCircle2,
    AlertTriangle,
    ArrowRight,
    MapPin,
    Calendar,
    Clock,
    User,
    Package,
    Layers,
    ChevronLeft,
    ChevronRight,
    Eye,
    X,
    TrendingUp,
    SlidersHorizontal,
    RefreshCw,
} from "lucide-react";
import { Link, router } from "@inertiajs/react";
import { SystemUI } from "@/Utils/SystemUI";

interface LogItem {
    id: number;
    rolls_no: number | null;
    no_roll: string;
    user_name: string;
    user_email: string;
    action_type: "ASSIGN" | "MOVE";
    previous_location: string;
    previous_location_id: number | null;
    recommended_location: string;
    recommended_location_id: number | null;
    selected_location: string;
    selected_location_id: number | null;
    is_match: boolean;
    status_code: 1 | 0;
    notes: string;
    created_at: string;
    created_date: string;
    created_time: string;
}

interface Stats {
    total_evaluations: number;
    match_count: number;
    override_count: number;
    overall_match_rate: number;
    assign_total: number;
    assign_match_rate: number;
    move_total: number;
    move_match_rate: number;
}

interface Props {
    logs?: LogItem[];
    stats?: Stats;
}

export default function RecommendationLogs({ logs = [], stats }: Props) {
    const [search, setSearch] = useState("");
    const [actionFilter, setActionFilter] = useState<"All" | "ASSIGN" | "MOVE">(
        "All",
    );
    const [statusFilter, setStatusFilter] = useState<"All" | "1" | "0">("All");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(15);
    const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Default computed stats if not provided
    const computedStats: Stats = stats || {
        total_evaluations: logs.length,
        match_count: logs.filter((l) => l.is_match).length,
        override_count: logs.filter((l) => !l.is_match).length,
        overall_match_rate:
            logs.length > 0
                ? Math.round(
                      (logs.filter((l) => l.is_match).length / logs.length) *
                          100,
                  )
                : 0,
        assign_total: logs.filter((l) => l.action_type === "ASSIGN").length,
        assign_match_rate:
            logs.filter((l) => l.action_type === "ASSIGN").length > 0
                ? Math.round(
                      (logs.filter(
                          (l) => l.action_type === "ASSIGN" && l.is_match,
                      ).length /
                          logs.filter((l) => l.action_type === "ASSIGN")
                              .length) *
                          100,
                  )
                : 0,
        move_total: logs.filter((l) => l.action_type === "MOVE").length,
        move_match_rate:
            logs.filter((l) => l.action_type === "MOVE").length > 0
                ? Math.round(
                      (logs.filter(
                          (l) => l.action_type === "MOVE" && l.is_match,
                      ).length /
                          logs.filter((l) => l.action_type === "MOVE").length) *
                          100,
                  )
                : 0,
    };

    // Filter logs
    const filteredLogs = logs.filter((log) => {
        const q = search.toLowerCase().trim();
        const matchSearch =
            !q ||
            (log.no_roll && log.no_roll.toLowerCase().includes(q)) ||
            (log.user_name && log.user_name.toLowerCase().includes(q)) ||
            (log.recommended_location &&
                log.recommended_location.toLowerCase().includes(q)) ||
            (log.selected_location &&
                log.selected_location.toLowerCase().includes(q)) ||
            (log.notes && log.notes.toLowerCase().includes(q));

        const matchAction =
            actionFilter === "All" || log.action_type === actionFilter;
        const matchStatus =
            statusFilter === "All" || String(log.status_code) === statusFilter;

        return matchSearch && matchAction && matchStatus;
    });

    const totalPages = Math.ceil(filteredLogs.length / perPage) || 1;
    const pagedLogs = filteredLogs.slice((page - 1) * perPage, page * perPage);

    function handleRefresh() {
        setIsRefreshing(true);
        router.reload({
            onFinish: () => {
                setIsRefreshing(false);
                SystemUI.toast({
                    message: "Recommendation logs refreshed.",
                    type: "success",
                });
            },
        });
    }

    function exportCSV() {
        if (logs.length === 0) {
            SystemUI.toast({
                message: "No logs available to export.",
                type: "warning",
            });
            return;
        }

        const headers = [
            "Log ID",
            "Timestamp (WIB)",
            "Roll Number",
            "Operator (PIC)",
            "Operator Email",
            "Action Type",
            "Previous Location",
            "Recommended Location",
            "Selected Location",
            "Is Match (Boolean)",
            "Status Label",
            "Notes",
        ];

        const csvRows = [
            headers.join(","),
            ...logs.map((l) =>
                [
                    l.id,
                    `"${l.created_at}"`,
                    `"${l.no_roll}"`,
                    `"${l.user_name.replace(/"/g, '""')}"`,
                    `"${l.user_email}"`,
                    `"${l.action_type}"`,
                    `"${l.previous_location}"`,
                    `"${l.recommended_location}"`,
                    `"${l.selected_location}"`,
                    l.status_code,
                    l.is_match
                        ? '"MATCH (TRUE / 1)"'
                        : '"OVERRIDE (FALSE / 0)"',
                    `"${(l.notes || "").replace(/"/g, '""')}"`,
                ].join(","),
            ),
        ];

        const csvContent =
            "data:text/csv;charset=utf-8," +
            encodeURIComponent(csvRows.join("\n"));
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute(
            "download",
            `rollyn_location_recommendation_logs_${new Date().toISOString().slice(0, 10)}.csv`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        SystemUI.toast({
            message: `Exported ${logs.length} recommendation log records to CSV.`,
            type: "success",
        });
    }

    return (
        <div className="py-4 px-2.5 sm:px-6 space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center border border-blue-200">
                        <Sparkles size={22} className="text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            Recommendation Logs & Evaluation
                            <span className="text-[11px] font-bold tracking-normal uppercase bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                                Admin Only
                            </span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Evaluasi akurasi dan kepatuhan operator terhadap
                            rekomendasi penempatan lokasi slot gudang (Assign &
                            Move)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="btn btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 cursor-pointer"
                        title="Refresh log data"
                    >
                        <RefreshCw
                            size={14}
                            className={
                                isRefreshing ? "animate-spin text-blue-600" : ""
                            }
                        />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button
                        onClick={exportCSV}
                        className="btn btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 cursor-pointer font-semibold shadow-xs"
                    >
                        <Download size={14} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* KPI Evaluation Analytics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Overall Match Rate */}
                <div className="card p-4.5 bg-gradient-to-br from-white to-blue-50/40 border border-blue-100 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Overall Match Rate
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center">
                            <TrendingUp size={16} />
                        </div>
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-extrabold text-blue-700">
                            {computedStats.overall_match_rate}%
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                            ({computedStats.match_count} /{" "}
                            {computedStats.total_evaluations} match)
                        </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${Math.min(computedStats.overall_match_rate, 100)}%`,
                            }}
                        />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
                        <span>
                            Boolean True (1): {computedStats.match_count}
                        </span>
                        <span>
                            Override (0): {computedStats.override_count}
                        </span>
                    </div>
                </div>

                {/* Card 2: Initial Assign Accuracy */}
                <div className="card p-4.5 bg-gradient-to-br from-white to-emerald-50/40 border border-emerald-100 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Assign Match Rate
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
                            {computedStats.assign_match_rate}%
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                            ({computedStats.assign_total} total assigns)
                        </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div
                            className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${Math.min(computedStats.assign_match_rate, 100)}%`,
                            }}
                        />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                        Kesesuaian pada penempatan slot pertama kali
                    </p>
                </div>

                {/* Card 3: Move / Relocation Accuracy */}
                <div className="card p-4.5 bg-gradient-to-br from-white to-amber-50/40 border border-amber-100 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Move Match Rate
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-amber-100/80 text-amber-700 flex items-center justify-center">
                            <Layers size={16} />
                        </div>
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-extrabold text-amber-700">
                            {computedStats.move_match_rate}%
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                            ({computedStats.move_total} total moves)
                        </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div
                            className="bg-amber-500 h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${Math.min(computedStats.move_match_rate, 100)}%`,
                            }}
                        />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                        Kesesuaian pada proses relokasi slot
                    </p>
                </div>

                {/* Card 4: Overrides / Discrepancies */}
                <div className="card p-4.5 bg-gradient-to-br from-white to-rose-50/40 border border-rose-100 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Manual Overrides
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-rose-100/80 text-rose-700 flex items-center justify-center">
                            <AlertTriangle size={16} />
                        </div>
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-extrabold text-rose-700">
                            {computedStats.override_count}
                        </span>
                        <span className="text-xs font-semibold text-rose-600">
                            Boolean 0 (False)
                        </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div
                            className="bg-rose-500 h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${computedStats.total_evaluations > 0 ? (computedStats.override_count / computedStats.total_evaluations) * 100 : 0}%`,
                            }}
                        />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                        User memilih slot berbeda dari rekomendasi
                    </p>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="card p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
                {/* Filters Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    {/* Search Box */}
                    <div className="relative flex-1 min-w-[240px] max-w-md">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            placeholder="Search Roll No, PIC Operator, Slot Code..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="form-input w-full pl-9 text-xs"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Action Type Filter */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                            <span className="text-slate-400 font-bold px-1 text-[10px] uppercase">
                                Action:
                            </span>
                            {(["All", "ASSIGN", "MOVE"] as const).map(
                                (action) => (
                                    <button
                                        key={action}
                                        onClick={() => {
                                            setActionFilter(action);
                                            setPage(1);
                                        }}
                                        className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                                            actionFilter === action
                                                ? "bg-white text-blue-700 shadow-xs"
                                                : "text-slate-600 hover:text-slate-900"
                                        }`}
                                    >
                                        {action === "All"
                                            ? "All Actions"
                                            : action}
                                    </button>
                                ),
                            )}
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                            <span className="text-slate-400 font-bold px-1 text-[10px] uppercase">
                                Evaluation:
                            </span>
                            <button
                                onClick={() => {
                                    setStatusFilter("All");
                                    setPage(1);
                                }}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                                    statusFilter === "All"
                                        ? "bg-white text-slate-900 shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => {
                                    setStatusFilter("1");
                                    setPage(1);
                                }}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                                    statusFilter === "1"
                                        ? "bg-emerald-600 text-white shadow-xs"
                                        : "text-emerald-700 hover:text-emerald-900"
                                }`}
                            >
                                <CheckCircle2 size={12} />
                                <span>Match (1)</span>
                            </button>
                            <button
                                onClick={() => {
                                    setStatusFilter("0");
                                    setPage(1);
                                }}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                                    statusFilter === "0"
                                        ? "bg-rose-600 text-white shadow-xs"
                                        : "text-rose-700 hover:text-rose-900"
                                }`}
                            >
                                <AlertTriangle size={12} />
                                <span>Override (0)</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80 text-[10.5px]">
                                <th className="py-3 px-3.5">Timestamp (WIB)</th>
                                <th className="py-3 px-3.5">Roll Number</th>
                                <th className="py-3 px-3.5">Operator (PIC)</th>
                                <th className="py-3 px-3.5 text-center">
                                    Action
                                </th>
                                <th className="py-3 px-3.5">Prev Slot</th>
                                <th className="py-3 px-3.5">
                                    Recommended Slot
                                </th>
                                <th className="py-3 px-3.5">Selected Slot</th>
                                <th className="py-3 px-3.5 text-center">
                                    Status / Boolean
                                </th>
                                <th className="py-3 px-3.5 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {pagedLogs.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="py-12 text-center text-slate-400"
                                    >
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Sparkles
                                                size={32}
                                                className="text-slate-300 stroke-[1.5]"
                                            />
                                            <p className="font-semibold text-slate-600">
                                                No recommendation evaluation
                                                logs found
                                            </p>
                                            <p className="text-xs text-slate-400 max-w-sm">
                                                {search ||
                                                actionFilter !== "All" ||
                                                statusFilter !== "All"
                                                    ? "Coba sesuaikan filter pencarian untuk melihat data log lainnya."
                                                    : "Pencatatan akan muncul secara otomatis ketika operator menetapkan atau memindahkan lokasi slot roll."}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                pagedLogs.map((log) => {
                                    const isMatch = log.is_match;

                                    return (
                                        <tr
                                            key={log.id}
                                            className="hover:bg-blue-50/30 transition-colors"
                                        >
                                            {/* Timestamp */}
                                            <td className="py-3 px-3.5 whitespace-nowrap">
                                                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                                    <Clock
                                                        size={12}
                                                        className="text-slate-400 shrink-0"
                                                    />
                                                    <span>
                                                        {log.created_date}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] text-slate-400 ml-4 font-mono">
                                                    {log.created_time}
                                                </span>
                                            </td>

                                            {/* Roll Number */}
                                            <td className="py-3 px-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Package
                                                        size={13}
                                                        className="text-blue-600 shrink-0"
                                                    />
                                                    <Link
                                                        href={
                                                            log.no_roll
                                                                ? `/roll-detail/${log.no_roll}`
                                                                : "#"
                                                        }
                                                        className="font-mono font-bold text-blue-700 hover:text-blue-900 hover:underline"
                                                    >
                                                        {log.no_roll}
                                                    </Link>
                                                </div>
                                            </td>

                                            {/* Operator / PIC */}
                                            <td className="py-3 px-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                                                        {log.user_name
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900 leading-tight">
                                                            {log.user_name}
                                                        </div>
                                                        {log.user_email &&
                                                            log.user_email !==
                                                                "—" && (
                                                                <div className="text-[10px] text-slate-400 leading-tight">
                                                                    {
                                                                        log.user_email
                                                                    }
                                                                </div>
                                                            )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Action Type */}
                                            <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                                {log.action_type ===
                                                "ASSIGN" ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                        ASSIGN
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                        MOVE
                                                    </span>
                                                )}
                                            </td>

                                            {/* Previous Slot */}
                                            <td className="py-3 px-3.5 whitespace-nowrap">
                                                <span className="font-mono text-xs text-slate-500 font-semibold">
                                                    {log.previous_location}
                                                </span>
                                            </td>

                                            {/* Recommended Slot */}
                                            <td className="py-3 px-3.5 whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold text-xs">
                                                    <Sparkles
                                                        size={11}
                                                        className="text-emerald-600"
                                                    />
                                                    <span>
                                                        {
                                                            log.recommended_location
                                                        }
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Selected Slot */}
                                            <td className="py-3 px-3.5 whitespace-nowrap">
                                                <div
                                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-xs border ${
                                                        isMatch
                                                            ? "bg-blue-50 text-blue-800 border-blue-200"
                                                            : "bg-rose-50 text-rose-800 border-rose-200"
                                                    }`}
                                                >
                                                    <MapPin
                                                        size={11}
                                                        className={
                                                            isMatch
                                                                ? "text-blue-600"
                                                                : "text-rose-600"
                                                        }
                                                    />
                                                    <span>
                                                        {log.selected_location}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Match Status / Boolean */}
                                            <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                                {isMatch ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                        <CheckCircle2
                                                            size={12}
                                                            className="text-emerald-600"
                                                        />
                                                        <span>True (1)</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                                        <AlertTriangle
                                                            size={12}
                                                            className="text-rose-600"
                                                        />
                                                        <span>
                                                            False (0) - Override
                                                        </span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                                <button
                                                    onClick={() =>
                                                        setSelectedLog(log)
                                                    }
                                                    className="btn btn-secondary text-xs px-2.5 py-1 flex items-center gap-1 cursor-pointer ml-auto"
                                                    title="View evaluation details"
                                                >
                                                    <Eye size={13} />
                                                    <span>Detail</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        <span>
                            Showing{" "}
                            {filteredLogs.length > 0
                                ? (page - 1) * perPage + 1
                                : 0}{" "}
                            to {Math.min(page * perPage, filteredLogs.length)}{" "}
                            of {filteredLogs.length} entries
                        </span>
                        <select
                            value={perPage}
                            onChange={(e) => {
                                setPerPage(Number(e.target.value));
                                setPage(1);
                            }}
                            className="form-input text-xs py-1 px-2"
                        >
                            <option value={10}>10 / page</option>
                            <option value={15}>15 / page</option>
                            <option value={25}>25 / page</option>
                            <option value={50}>50 / page</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="btn btn-secondary px-2.5 py-1 text-xs disabled:opacity-40 cursor-pointer"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="px-2 font-bold text-slate-700">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() =>
                                setPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={page >= totalPages}
                            className="btn btn-secondary px-2.5 py-1 text-xs disabled:opacity-40 cursor-pointer"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Log Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="card w-full max-w-lg p-5 sm:p-6 bg-white rounded-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                                        selectedLog.is_match
                                            ? "bg-emerald-100 text-emerald-800"
                                            : "bg-rose-100 text-rose-800"
                                    }`}
                                >
                                    {selectedLog.is_match ? (
                                        <CheckCircle2 size={18} />
                                    ) : (
                                        <AlertTriangle size={18} />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        Evaluation Log #{selectedLog.id}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Recorded on {selectedLog.created_at} WIB
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer rounded-lg hover:bg-slate-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Evaluation Result Banner */}
                        <div
                            className={`p-3.5 rounded-xl border flex items-center justify-between ${
                                selectedLog.is_match
                                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                                    : "bg-rose-50/80 border-rose-200 text-rose-900"
                            }`}
                        >
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider">
                                    Evaluation Status
                                </div>
                                <div className="text-sm font-extrabold flex items-center gap-1.5 mt-0.5">
                                    {selectedLog.is_match ? (
                                        <>
                                            <CheckCircle2
                                                size={16}
                                                className="text-emerald-600"
                                            />
                                            <span>
                                                MATCH (Boolean: 1 / True)
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle
                                                size={16}
                                                className="text-rose-600"
                                            />
                                            <span>
                                                OVERRIDE (Boolean: 0 / False)
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <span
                                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                                    selectedLog.is_match
                                        ? "bg-emerald-600 text-white"
                                        : "bg-rose-600 text-white"
                                }`}
                            >
                                {selectedLog.is_match
                                    ? "Accepted"
                                    : "Manual Override"}
                            </span>
                        </div>

                        {/* Side-by-side Location Comparison */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <Sparkles
                                        size={12}
                                        className="text-emerald-600"
                                    />
                                    <span>Recommended</span>
                                </div>
                                <div className="text-base font-extrabold font-mono text-emerald-700">
                                    {selectedLog.recommended_location}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                    Sistem algoritma gudang
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <MapPin
                                        size={12}
                                        className="text-blue-600"
                                    />
                                    <span>Selected (User)</span>
                                </div>
                                <div
                                    className={`text-base font-extrabold font-mono ${
                                        selectedLog.is_match
                                            ? "text-blue-700"
                                            : "text-rose-700"
                                    }`}
                                >
                                    {selectedLog.selected_location}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                    Pilihan aktual operator
                                </div>
                            </div>
                        </div>

                        {/* Context Details */}
                        <div className="space-y-2 text-xs bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                                <span className="text-slate-500 font-medium">
                                    Roll Number
                                </span>
                                <span className="font-bold text-blue-700 font-mono">
                                    {selectedLog.no_roll}
                                </span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                                <span className="text-slate-500 font-medium">
                                    Action Type
                                </span>
                                <span className="font-bold text-slate-800">
                                    {selectedLog.action_type}
                                </span>
                            </div>
                            {selectedLog.action_type === "MOVE" && (
                                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                                    <span className="text-slate-500 font-medium">
                                        Previous Slot
                                    </span>
                                    <span className="font-bold text-slate-800 font-mono">
                                        {selectedLog.previous_location}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                                <span className="text-slate-500 font-medium">
                                    Operator (PIC)
                                </span>
                                <span className="font-semibold text-slate-800">
                                    {selectedLog.user_name}
                                </span>
                            </div>
                            <div className="flex justify-between py-1.5">
                                <span className="text-slate-500 font-medium">
                                    Recorded At
                                </span>
                                <span className="font-semibold text-slate-800">
                                    {selectedLog.created_at} WIB
                                </span>
                            </div>
                            {selectedLog.notes && (
                                <div className="pt-2 border-t border-slate-200/60">
                                    <span className="text-slate-500 font-medium block mb-1">
                                        Notes:
                                    </span>
                                    <p className="text-slate-700 bg-white p-2 rounded border border-slate-200 italic">
                                        {selectedLog.notes}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Modal Actions */}
                        <div className="flex justify-between items-center pt-2">
                            <Link
                                href={`/roll-detail/${selectedLog.no_roll}`}
                                className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 cursor-pointer text-blue-700"
                            >
                                <Package size={13} />
                                <span>View Roll Details</span>
                            </Link>
                            <button
                                className="btn btn-primary text-xs px-4 py-1.5 cursor-pointer font-bold"
                                onClick={() => setSelectedLog(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
