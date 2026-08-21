import React, { useState, useRef } from 'react'
import { ArrowLeft, Package, CheckCircle, Trash2, Edit, X, MapPin } from 'lucide-react'
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
  status?: number
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

  const isSlotted = Boolean(currentRoll.locations_id) || (Boolean(currentRoll.location) && currentRoll.location !== 'Unallocated' && currentRoll.location !== 'No Slot' && currentRoll.location !== '—')

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

  // Assign / Move Location Modal State
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [modalMode, setModalMode] = useState<'assign' | 'move'>('assign')
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const [selectedSlotCode, setSelectedSlotCode] = useState<string>('')
  const lastNotifyRef = useRef<number>(0)

  // Build 12x4 slots for Warehouse E17
  const fullMapSlots = Array.from({ length: 12 }, (_, colIdx) =>
    Array.from({ length: 4 }, (_, tierIdx) => {
      const code = `E17-${String(colIdx + 1).padStart(2, '0')}-${tierIdx + 1}`
      const match = locations.find(l => (l.location || (l as any).code) === code)
      return {
        id: match ? match.id : (colIdx * 4 + tierIdx + 1),
        code,
        status: match ? (match.status ?? 0) : 0,
      }
    })
  ).flat()

  // Tier Stacking Constraint Check: Tier N can only be filled if Tier N-1 below is filled
  function isTierSelectable(col: number, tier: number): boolean {
    if (tier === 1) return true

    const slotBelowCode = `E17-${String(col).padStart(2, '0')}-${tier - 1}`
    const slotBelow = fullMapSlots.find(s => s.code === slotBelowCode)

    const isBelowFilled = slotBelow ? (slotBelow.status !== 0 || String(selectedLocationId) === String(slotBelow.id)) : false
    return isBelowFilled
  }

  // Calculate first valid recommended slot
  const recommendedSlot = fullMapSlots.find(s => {
    if (s.status !== 0) return false
    const parts = s.code.split('-')
    const col = parseInt(parts[1], 10)
    const tier = parseInt(parts[2], 10)
    return isTierSelectable(col, tier)
  })

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
    if (isSlotted) {
      const now = Date.now()
      if (now - lastNotifyRef.current < 5000) return
      lastNotifyRef.current = now
      SystemUI.toast({
        message: `Roll "${currentRoll.id}" is already assigned to slot ${currentRoll.location}. Use "Move Location" to relocate this roll.`,
        type: 'warning',
        duration: 4000
      })
      return
    }

    setModalMode('assign')
    setSelectedLocationId('')
    setSelectedSlotCode('')
    setShowAssignModal(true)
  }

  function handleMoveLocation() {
    if (!isSlotted) {
      const now = Date.now()
      if (now - lastNotifyRef.current < 5000) return
      lastNotifyRef.current = now
      SystemUI.toast({
        message: `Roll "${currentRoll.id}" is not assigned to any slot yet. Use "Assign Location" first.`,
        type: 'warning',
        duration: 4000
      })
      return
    }

    setModalMode('move')
    setSelectedLocationId('')
    setSelectedSlotCode('')
    setShowAssignModal(true)
  }

  function confirmAssignLocation() {
    if (!selectedLocationId) {
      SystemUI.toast({ message: 'Please click on a valid available slot in the warehouse map grid.', type: 'error' })
      return
    }

    const actionText = modalMode === 'move' ? 'moved' : 'assigned'

    router.put(`/rolls/${currentRoll.raw_id}`, {
      locations_id: selectedLocationId,
      recommended_locations_id: recommendedSlot ? String(recommendedSlot.id) : null,
      action_type: modalMode === 'move' ? 'MOVE' : 'ASSIGN'
    }, {
      onSuccess: () => {
        SystemUI.toast({
          message: `Roll ${currentRoll.id} successfully ${actionText} to slot ${selectedSlotCode}!`,
          type: 'success'
        })
        setShowAssignModal(false)
      },
      onError: () => {
        SystemUI.toast({ message: `Failed to ${modalMode} location slot.`, type: 'error' })
      }
    })
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

      {/* Action Buttons Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button
          className={`btn flex-1 sm:flex-initial justify-center cursor-pointer ${
            isSlotted ? 'btn-secondary text-slate-500' : 'btn-primary'
          }`}
          onClick={handleAssignLocation}
        >
          <Package size={14} /> <span>Assign Location</span>
        </button>

        <button
          className={`btn flex-1 sm:flex-initial justify-center cursor-pointer ${
            isSlotted ? 'btn-primary' : 'btn-secondary text-slate-500'
          }`}
          onClick={handleMoveLocation}
        >
          <MapPin size={14} /> <span>Move Location</span>
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

      {/* Edit Roll Modal */}
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

      {/* Interactive Warehouse Map Slot Selection Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="card w-full max-w-4xl p-4 sm:p-6 bg-white rounded-2xl shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                    E17
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {modalMode === 'move' ? 'Move Roll Location (Relocate)' : 'Select Warehouse Location Slot'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {modalMode === 'move'
                        ? `Current Slot: ${currentRoll.location} ➔ Select a new valid warehouse slot below`
                        : 'Warehouse E17 Grid Layout — Click an available slot card to assign'}
                    </p>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-700 p-1.5 cursor-pointer rounded-lg hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            {/* Roll Info Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-400 font-medium">Roll Number: </span>
                  <span className="font-bold text-blue-700 font-mono text-sm ml-1">{currentRoll.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Grade: </span>
                  <span className="font-semibold text-slate-800 ml-1">{currentRoll.grade} ({currentRoll.gsm} g/m²)</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Weight: </span>
                  <span className="font-mono text-slate-800 ml-1">{currentRoll.weight} kg</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Selected Slot: </span>
                  {selectedSlotCode ? (
                    <span className="font-mono font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded text-xs">{selectedSlotCode}</span>
                  ) : (
                    <span className="italic text-slate-400">None Clicked</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Recommendation Slot: </span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs">
                    {recommendedSlot?.code || 'E17-04-1 (Auto)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Warehouse Grid */}
            <div className="card overflow-x-auto p-3 sm:p-4 bg-slate-50/50 border border-slate-200/80 rounded-xl">
              <div className="flex flex-col gap-2.5 min-w-[760px]">
                {/* Column Headers 01 - 12 */}
                <div className="grid grid-cols-12 gap-2 text-center text-[11px] font-bold text-slate-400">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(col => (
                    <div key={col}>{String(col).padStart(2, '0')}</div>
                  ))}
                </div>

                {/* Tier Rows 1 - 4 */}
                {[1, 2, 3, 4].map(tier => (
                  <div key={tier} className="grid grid-cols-12 gap-2">
                    {Array.from({ length: 12 }, (_, colIdx) => {
                      const col = colIdx + 1
                      const code = `E17-${String(col).padStart(2, '0')}-${tier}`
                      const slot = fullMapSlots.find(s => s.code === code) || { id: 0, code, status: 0 }
                      const isSelected = String(selectedLocationId) === String(slot.id)
                      const isOccupied = slot.status !== 0
                      const isSelectable = !isOccupied && isTierSelectable(col, tier)

                      return (
                        <button
                          key={code}
                          type="button"
                          disabled={!isSelectable}
                          onClick={() => {
                            if (!isSelectable && !isOccupied) {
                              const belowCode = `E17-${String(col).padStart(2, '0')}-${tier - 1}`
                              SystemUI.toast({
                                message: `Cannot select ${code}. Slot ${belowCode} underneath must be filled first!`,
                                type: 'warning',
                                duration: 3500
                              })
                              return
                            }
                            setSelectedLocationId(String(slot.id))
                            setSelectedSlotCode(code)
                          }}
                          className={`flex items-center justify-center py-2.5 px-0.5 min-h-[42px] rounded-xl text-[9px] sm:text-[10px] font-bold transition-all whitespace-nowrap leading-none ${
                            isSelected
                              ? 'bg-blue-600 border-2 border-blue-700 text-white ring-2 ring-blue-500 ring-offset-1 scale-105 z-10 shadow-md font-extrabold cursor-pointer'
                              : isOccupied
                              ? 'bg-slate-200 border border-slate-300 text-slate-400 cursor-not-allowed opacity-60'
                              : !isSelectable
                              ? 'bg-slate-100 border border-dashed border-slate-300 text-slate-400 cursor-not-allowed opacity-50'
                              : 'bg-white border border-slate-300 text-slate-800 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 hover:scale-105 cursor-pointer shadow-xs'
                          }`}
                          title={!isSelectable && !isOccupied ? `Fill E17-${String(col).padStart(2, '0')}-${tier - 1} below first` : code}
                        >
                          <span className="whitespace-nowrap tracking-tighter">{code}</span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-white border border-slate-300" />
                  <span className="text-slate-600 text-[11px]">Free Space (Available)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-slate-100 border border-dashed border-slate-300" />
                  <span className="text-slate-600 text-[11px]">Blocked (Fill Lower Tier First)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-slate-300 border border-slate-400" />
                  <span className="text-slate-600 text-[11px]">Occupied / Slotted</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-blue-600 border border-blue-700" />
                  <span className="text-slate-600 text-[11px] font-bold">Selected Slot</span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2 justify-end">
                <button className="btn btn-secondary text-xs px-4 py-2 cursor-pointer" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary text-xs px-4 py-2 cursor-pointer font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!selectedLocationId}
                  onClick={confirmAssignLocation}
                >
                  {modalMode === 'move' ? 'Confirm Move Slot' : 'Confirm Assign Slot'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
