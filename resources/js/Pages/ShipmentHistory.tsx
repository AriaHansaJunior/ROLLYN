import { useState, useMemo, useEffect } from 'react'
import { Calendar, PackageCheck, FileText, X, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { router } from '@inertiajs/react'

interface Roll {
  id: number
  no: number
  no_roll: string
  grade: string
  gsm: number
  width: number
  length: number
  weight: number
  joint: number
  type: string
  core: string
  status: string
  locations_id: number | null
}

interface ShipmentRoll {
  id: number
  roll_no: number
  qc_status: string
  qc_notes: string | null
  qc_checked_at: string | null
  roll: Roll
}

interface Shipment {
  id: number
  shipment_number: string
  shipment_date: string
  status: string
  customer: { id: number; customer: string }
  admin: { id: number; username: string }
  qc: { id: number; username: string }
  shipment_rolls: ShipmentRoll[]
}

interface Props {
  shipments: Shipment[]
  selectedDate: string
  shipmentDates?: string[]
}

export default function ShipmentHistory({ shipments, selectedDate, shipmentDates = [] }: Props) {
  const [activeShipment, setActiveShipment] = useState<Shipment | null>(shipments[0] || null)
  const [date, setDate] = useState(selectedDate)
  const [selectedRoll, setSelectedRoll] = useState<Roll | null>(null)
  const [currentMonth, setCurrentMonth] = useState(() => new Date(selectedDate || new Date().toISOString().slice(0, 10)))

  // Sync active shipment when shipments change
  useEffect(() => {
    if (shipments.length > 0) {
      setActiveShipment(shipments[0])
    } else {
      setActiveShipment(null)
    }
  }, [shipments])

  // Days for locked 7-col x 6-row grid (strictly 42 cells)
  const calendarGridDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay() // 0 = Sunday
    const totalDays = new Date(year, month + 1, 0).getDate()

    const days: (Date | null)[] = []
    // Leading empty slots
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    // Days in current month
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i))
    }
    // Trailing empty slots to lock strictly to 42 cells (6 rows x 7 columns)
    while (days.length < 42) {
      days.push(null)
    }
    return days
  }, [currentMonth])

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const goToToday = () => {
    const now = new Date()
    const nowStr = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-')
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    handleDateChange(nowStr)
  }

  function handleDateChange(newDate: string) {
    setDate(newDate)
    router.get('/shipment-history', { date: newDate }, { preserveState: true })
  }

  // Format date display (e.g., Rabu, 26 Agustus 2026)
  const formattedSelectedDate = useMemo(() => {
    try {
      const [y, m, d] = date.split('-').map(Number)
      const dObj = new Date(y, m - 1, d)
      return dObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return date
    }
  }, [date])

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4 min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] flex flex-col overflow-y-auto lg:overflow-hidden">
      {/* Title Bar */}
      <div className="flex flex-wrap justify-between items-center gap-3 flex-shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="text-blue-600" size={24} />
            Shipment History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Completed roll shipment history by date
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            Selected: {formattedSelectedDate}
          </span>
        </div>
      </div>

      {/* TOP: Fixed Grid Calendar (Locked 7 Columns across x 6 Rows down) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs flex-shrink-0 overflow-hidden">
        {/* Calendar Controls & Legend */}
        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
              <button
                onClick={prevMonth}
                className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 font-bold text-slate-800 select-none min-w-[140px] text-center">
                {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={nextMonth}
                className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={goToToday}
              className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block ring-2 ring-red-200"></span>
            <span className="font-medium text-[11px]">Has Shipment</span>
          </div>
        </div>

        {/* Locked Grid: 7 Columns x 6 Rows */}
        <div className="p-3">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 mb-1">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarGridDays.map((d, i) => {
              if (!d) return <div key={i} className="h-8 sm:h-9" />
              const dateStr = [
                d.getFullYear(),
                String(d.getMonth() + 1).padStart(2, '0'),
                String(d.getDate()).padStart(2, '0')
              ].join('-')
              const isSelected = dateStr === date
              const hasShipment = shipmentDates.includes(dateStr)
              return (
                <button
                  key={i}
                  onClick={() => handleDateChange(dateStr)}
                  className={`h-8 sm:h-9 relative rounded-lg text-xs font-medium transition-all cursor-pointer flex flex-col items-center justify-center select-none ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="leading-none">{d.getDate()}</span>
                  {hasShipment && (
                    <span
                      className={`w-1 h-1 rounded-full mt-0.5 ${
                        isSelected ? 'bg-white' : 'bg-red-500'
                      }`}
                    ></span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM: 2-Column Content Layout (List & Details) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left Column: Shipments List (lg:col-span-4) */}
        <div className="lg:col-span-4 flex flex-col min-h-0 bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center flex-shrink-0">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <PackageCheck size={14} className="text-blue-600" />
              Shipments on {date}
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {shipments.length} {shipments.length === 1 ? 'Shipment' : 'Shipments'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {shipments.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <PackageCheck size={36} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium">No completed shipments on this date.</p>
                <p className="text-[11px] text-slate-400 mt-1">Select a date with a red indicator to view records.</p>
              </div>
            ) : (
              shipments.map((s) => {
                const isActive = activeShipment?.id === s.id
                return (
                  <div
                    key={s.id}
                    onClick={() => setActiveShipment(s)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isActive
                        ? 'bg-blue-50/80 border-blue-400 shadow-xs ring-1 ring-blue-300'
                        : 'bg-white border-slate-200/80 hover:border-blue-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        {s.shipment_number}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 size={10} />
                        Completed
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-700 line-clamp-1 mb-2">
                      {s.customer?.customer}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-medium">
                        <FileText size={11} className="text-blue-500" />
                        {s.shipment_rolls?.length || 0} {(s.shipment_rolls?.length || 0) === 1 ? 'Roll' : 'Rolls'}
                      </span>
                      <span className="text-slate-400 text-[10px]">QC: {s.qc?.username}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Rolls in Active Shipment (lg:col-span-8) */}
        <div className="lg:col-span-8 flex flex-col min-h-0 bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          {activeShipment ? (
            <>
              <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex-shrink-0 flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Shipment Details:
                    <span className="text-blue-700 font-extrabold">{activeShipment.shipment_number}</span>
                  </h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                    <p>
                      <span className="font-semibold text-slate-500">Customer:</span>{' '}
                      <span className="font-bold text-slate-800">{activeShipment.customer?.customer}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-slate-500">Admin:</span>{' '}
                      <span className="text-slate-700">{activeShipment.admin?.username}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-slate-500">Total Rolls:</span>{' '}
                      <span className="font-bold text-blue-600">{activeShipment.shipment_rolls?.length || 0} {(activeShipment.shipment_rolls?.length || 0) === 1 ? 'roll' : 'rolls'}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-white shadow-xs z-10">
                    <tr className="border-b border-slate-200 text-slate-600 bg-slate-50/90 backdrop-blur-xs">
                      <th className="py-2.5 px-4 font-bold">Roll No.</th>
                      <th className="py-2.5 px-4 font-bold">Grade</th>
                      <th className="py-2.5 px-4 font-bold">GSM</th>
                      <th className="py-2.5 px-4 font-bold text-right">Weight (kg)</th>
                      <th className="py-2.5 px-4 font-bold text-center">QC Status</th>
                      <th className="py-2.5 px-4 font-bold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeShipment.shipment_rolls || []).map((sr) => (
                      <tr
                        key={sr.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {sr.roll?.no_roll || sr.roll_no}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{sr.roll?.grade || '—'}</td>
                        <td className="py-3 px-4 text-slate-600">{sr.roll?.gsm || '—'}</td>
                        <td className="py-3 px-4 text-slate-700 text-right font-medium">
                          {sr.roll?.weight ? `${Number(sr.roll.weight).toLocaleString('en-US')} kg` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              sr.qc_status === 'passed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {sr.qc_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedRoll(sr.roll)}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <PackageCheck size={48} className="mb-3 opacity-25" />
              <p className="text-sm font-semibold text-slate-600">Select a shipment to view roll details.</p>
              <p className="text-xs text-slate-400 mt-0.5">Click on any item from the shipment list on the left.</p>
            </div>
          )}
        </div>
      </div>

      {/* Roll Detail Modal */}
      {selectedRoll && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-0 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Roll Details</h3>
                <p className="text-xs text-slate-500">No: {selectedRoll.no_roll}</p>
              </div>
              <button
                onClick={() => setSelectedRoll(null)}
                className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Grade</p>
                  <p className="text-sm font-bold text-slate-800">{selectedRoll.grade}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">GSM</p>
                  <p className="text-sm font-bold text-slate-800">{selectedRoll.gsm}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Width (cm)</p>
                  <p className="text-sm font-bold text-slate-800">{selectedRoll.width}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Length (m)</p>
                  <p className="text-sm font-bold text-slate-800">{selectedRoll.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Weight (kg)</p>
                  <p className="text-sm font-bold text-slate-800">{selectedRoll.weight}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Joint</p>
                  <p className="text-sm font-bold text-slate-800">{selectedRoll.joint}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Type</p>
                  <p className="text-sm font-bold text-slate-800 capitalize">{selectedRoll.type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Core</p>
                  <p className="text-sm font-bold text-slate-800 capitalize">{selectedRoll.core}</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                className="btn btn-secondary text-xs px-4 py-2"
                onClick={() => setSelectedRoll(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

