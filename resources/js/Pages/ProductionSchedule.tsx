import { useState } from 'react'
import { usePage, router } from '@inertiajs/react'
import { Plus, X, Calendar, Clock, TrendingUp, Edit3, Trash2 } from 'lucide-react'
import { SystemUI } from '@/Utils/SystemUI'
import axios from 'axios'

interface JopOption {
    id: number
    spk: string
    jop: string
    po: string
    customer: string | null
    grade: string | null
    gsm: number | null
    nase: number | null
}

interface ScheduleRow {
    id: number
    jops_id: number
    spk: string
    jop: string
    po: string
    customer: string | null
    grade: string | null
    gsm: number | null
    nase: number | null
    tonnage: number
    rewinder_cut: string | null
    tph: number
    production_hours: number
    start_time: string
    stop_time: string
    remark: string | null
    status: string
}

const EMPTY_FORM = {
    jops_id: '',
    tonnage: '',
    rewinder_cut: '',
    tph: '20',
    start_time: '',
    remark: '',
}

export default function ProductionSchedule() {
    const { schedules = [], jops = [], totalTonnage = 0 } = usePage<any>().props

    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState<number | null>(null)
    const [form, setForm] = useState({ ...EMPTY_FORM })
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})
    const [selectedJop, setSelectedJop] = useState<JopOption | null>(null)
    const [saving, setSaving] = useState(false)
    
    // Pagination state
    const [page, setPage] = useState(1)
    const [perPage, setPerPage] = useState(10)

    const previewProductionHours = (() => {
        const t = parseFloat(form.tonnage)
        const p = parseFloat(form.tph)
        if (!t || !p || p <= 0) return null
        return Math.ceil(t / p)
    })()

    const previewStopTime = (() => {
        if (!form.start_time || previewProductionHours === null) return null
        const start = new Date(form.start_time)
        if (isNaN(start.getTime())) return null
        const stop = new Date(start.getTime() + previewProductionHours * 3600 * 1000)
        return stop.toISOString().slice(0, 16)
    })()

    function handleJopsIdChange(id: string) {
        const found = (jops as JopOption[]).find(j => String(j.id) === id) || null
        setSelectedJop(found)
        setForm(f => ({ ...f, jops_id: id }))
        if (formErrors.jops_id) setFormErrors(e => ({ ...e, jops_id: '' }))
    }

    function openAddModal() {
        setEditId(null)
        setForm({ ...EMPTY_FORM })
        setSelectedJop(null)
        setFormErrors({})
        setShowModal(true)
    }

    function openEditModal(row: ScheduleRow) {
        setEditId(row.id)
        const found = (jops as JopOption[]).find(j => j.id === row.jops_id) || null
        setSelectedJop(found)
        setForm({
            jops_id: String(row.jops_id),
            tonnage: String(row.tonnage),
            rewinder_cut: row.rewinder_cut || '',
            tph: String(row.tph),
            start_time: row.start_time ? row.start_time.replace(' ', 'T').slice(0, 16) : '',
            remark: row.remark || '',
        })
        setFormErrors({})
        setShowModal(true)
    }

    function closeModal() {
        setShowModal(false)
        setEditId(null)
    }

    function validate() {
        const errs: Record<string, string> = {}
        if (!form.jops_id) errs.jops_id = 'Please select an SPK.'
        if (!form.tonnage || isNaN(Number(form.tonnage)) || Number(form.tonnage) <= 0)
            errs.tonnage = 'Tonnage must be a positive number.'
        if (!form.tph || isNaN(Number(form.tph)) || Number(form.tph) <= 0)
            errs.tph = 'TPH must be a positive number.'
        if (!form.start_time) errs.start_time = 'Start date/time is required.'
        setFormErrors(errs)
        return Object.keys(errs).length === 0
    }

    async function handleSave() {
        if (!validate()) return
        setSaving(true)
        try {
            const payload = {
                jops_id: Number(form.jops_id),
                tonnage: Number(form.tonnage),
                rewinder_cut: form.rewinder_cut || null,
                tph: Number(form.tph),
                start_time: form.start_time,
                remark: form.remark || null,
            }
            if (editId) {
                await axios.put(`/production-schedule/${editId}`, payload)
                SystemUI.toast({ message: 'Schedule updated successfully.', type: 'success' })
            } else {
                await axios.post('/production-schedule', payload)
                SystemUI.toast({ message: 'Production schedule created.', type: 'success' })
            }
            closeModal()
            router.reload()
        } catch (err: any) {
            const apiErrors = err.response?.data?.errors || {}
            if (Object.keys(apiErrors).length > 0) {
                const mapped: Record<string, string> = {}
                Object.entries(apiErrors).forEach(([k, v]: [string, any]) => {
                    mapped[k] = Array.isArray(v) ? v[0] : v
                })
                setFormErrors(mapped)
            } else {
                SystemUI.toast({ message: err.response?.data?.message || 'Failed to save schedule.', type: 'error' })
            }
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(id: number) {
        const confirmed = await SystemUI.confirm({
            title: "Delete Schedule",
            message: "Are you sure you want to delete this schedule?",
            confirmText: "Delete",
            cancelText: "Cancel",
        })
        if (!confirmed) return
        try {
            await axios.delete(`/production-schedule/${id}`)
            SystemUI.toast({ message: 'Schedule deleted.', type: 'success' })
            router.reload()
        } catch {
            SystemUI.toast({ message: 'Failed to delete schedule.', type: 'error' })
        }
    }

    function formatDatetime(dt: string | null) {
        if (!dt) return '-'
        const d = new Date(dt)
        if (isNaN(d.getTime())) return dt
        return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    }

    const rows: ScheduleRow[] = schedules as ScheduleRow[]
    
    // Pagination logic
    const totalPages = Math.ceil(rows.length / perPage)
    const pagedRows = rows.slice((page - 1) * perPage, page * perPage)

    return (
        <div className="py-4 px-2.5 sm:px-6 space-y-5">
            {/* Page Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Production Schedule</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Schedule production runs based on existing SPK / Job Order Production data</p>
                </div>
                <button onClick={openAddModal} className="btn btn-primary flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Plus size={15} />
                    <span>Add Schedule</span>
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <Calendar size={18} />
                    </div>
                    <div>
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Schedules</div>
                        <div className="text-xl font-extrabold text-slate-900">{rows.length}</div>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                        <TrendingUp size={18} />
                    </div>
                    <div>
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Tonnage</div>
                        <div className="text-xl font-extrabold text-slate-900">
                            {Number(totalTonnage).toFixed(2)} <span className="text-sm font-semibold text-slate-500">MT</span>
                        </div>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600 shrink-0">
                        <Clock size={18} />
                    </div>
                    <div>
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Open Schedules</div>
                        <div className="text-xl font-extrabold text-slate-900">
                            {rows.filter(r => r.status === 'OPEN').length}
                        </div>
                    </div>
                </div>
            </div>

            {/* Schedule Table */}
            <div className="card overflow-x-auto">
                <table className="data-table w-full min-w-[1100px] text-xs">
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>SPK</th>
                            <th style={{ textAlign: 'center' }}>PO</th>
                            <th style={{ textAlign: 'center' }}>Grade</th>
                            <th style={{ textAlign: 'center' }}>GSM</th>
                            <th style={{ textAlign: 'center' }}>NASE (mm)</th>
                            <th style={{ textAlign: 'center' }}>Tonnage</th>
                            <th style={{ textAlign: 'center' }}>Rewinder Cut</th>
                            <th style={{ textAlign: 'center' }}>Prod. Hours</th>
                            <th style={{ textAlign: 'center' }}>Start</th>
                            <th style={{ textAlign: 'center' }}>Stop</th>
                            <th style={{ textAlign: 'center' }}>Customer</th>
                            <th style={{ textAlign: 'center' }}>Remark</th>
                            <th style={{ textAlign: 'center' }}>Status</th>
                            <th style={{ textAlign: 'center' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pagedRows.length > 0 ? pagedRows.map(r => (
                            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                <td className="font-bold text-blue-700 font-mono" style={{ textAlign: 'left' }}>{r.spk || '-'}</td>
                                <td className="font-mono text-slate-600" style={{ textAlign: 'center' }}>{r.po || '-'}</td>
                                <td className="font-medium text-slate-800" style={{ textAlign: 'center' }}>{r.grade || '-'}</td>
                                <td style={{ textAlign: 'center' }}>{r.gsm || '-'}</td>
                                <td style={{ textAlign: 'center' }}>{r.nase || '-'}</td>
                                <td className="font-semibold text-slate-900" style={{ textAlign: 'center' }}>
                                    {Number(r.tonnage).toFixed(2)} MT
                                </td>
                                <td className="font-mono text-slate-700" style={{ textAlign: 'center' }}>{r.rewinder_cut || '-'}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-100">
                                        {r.production_hours}h
                                    </span>
                                </td>
                                <td className="font-mono text-[11px] text-slate-700" style={{ textAlign: 'center' }}>{formatDatetime(r.start_time)}</td>
                                <td className="font-mono text-[11px] text-slate-700" style={{ textAlign: 'center' }}>{formatDatetime(r.stop_time)}</td>
                                <td className="text-slate-700" style={{ textAlign: 'center' }}>{r.customer || '-'}</td>
                                <td className={`text-xs ${r.remark ? 'text-slate-700' : 'text-slate-400 italic'}`} style={{ textAlign: 'center' }}>
                                    {r.remark || 'No notes'}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <span className="px-2 py-0.5 rounded font-bold text-[10px] uppercase bg-green-100 text-green-700 border border-green-200">
                                        {r.status}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <div className="flex items-center justify-center gap-1.5">
                                        <button
                                            onClick={() => openEditModal(r)}
                                            className="btn btn-secondary btn-sm py-1 px-2 text-[11px] flex items-center gap-1 cursor-pointer"
                                        >
                                            <Edit3 size={11} />
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(r.id)}
                                            className="btn btn-sm py-1 px-2 text-[11px] flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 cursor-pointer"
                                        >
                                            <Trash2 size={11} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={14} className="text-center py-10 text-slate-400">
                                    No production schedules yet. Click <strong>Add Schedule</strong> to create one.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {rows.length > 0 && (
                        <tfoot>
                            <tr className="bg-amber-50 font-bold text-amber-900">
                                <td colSpan={5} className="py-2 px-3 text-left text-xs font-bold">Total Tonnage</td>
                                <td className="py-2 text-center text-xs font-extrabold">{Number(totalTonnage).toFixed(2)} MT</td>
                                <td colSpan={8} />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap justify-between items-center gap-3 pt-1">
                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                        Showing {rows.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, rows.length)} of {rows.length}
                    </span>
                    <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                        <span className="text-xs text-slate-500">Rows per page:</span>
                        <select
                            value={perPage}
                            onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
                            className="text-xs border-slate-200 rounded-md py-1 px-2 pr-7 text-slate-600 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                        >
                            {[5, 10, 25, 50].map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'} min-w-[30px] justify-center`} onClick={() => setPage(p)}>{p}</button>
                    ))}
                    <button className="btn btn-secondary btn-sm" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
            </div>

            {/* Add / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    {editId ? 'Edit Production Schedule' : 'New Production Schedule'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Select an SPK — existing data will populate automatically
                                </p>
                            </div>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 cursor-pointer p-1">
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
                                    onChange={e => handleJopsIdChange(e.target.value)}
                                    className={`form-input w-full ${formErrors.jops_id ? 'border-red-500' : ''}`}
                                >
                                    <option value="">-- Select SPK --</option>
                                    {(jops as JopOption[]).map(j => (
                                        <option key={j.id} value={j.id}>
                                            {j.spk} — {j.jop}{j.customer ? ` (${j.customer})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {formErrors.jops_id && <p className="text-red-600 text-[11px] mt-1">{formErrors.jops_id}</p>}
                            </div>

                            {/* Auto-populated info */}
                            {selectedJop && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                                    <div>
                                        <div className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">PO</div>
                                        <div className="font-mono font-bold text-slate-800">{selectedJop.po || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Grade</div>
                                        <div className="font-bold text-slate-800">{selectedJop.grade || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">GSM</div>
                                        <div className="font-bold text-slate-800">{selectedJop.gsm || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">NASE (mm)</div>
                                        <div className="font-bold text-slate-800">{selectedJop.nase || '-'}</div>
                                    </div>
                                    <div className="col-span-2 sm:col-span-4">
                                        <div className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Customer</div>
                                        <div className="font-bold text-slate-800">{selectedJop.customer || '-'}</div>
                                    </div>
                                </div>
                            )}

                            {/* Tonnage + Rewinder Cut */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Tonnage (MT) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number" step="0.01" min="0.01"
                                        value={form.tonnage}
                                        onChange={e => { setForm(f => ({ ...f, tonnage: e.target.value })); if (formErrors.tonnage) setFormErrors(er => ({ ...er, tonnage: '' })) }}
                                        className={`form-input w-full ${formErrors.tonnage ? 'border-red-500' : ''}`}
                                        placeholder="e.g. 59"
                                    />
                                    {formErrors.tonnage && <p className="text-red-600 text-[11px] mt-1">{formErrors.tonnage}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Rewinder Cut</label>
                                    <input
                                        type="text"
                                        value={form.rewinder_cut}
                                        onChange={e => setForm(f => ({ ...f, rewinder_cut: e.target.value }))}
                                        className="form-input w-full"
                                        placeholder="e.g. (1120 x 3) + 1140"
                                    />
                                </div>
                            </div>

                            {/* TPH + Production Hours */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        TPH (Ton/Hour) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number" step="0.01" min="0.01"
                                        value={form.tph}
                                        onChange={e => { setForm(f => ({ ...f, tph: e.target.value })); if (formErrors.tph) setFormErrors(er => ({ ...er, tph: '' })) }}
                                        className={`form-input w-full ${formErrors.tph ? 'border-red-500' : ''}`}
                                        placeholder="e.g. 20"
                                    />
                                    {formErrors.tph && <p className="text-red-600 text-[11px] mt-1">{formErrors.tph}</p>}
                                    <p className="text-[10px] text-slate-400 mt-0.5">Default: 20 Ton/Hour — change as needed</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Production Hours <span className="text-slate-400 font-normal">(auto)</span>
                                    </label>
                                    <div className={`form-input w-full font-bold bg-slate-50 select-none ${previewProductionHours !== null ? 'text-blue-700' : 'text-slate-400'}`}>
                                        {previewProductionHours !== null ? `${previewProductionHours} hour(s)` : '—'}
                                    </div>
                                    {previewProductionHours !== null && (
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            ceil({form.tonnage} ÷ {form.tph}) = {previewProductionHours}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Start + Stop */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Start <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={form.start_time}
                                        onChange={e => { setForm(f => ({ ...f, start_time: e.target.value })); if (formErrors.start_time) setFormErrors(er => ({ ...er, start_time: '' })) }}
                                        className={`form-input w-full ${formErrors.start_time ? 'border-red-500' : ''}`}
                                    />
                                    {formErrors.start_time && <p className="text-red-600 text-[11px] mt-1">{formErrors.start_time}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Stop <span className="text-slate-400 font-normal">(auto)</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={previewStopTime || ''}
                                        readOnly
                                        className="form-input w-full bg-slate-50 text-slate-600 cursor-not-allowed"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-0.5">Start + Production Hours</p>
                                </div>
                            </div>

                            {/* Remark */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Remark</label>
                                <textarea
                                    value={form.remark}
                                    onChange={e => setForm(f => ({ ...f, remark: e.target.value }))}
                                    className="form-input w-full resize-none"
                                    rows={2}
                                    placeholder="Optional notes..."
                                />
                            </div>

                            {/* Status */}
                            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                                <span className="font-bold">Status:</span>
                                <span className="px-2 py-0.5 rounded font-bold text-[10px] uppercase bg-green-100 text-green-700 border border-green-200">OPEN</span>
                                <span className="text-green-600 text-[10px]">New schedules default to OPEN</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                            <button onClick={closeModal} className="btn btn-secondary cursor-pointer" disabled={saving}>
                                Cancel
                            </button>
                            <button onClick={handleSave} className="btn btn-primary cursor-pointer" disabled={saving}>
                                {saving ? 'Saving...' : (editId ? 'Update Schedule' : 'Create Schedule')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}