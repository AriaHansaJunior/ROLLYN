import React from 'react'
import { X, RotateCcw } from 'lucide-react'
import { RollItem, OptionItem } from './RollInventory_types'

interface RollInventory_EditRollModalProps {
  isOpen: boolean
  onClose: () => void
  editingRoll: RollItem | null
  editForm: {
    no_roll: string
    form: string
    shifts_id: number
    entry_date: string
    grades_id: number
    gsms_id: string
    weight: number
    locations_id: string
    jops_id: string
    exmaterial: string
    visual: string
    status: string
    reproduction_status: string
  }
  setEditForm: React.Dispatch<React.SetStateAction<{
    no_roll: string
    form: string
    shifts_id: number
    entry_date: string
    grades_id: number
    gsms_id: string
    weight: number
    locations_id: string
    jops_id: string
    exmaterial: string
    visual: string
    status: string
    reproduction_status: string
  }>>
  editErrors: Record<string, string>
  shifts: OptionItem[]
  grades: OptionItem[]
  gsms: { id: number; gsm: number }[]
  locations: OptionItem[]
  jops: OptionItem[]
  isQC: boolean
  userRole: string
  isPpicOrAdmin: boolean
  onSave: () => void
}

export default function RollInventory_EditRollModal({
  isOpen,
  onClose,
  editingRoll,
  editForm,
  setEditForm,
  editErrors,
  shifts,
  grades,
  gsms,
  locations,
  jops,
  isQC,
  userRole,
  isPpicOrAdmin,
  onSave,
}: RollInventory_EditRollModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="card w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-6 sm:p-7 bg-white rounded-2xl shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">Edit Roll Data</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-mono">
              Roll: {editingRoll?.no_roll || editingRoll?.id}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="form-label text-sm font-semibold text-slate-700 block mb-1.5">Roll Number <span className="text-red-500">*</span></label>
            <input
              value={editForm.no_roll}
              onChange={e => setEditForm(f => ({ ...f, no_roll: e.target.value }))}
              className="form-input w-full h-11 text-sm rounded-lg px-3.5"
            />
            {editErrors.no_roll && <p className="text-red-600 text-xs mt-1">{editErrors.no_roll}</p>}
          </div>

          <div>
            <label className="form-label text-sm font-semibold text-slate-700 block mb-1.5">Form Number</label>
            <input
              type="number"
              value={editForm.form}
              onChange={e => setEditForm(f => ({ ...f, form: e.target.value }))}
              className="form-input w-full h-11 text-sm rounded-lg px-3.5"
              placeholder="e.g. 1"
            />
          </div>

          <div>
            <label className="form-label text-sm font-semibold text-slate-700 block mb-1.5">Shift</label>
            <select
              value={editForm.shifts_id}
              onChange={e => setEditForm(f => ({ ...f, shifts_id: Number(e.target.value) }))}
              className="form-input w-full h-11 text-sm rounded-lg px-3.5"
            >
              {shifts.map(s => (
                <option key={s.id} value={s.id}>Shift {s.shift}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label text-sm font-semibold text-slate-700 block mb-1.5">Entry Date</label>
            <input
              type="date"
              value={editForm.entry_date}
              onChange={e => setEditForm(f => ({ ...f, entry_date: e.target.value }))}
              className="form-input w-full h-11 text-sm rounded-lg px-3.5"
            />
          </div>

          <div>
            <label className="form-label text-sm font-semibold text-slate-700 block mb-1.5">Grade</label>
            <select
              value={editForm.grades_id}
              onChange={e => setEditForm(f => ({ ...f, grades_id: Number(e.target.value) }))}
              className="form-input w-full h-11 text-sm rounded-lg px-3.5"
            >
              {grades.map(g => (
                <option key={g.id} value={g.id}>{g.grade}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label text-sm font-semibold text-slate-700 block mb-1.5">GSM (g/m²)</label>
            <select
              value={editForm.gsms_id}
              onChange={e => setEditForm(f => ({ ...f, gsms_id: e.target.value }))}
              className="form-input w-full h-11 text-sm rounded-lg px-3.5"
            >
              <option value="">Default from JOP</option>
              {gsms.map(g => (
                <option key={g.id} value={g.id}>{g.gsm} g/m²</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label text-sm font-semibold text-slate-700 block mb-1.5">Weight (kg)</label>
            <input
              type="number"
              value={editForm.weight}
              onChange={e => setEditForm(f => ({ ...f, weight: Number(e.target.value) }))}
              className="form-input w-full h-11 text-sm rounded-lg px-3.5"
            />
          </div>

          <div>
            <label className="form-label text-sm font-semibold text-slate-700 block mb-1.5">Warehouse Location</label>
            <select
              value={editForm.locations_id}
              onChange={e => setEditForm(f => ({ ...f, locations_id: e.target.value }))}
              className="form-input w-full h-11 text-sm rounded-lg px-3.5"
            >
              <option value="">Unallocated (No Slot)</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.location}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label text-sm font-semibold text-slate-700 block mb-1.5">JOP Order</label>
            <select
              value={editForm.jops_id}
              onChange={e => setEditForm(f => ({ ...f, jops_id: e.target.value }))}
              className="form-input w-full h-11 text-sm rounded-lg px-3.5"
            >
              <option value="">No JOP Assigned</option>
              {jops.map(j => (
                <option key={j.id} value={j.id}>{j.jop}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label text-sm font-semibold text-slate-700 block mb-1.5">Ex Material</label>
            <select
              value={editForm.exmaterial}
              onChange={e => setEditForm(f => ({ ...f, exmaterial: e.target.value }))}
              className="form-input w-full h-11 text-sm rounded-lg px-3.5"
            >
              <option value="IMPORT">IMPORT</option>
              <option value="LOCAL">LOCAL</option>
            </select>
          </div>

          <div>
            <label className="form-label text-sm font-semibold text-slate-700 block mb-1.5">Visual</label>
            <select
              className="form-input w-full h-11 text-sm bg-white border border-slate-300 rounded-lg px-3.5 shadow-sm"
              value={editForm.visual}
              onChange={e => setEditForm(f => ({ ...f, visual: e.target.value }))}
            >
              <option value="OK">OK</option>
              <option value="PKP">PKP</option>
              <option value="Reject">Reject</option>
            </select>
          </div>

          <div>
            <label className="form-label text-sm font-semibold text-slate-700 block mb-1.5">Label Status (Roll Status)</label>
            <select
              className="form-input w-full h-11 text-sm bg-white border border-slate-300 rounded-lg px-3.5 shadow-sm disabled:bg-slate-100 disabled:opacity-75 disabled:cursor-not-allowed font-semibold"
              value={editForm.status}
              onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
              disabled={!isQC && userRole !== 'admin' && editingRoll?.roll_status === 'HOLD'}
            >
              <option value="OK">OK (Released / Passed)</option>
              <option value="HOLD">HOLD (Pending QC Verification)</option>
            </select>
            {!isQC && userRole !== 'admin' && editingRoll?.roll_status === 'HOLD' && (
              <p className="text-xs text-amber-600 font-semibold mt-1">
                Only QC and Admin are authorized to release HOLD status to OK
              </p>
            )}
          </div>

          {/* Re-production Disposition (PPIC) */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 p-4 bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200 rounded-xl space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="form-label text-sm font-bold text-slate-800 flex items-center gap-2">
                <RotateCcw size={16} className="text-blue-600" />
                Re-production Disposition (PPIC)
              </label>
              {isPpicOrAdmin ? (
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                  Managed by PPIC
                </span>
              ) : (
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                  Managed by PPIC
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Select disposition if this roll was re-produced by the production team.
            </p>
            <select
              className="form-input w-full h-11 text-sm bg-white border border-slate-300 rounded-lg px-3.5 font-semibold disabled:bg-slate-100 disabled:opacity-75 disabled:cursor-not-allowed"
              value={editForm.reproduction_status}
              onChange={e => setEditForm(f => ({ ...f, reproduction_status: e.target.value }))}
              disabled={!isPpicOrAdmin}
            >
              <option value="none">None (Standard Production)</option>
              <option value="shipped">Shipped (Approved for delivery)</option>
              <option value="reject">Reject (Roll scrapped / rejected)</option>
              <option value="reweigh">Reweigh (Roll sent for re-weighing)</option>
              <option value="reproduce_again">Reproduce Again (Roll sent back for re-production)</option>
            </select>
            {!isPpicOrAdmin && (
              <p className="text-[11px] text-slate-400 mt-1">
                Only PPIC and Admin are authorized to update re-production disposition.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
          <button className="btn btn-secondary text-sm px-4 py-2.5 rounded-lg" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary text-sm font-bold px-6 py-2.5 rounded-lg shadow-sm" onClick={onSave}>
            Update Roll
          </button>
        </div>
      </div>
    </div>
  )
}
