import React, { useState } from 'react'
import { ArrowLeft, Package, CheckCircle, Trash2, Edit, X } from 'lucide-react'
import { router } from '@inertiajs/react'
import { SystemUI } from '@/Utils/SystemUI'

interface RollDetailItem {
  id: string
  raw_id: number
  no_roll: string
  form: string
  raw_form?: number
  shift: string
  shifts_id?: number
  date: string
  grade: string
  grades_id?: number
  gsm: number
  plybond: number
  thickness: number
  bulk: number
  width: number
  diameter: number
  core: number
  weight: number
  cobb: string
  exMaterial: string
  visual: string
  location: string
  locations_id?: number
  jop: string
  jops_id?: number
  pic: string
  status: string
  customer: string
  po: string
  spk: string
  orderStatus: string
  ocrTimestamp: string
  ocrWeight: number
  ocrConfidence: string
  ocrStatus: string
}

interface OptionItem {
  id: number
  shift?: string
  grade?: string
  location?: string
  jop?: string
}

interface Props {
  roll?: RollDetailItem
  shifts?: OptionItem[]
  grades?: OptionItem[]
  locations?: OptionItem[]
  jops?: OptionItem[]
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
      <span className="text-slate-500 font-medium">{label}</span>
      <span className="text-slate-900 font-semibold text-right">{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 pb-2 border-b-2 border-blue-600">
        {title}
      </h3>
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  )
}

