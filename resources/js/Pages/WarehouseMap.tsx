import { useState, useEffect } from 'react'
import { X, Package, MoveRight, Layers, Eye, MapPin, Calendar, AlertCircle } from 'lucide-react'
import { Link, router } from '@inertiajs/react'

type SlotStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface LocationItem {
  id: number
  location: string
  status: number
  rolls?: { no: number; no_roll: string }[]
}

interface Slot {
  id: number
  code: string
  status: SlotStatus
  rollId?: number
  rollNumber?: string
}

interface Props {
  locations?: LocationItem[]
}

const statusConfig: Record<number, { label: string; bgClass: string; dot: string }> = {
  0: { label: 'Free Space', bgClass: 'bg-white border-2 border-gray-300 text-gray-800', dot: '#ffffff' },
  1: { label: 'Slot Planning', bgClass: 'bg-gray-200 border-2 border-gray-300 text-gray-800', dot: '#e5e7eb' },
  2: { label: 'Slotted', bgClass: 'bg-gray-500 border-2 border-gray-600 text-white', dot: '#6b7280' },
  3: { label: 'Shipment Plan', bgClass: 'bg-green-600 border-2 border-green-700 text-white', dot: '#16a34a' },
  4: { label: 'Non-PO', bgClass: 'bg-red-600 border-2 border-red-700 text-white', dot: '#dc2626' },
  5: { label: 'Move to Another Warehouse', bgClass: 'bg-yellow-400 border-2 border-yellow-500 text-gray-900', dot: '#facc15' },
  6: { label: 'HOLD', bgClass: 'bg-blue-500 border-2 border-blue-600 text-white', dot: '#3b82f6' },
}

export default function WarehouseMap({ locations = [] }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [assignMode, setAssignMode] = useState(false)
  const [assignRollId, setAssignRollId] = useState<string | null>(null)
  const [assignRollNo, setAssignRollNo] = useState<string | null>(null)
  const [showAssignPopup, setShowAssignPopup] = useState(false)
  const [assignSlot, setAssignSlot] = useState<Slot | null>(null)
  const [assignForm, setAssignForm] = useState({
    rollNumber: '',
    entryDate: new Date().toISOString().slice(0, 10),
  })

  // Detect assign_roll query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rollId = params.get('assign_roll')
    const rollNo = params.get('roll_no')
    if (rollId) {
      setAssignMode(true)
      setAssignRollId(rollId)
      setAssignRollNo(rollNo ? decodeURIComponent(rollNo) : rollId)
    }
  }, [])

  const slotList: Slot[] = locations.length > 0 ? locations.map(loc => ({
    id: loc.id,
    code: loc.location,
    status: (loc.status >= 0 && loc.status <= 6 ? loc.status : 0) as SlotStatus,
    rollId: loc.rolls && loc.rolls.length > 0 ? loc.rolls[0].no : undefined,
    rollNumber: loc.rolls && loc.rolls.length > 0 ? loc.rolls[0].no_roll : undefined,
  })) : Array.from({ length: 12 }, (_, colIdx) =>
    Array.from({ length: 4 }, (_, tierIdx) => ({
      id: colIdx * 4 + tierIdx + 1,
      code: `E17-${String(colIdx + 1).padStart(2, '0')}-${tierIdx + 1}`,
      status: 0 as SlotStatus
    }))
  ).flat()

  function handleSlotClick(slot: Slot) {
    if (assignMode) {
      // In assignment mode, clicking a Free Space slot opens the assignment popup
      if (slot.status === 0) {
        setAssignSlot(slot)
        setAssignForm({
          rollNumber: '',
          entryDate: new Date().toISOString().slice(0, 10),
        })
        setShowAssignPopup(true)
      }
    } else {
      setSelectedSlot(selectedSlot?.code === slot.code ? null : slot)
    }
  }

  function cancelAssignMode() {
    setAssignMode(false)
    setAssignRollId(null)
    setAssignRollNo(null)
    // Clean up URL
    const url = new URL(window.location.href)
    url.searchParams.delete('assign_roll')
    url.searchParams.delete('roll_no')
    window.history.replaceState({}, '', url.toString())
  }

  return (
    <div className="py-4 px-2.5 sm:px-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Warehouse Map</h2>
        </div>
      </div>

      {/* Assignment Mode Banner */}
      {assignMode && (
        <div className="mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MapPin size={18} className="text-blue-600 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-blue-900">Assign Roll Mode</div>
              <div className="text-xs text-blue-700 truncate">
                Assigning roll <span className="font-bold font-mono">{assignRollNo}</span> — Select a <span className="font-bold">Free Space</span> slot below
              </div>
            </div>
          </div>
          <button
            className="btn btn-secondary text-xs px-3 py-1.5 shrink-0 cursor-pointer"
            onClick={cancelAssignMode}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row items-stretch gap-6 overflow-x-hidden w-full relative">

        {/* Warehouse Grid */}
        <div className="flex-1 min-w-0 transition-all duration-500 ease-in-out transform-gpu bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                E17
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Warehouse E17
                </h3>
              </div>
            </div>

            <div className="flex sm:hidden items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              <span>Scroll right</span>
              <MoveRight size={13} />
            </div>
          </div>

          {/* Grid */}
          <div className="w-full overflow-x-auto pb-4 pt-2 px-2 no-scrollbar snap-x">
            <div className="flex flex-col gap-3 min-w-[700px] md:min-w-full">
              {/* Column Headers */}
              <div className="flex items-center gap-3">
                <div className="grid grid-cols-12 gap-3 flex-1">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(col => (
                    <div key={col} className="text-center text-[10px] font-bold text-slate-400">
                      {String(col).padStart(2, '0')}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tiers */}
              {[1, 2, 3, 4].map(tier => (
                <div key={tier} className="flex items-center gap-3">
                  {/* Slots */}
                  <div className="grid grid-cols-12 gap-3 flex-1">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(col => {
                      const code = `E17-${String(col).padStart(2, '0')}-${tier}`;
                      const slot = slotList.find(s => s.code === code) || {
                        id: 0,
                        code,
                        status: 0 as SlotStatus
                      };
                      const cfg = statusConfig[slot.status];
                      const isSelected = selectedSlot?.code === code;
                      const isAssignTarget = assignMode && slot.status === 0;

                      return (
                        <div key={code} className="relative group aspect-square snap-center">
                          <button
                            onClick={() => handleSlotClick(slot)}
                            className={`flex items-center justify-center w-full h-full min-h-[3rem] whitespace-nowrap rounded-md text-[10px] tracking-tighter leading-none font-bold text-center break-words acos-smooth-hover cursor-pointer shadow-sm ${
                              isSelected
                                ? `${cfg.bgClass} ring-4 ring-offset-2 ring-indigo-500 scale-105 z-10 transition-transform`
                                : isAssignTarget
                                  ? `${cfg.bgClass} ring-2 ring-emerald-400 hover:ring-4 hover:ring-emerald-500 hover:scale-105 transition-all`
                                  : `${cfg.bgClass}`
                            }`}
                          >
                            {code}
                          </button>
                          {/* Tooltip */}
                          <div className={`hidden md:block absolute bottom-full mb-2 w-max px-3 py-1.5 bg-slate-900 text-white text-[11px] font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 shadow-xl whitespace-nowrap ${
                            col === 1 ? 'left-0' : col === 12 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                          }`}>
                            Location: <span className="font-bold text-blue-300">{code}</span> | Status: {cfg.label}
                            <div className={`absolute top-full border-4 border-transparent border-t-slate-900 ${
                              col === 1 ? 'left-4' : col === 12 ? 'right-4' : 'left-1/2 -translate-x-1/2'
                            }`}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Slot Status Legend</div>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <div
                  key={key}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 bg-slate-50/50"
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: cfg.dot }} />
                  <span className="text-[11px] font-medium text-slate-700">{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Slot Planning → Slotted flow hint */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <AlertCircle size={14} className="text-slate-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-500 leading-relaxed m-0">
                <span className="font-bold text-slate-700">Slot Planning</span> indicates a slot has been reserved for a roll but the roll has not yet physically arrived.
                Once the roll is placed in the warehouse, the PIC updates the status to <span className="font-bold text-slate-700">Slotted</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Detail Sidebar (non-assign mode only) */}
        {!assignMode && (
          <div
            className={`flex-shrink-0 overflow-hidden acos-layout-transition ${
              selectedSlot ? "w-full lg:w-80 opacity-100 max-h-[1000px] mt-2 lg:mt-0" : "w-full lg:w-0 opacity-0 max-h-0 lg:max-h-[1000px]"
            }`}
          >
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col gap-3 w-full lg:w-80 h-full acos-sidebar-enter">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                    <Layers size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Location Detail</h3>
                    <div className="text-[11px] font-mono text-slate-500">{selectedSlot?.code || '-'}</div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Location Code</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedSlot?.code || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Warehouse Area</span>
                  <span className="font-medium text-slate-800">Warehouse E17</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-slate-800">
                    {selectedSlot ? statusConfig[selectedSlot.status].label : ''}
                  </span>
                </div>
                {selectedSlot?.status !== 0 && selectedSlot?.rollNumber && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Roll Number</span>
                    <span className="font-bold text-slate-900">{selectedSlot.rollNumber}</span>
                  </div>
                )}
              </div>

              {selectedSlot?.status !== 0 && selectedSlot?.rollNumber && (
                <div className="mt-5 flex justify-end">
                  <Link
                    href={`/roll-detail/${selectedSlot.rollNumber}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Eye size={16} />
                    See details
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Assignment Popup Modal */}
      {showAssignPopup && assignSlot && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="card w-full sm:max-w-md p-5 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <MapPin size={15} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Assign Roll to Slot</h3>
              </div>
              <button onClick={() => setShowAssignPopup(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Assignment Info */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Roll</span>
                <span className="font-bold text-blue-700 font-mono">{assignRollNo}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Warehouse</span>
                <span className="font-semibold text-slate-800">Warehouse E17</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Slot</span>
                <span className="font-bold text-slate-900 font-mono">{assignSlot.code}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Initial Status</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px]">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  Slot Planning
                </span>
              </div>
            </div>

            {/* Status flow explanation */}
            <div className="flex items-start gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
              <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-700 leading-relaxed m-0">
                The roll will initially be set to <span className="font-bold">Slot Planning</span>.
                Once the roll physically arrives at the warehouse, the PIC can update the status to <span className="font-bold">Slotted</span>.
              </p>
            </div>

            {/* Editable fields */}
            <div className="space-y-3">
              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">
                  Roll Number <span className="text-red-500">*</span>
                </label>
                <input
                  value={assignForm.rollNumber}
                  onChange={e => setAssignForm(f => ({ ...f, rollNumber: e.target.value }))}
                  className="form-input w-full"
                  placeholder="Enter roll number"
                />
                <p className="text-[10px] text-slate-400 mt-1">Manually assigned during warehouse assignment</p>
              </div>

              <div>
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">
                  <Calendar size={12} className="inline mr-1" />
                  Warehouse Entry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={assignForm.entryDate}
                  onChange={e => setAssignForm(f => ({ ...f, entryDate: e.target.value }))}
                  className="form-input w-full"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <button className="btn btn-secondary text-xs px-3 py-1.5" onClick={() => setShowAssignPopup(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary text-xs px-3 py-1.5"
                onClick={() => {
                  // Use existing roll update endpoint to assign location
                  if (!assignForm.rollNumber.trim()) {
                    return
                  }
                  if (assignRollId) {
                    router.put(`/rolls/${assignRollId}`, {
                      locations_id: String(assignSlot.id),
                      no_roll: assignForm.rollNumber,
                      entry_date: assignForm.entryDate,
                    }, {
                      onSuccess: () => {
                        setShowAssignPopup(false)
                        cancelAssignMode()
                      },
                      onError: (errors) => {
                        // Do not fake success; show an alert if backend fails due to partial update limitations
                        alert("Failed to assign roll. The existing API does not support partial updates. Please ensure all required data is provided.")
                      }
                    })
                  }
                }}
              >
                Assign Roll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