export default function RollDetail({
  roll,
  shifts = [],
  grades = [],
  locations = [],
  jops = []
}: Props) {
  const currentRoll = roll || {
    id: 'R-10421',
    raw_id: 1,
    no_roll: '260701-01.01.01',
    form: 'F-1',
    shift: '1',
    date: '2026-07-01',
    grade: 'SPECTA - LY3',
    gsm: 500,
    plybond: 300,
    thickness: 700,
    bulk: 1.4,
    width: 1120,
    diameter: 1230,
    core: 3,
    weight: 1007,
    cobb: '150-250',
    exMaterial: 'IMPORT',
    visual: 'OK',
    location: 'E17-01-1',
    jop: 'JOP-0726-00001',
    pic: 'WAHYU',
    status: 'Slotted',
    customer: 'Indonesia',
    po: 'FCL-Jul-1',
    spk: '0726-00001-1',
    orderStatus: 'Ready to Ship',
    ocrTimestamp: '2026-07-01 08:22:14',
    ocrWeight: 1007,
    ocrConfidence: '98.4%',
    ocrStatus: 'Success'
  }

  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    no_roll: currentRoll.no_roll || currentRoll.id,
    form: currentRoll.raw_form ? String(currentRoll.raw_form) : '',
    shifts_id: currentRoll.shifts_id || 1,
    entry_date: currentRoll.date || new Date().toISOString().slice(0, 10),
    grades_id: currentRoll.grades_id || 1,
    weight: currentRoll.weight || 0,
    locations_id: currentRoll.locations_id ? String(currentRoll.locations_id) : '',
    jops_id: currentRoll.jops_id ? String(currentRoll.jops_id) : '',
    exmaterial: currentRoll.exMaterial || 'IMPORT',
    visual: currentRoll.visual || 'OK'
  })
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  async function handleDeleteRoll() {
    const confirmed = await SystemUI.confirm({
      title: 'Delete Roll Record',
      message: `Are you sure you want to delete roll "${currentRoll.id}"? This will free the allocated location slot and cannot be undone.`,
      confirmText: 'Delete Roll',
      cancelText: 'Cancel'
    })

    if (confirmed) {
      router.delete(`/rolls/${currentRoll.raw_id}`, {
        onSuccess: () => {
          SystemUI.toast({ message: 'Roll deleted successfully', type: 'success' })
        }
      })
    }
  }

  function handleAssignLocation() {
    if (currentRoll.location && currentRoll.location !== 'Unallocated') {
      SystemUI.toast({ message: `Location ${currentRoll.location} is currently allocated.`, type: 'info' })
    } else {
      setShowEditModal(true)
    }
  }

  function handleEditRoll() {
    setEditForm({
      no_roll: currentRoll.no_roll || currentRoll.id,
      form: currentRoll.raw_form ? String(currentRoll.raw_form) : '',
      shifts_id: currentRoll.shifts_id || 1,
      entry_date: currentRoll.date || new Date().toISOString().slice(0, 10),
      grades_id: currentRoll.grades_id || 1,
      weight: currentRoll.weight || 0,
      locations_id: currentRoll.locations_id ? String(currentRoll.locations_id) : '',
      jops_id: currentRoll.jops_id ? String(currentRoll.jops_id) : '',
      exmaterial: currentRoll.exMaterial || 'IMPORT',
      visual: currentRoll.visual || 'OK'
    })
    setShowEditModal(true)
  }

  function saveEdit() {
    router.put(`/rolls/${currentRoll.raw_id}`, editForm, {
      onSuccess: () => {
        SystemUI.toast({ message: `Roll ${editForm.no_roll} updated successfully.`, type: 'success' })
        setShowEditModal(false)
      },
      onError: (errs) => {
        setEditErrors(errs as any)
      }
    })
  }

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary btn-sm cursor-pointer" onClick={() => router.visit('/roll-inventory')}>
            <ArrowLeft size={13} /> <span>Back</span>
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Roll Detail — {currentRoll.id}</h2>
            <p className="text-xs text-slate-500">Comprehensive technical specifications & traceability</p>
          </div>
        </div>
        <span className="badge bg-blue-50 text-blue-700 border-blue-200 font-bold px-3 py-1 text-xs">
          {currentRoll.status}
        </span>
      </div>

      <div className="grid grid-cols-1 min-[680px]:grid-cols-2 min-[1180px]:grid-cols-3 gap-4">
        <Section title="Roll Information">
          <InfoRow label="Roll Number" value={currentRoll.id} />
          <InfoRow label="Form Number" value={currentRoll.form} />
          <InfoRow label="Shift" value={currentRoll.shift} />
          <InfoRow label="Entry Date" value={currentRoll.date} />
          <InfoRow label="PIC" value={currentRoll.pic} />
          <InfoRow label="Status" value={currentRoll.status} />
        </Section>

        <Section title="Specification">
          <InfoRow label="Grade" value={currentRoll.grade} />
          <InfoRow label="GSM" value={`${currentRoll.gsm} g/m²`} />
          <InfoRow label="Plybond" value={currentRoll.plybond} />
          <InfoRow label="Thickness" value={`${currentRoll.thickness} mm`} />
          <InfoRow label="Bulk" value={currentRoll.bulk} />
          <InfoRow label="Roll Width" value={`${currentRoll.width} mm`} />
          <InfoRow label="Roll Diameter" value={`${currentRoll.diameter} mm`} />
          <InfoRow label="Core" value={`${currentRoll.core} mm`} />
          <InfoRow label="Weight" value={`${currentRoll.weight} kg`} />
          <InfoRow label="Cobb" value={currentRoll.cobb} />
        </Section>

        <Section title="Inspection Information">
          <InfoRow label="Ex Material" value={currentRoll.exMaterial} />
          <InfoRow label="Visual" value={currentRoll.visual} />
        </Section>

        <Section title="Warehouse Information">
          <InfoRow label="Location" value={currentRoll.location} />
          <InfoRow label="Warehouse" value="Warehouse E17" />
          <InfoRow label="Slot Status" value={currentRoll.status} />
        </Section>

        <Section title="Order Information">
          <InfoRow label="Job Order Production" value={currentRoll.jop} />
          <InfoRow label="SPK" value={currentRoll.spk} />
          <InfoRow label="PO" value={currentRoll.po} />
          <InfoRow label="Customer" value={currentRoll.customer} />
          <InfoRow label="Order Status" value={currentRoll.orderStatus} />
        </Section>

        <Section title="OCR Recognition Log">
          <div className="flex items-center gap-2 mb-2 p-2 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle size={15} className="text-green-600 shrink-0" />
            <span className="text-xs font-semibold text-green-700">Recognition Successful</span>
          </div>
          <InfoRow label="OCR Timestamp" value={currentRoll.ocrTimestamp} />
          <InfoRow label="Detected Weight" value={`${currentRoll.ocrWeight} kg`} />
          <InfoRow label="Confidence" value={currentRoll.ocrConfidence} />
          <InfoRow label="OCR Status" value={currentRoll.ocrStatus} />
        </Section>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button className="btn btn-primary flex-1 sm:flex-initial justify-center cursor-pointer" onClick={handleAssignLocation}>
          <Package size={14} /> <span>Assign Location</span>
        </button>
        <button className="btn btn-secondary flex-1 sm:flex-initial justify-center cursor-pointer" onClick={handleEditRoll}>
          <Edit size={14} /> <span>Edit Roll Data</span>
        </button>
        <div className="w-full sm:w-auto flex justify-center sm:ml-auto mt-1 sm:mt-0">
          <button className="btn btn-danger justify-center cursor-pointer" onClick={handleDeleteRoll}>
            <Trash2 size={14} /> <span>Delete Roll</span>
          </button>
        </div>
      </div>

      {}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-5 bg-white rounded-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Roll Data</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Roll Number <span className="text-red-500">*</span></label>
                <input
                  value={editForm.no_roll}
                  onChange={e => setEditForm(f => ({ ...f, no_roll: e.target.value }))}
                  className="form-input w-full"
                />
                {editErrors.no_roll && <p className="text-red-600 text-[11px] mt-0.5">{editErrors.no_roll}</p>}
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Form Number</label>
                <input
                  type="number"
                  value={editForm.form}
                  onChange={e => setEditForm(f => ({ ...f, form: e.target.value }))}
                  className="form-input w-full"
                  placeholder="e.g. 1"
                />
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Shift</label>
                <select
                  value={editForm.shifts_id}
                  onChange={e => setEditForm(f => ({ ...f, shifts_id: Number(e.target.value) }))}
                  className="form-input w-full"
                >
                  {shifts.length > 0 ? shifts.map(s => (
                    <option key={s.id} value={s.id}>Shift {s.shift}</option>
                  )) : (
                    <>
                      <option value="1">Shift 1</option>
                      <option value="2">Shift 2</option>
                      <option value="3">Shift 3</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Entry Date</label>
                <input
                  type="date"
                  value={editForm.entry_date}
                  onChange={e => setEditForm(f => ({ ...f, entry_date: e.target.value }))}
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Grade</label>
                <select
                  value={editForm.grades_id}
                  onChange={e => setEditForm(f => ({ ...f, grades_id: Number(e.target.value) }))}
                  className="form-input w-full"
                >
                  {grades.length > 0 ? grades.map(g => (
                    <option key={g.id} value={g.id}>{g.grade}</option>
                  )) : (
                    <option value="1">SPECTA - LY3</option>
                  )}
                </select>
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Weight (kg)</label>
                <input
                  type="number"
                  value={editForm.weight}
                  onChange={e => setEditForm(f => ({ ...f, weight: Number(e.target.value) }))}
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Warehouse Location</label>
                <select
                  value={editForm.locations_id}
                  onChange={e => setEditForm(f => ({ ...f, locations_id: e.target.value }))}
                  className="form-input w-full"
                >
                  <option value="">Unallocated (No Slot)</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.location}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">JOP Order</label>
                <select
                  value={editForm.jops_id}
                  onChange={e => setEditForm(f => ({ ...f, jops_id: e.target.value }))}
                  className="form-input w-full"
                >
                  <option value="">No JOP Assigned</option>
                  {jops.map(j => (
                    <option key={j.id} value={j.id}>{j.jop}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Ex Material</label>
                <select
                  value={editForm.exmaterial}
                  onChange={e => setEditForm(f => ({ ...f, exmaterial: e.target.value }))}
                  className="form-input w-full"
                >
                  <option value="IMPORT">IMPORT</option>
                  <option value="LOCAL">LOCAL</option>
                </select>
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Visual</label>
                <input
                  value={editForm.visual}
                  onChange={e => setEditForm(f => ({ ...f, visual: e.target.value }))}
                  className="form-input w-full"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <button className="btn btn-secondary text-xs px-3 py-1.5" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary text-xs px-3 py-1.5" onClick={saveEdit}>
                Update Roll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
