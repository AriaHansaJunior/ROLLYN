import { useState, useMemo, useEffect } from 'react'
import { 
  Calendar, 
  PackageCheck, 
  FileText, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Printer, 
  Search, 
  ArrowRight,
  Sparkles,
  Ban
} from 'lucide-react'
import { router } from '@inertiajs/react'

interface Roll {
  id: number
  no: number
  no_roll: string
  grade: string
  gsm: number
  width: number
  diameter?: number | string
  length: number
  weight: number
  joint: number
  type: string
  core: string
  status: string
  location?: string
  locations_id?: number | null
}

interface ShipmentRoll {
  id: number
  roll_no: number
  qc_status: string
  qc_notes: string | null
  qc_issues?: string[] | null
  qc_checked_at: string | null
  roll: Roll
}

interface Shipment {
  id: number
  shipment_number: string
  shipment_date: string
  status: string
  customer: { id: number | number[]; customer: string }
  admin: { id: number; username: string }
  qc: { id: number; username: string }
  qc_report_notes?: string | null
  shipment_rolls: ShipmentRoll[]
}

interface Props {
  shipments: Shipment[]
  selectedDate: string
  shipmentDates?: string[]
  selectedStatus?: string
  statusCounts?: Record<string, number>
}

export default function ShipmentHistory({ 
  shipments, 
  selectedDate, 
  shipmentDates = [], 
  selectedStatus = 'all',
  statusCounts = {} 
}: Props) {
  const [activeShipment, setActiveShipment] = useState<Shipment | null>(shipments[0] || null)
  const [date, setDate] = useState(selectedDate)
  const [statusFilter, setStatusFilter] = useState(selectedStatus)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoll, setSelectedRoll] = useState<Roll | null>(null)
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number)
      if (!isNaN(y) && !isNaN(m)) return new Date(y, m - 1, 1)
    }
    return new Date()
  })

  // Sync state when props from Inertia reload/change
  useEffect(() => {
    setDate(selectedDate)
    if (selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number)
      if (!isNaN(y) && !isNaN(m)) {
        setCurrentMonth(new Date(y, m - 1, 1))
      }
    }
  }, [selectedDate])

  useEffect(() => {
    if (selectedStatus) {
      setStatusFilter(selectedStatus)
    }
  }, [selectedStatus])

  // Sync active shipment when shipments list changes
  useEffect(() => {
    if (shipments.length > 0) {
      setActiveShipment((prev) => {
        if (prev && shipments.some((s) => s.id === prev.id)) {
          return shipments.find((s) => s.id === prev.id) || shipments[0]
        }
        return shipments[0]
      })
    } else {
      setActiveShipment(null)
    }
  }, [shipments])

  // Calendar 7x6 Grid (strictly 42 cells)
  const calendarGridDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay() // 0 = Sunday
    const totalDays = new Date(year, month + 1, 0).getDate()

    const days: (Date | null)[] = []
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i))
    }
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

  const goToLatest = () => {
    if (shipmentDates.length > 0) {
      const latest = shipmentDates[0]
      const [y, m] = latest.split('-').map(Number)
      if (!isNaN(y) && !isNaN(m)) {
        setCurrentMonth(new Date(y, m - 1, 1))
      }
      handleDateChange(latest)
    }
  }

  function handleDateChange(newDate: string) {
    setDate(newDate)
    router.get(
      '/shipment-history', 
      { date: newDate, status: statusFilter }, 
      { preserveState: true, preserveScroll: true, replace: true }
    )
  }

  function handleStatusChange(newStatus: string) {
    setStatusFilter(newStatus)
    router.get(
      '/shipment-history', 
      { date, status: newStatus }, 
      { preserveState: true, preserveScroll: true, replace: true }
    )
  }

  // Format date display (e.g. Wednesday, October 8, 2026)
  const formattedSelectedDate = useMemo(() => {
    try {
      if (!date) return '—'
      const [y, m, d] = date.split('-').map(Number)
      const dObj = new Date(y, m - 1, d)
      return dObj.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return date
    }
  }, [date])

  const formatShortDate = (dStr: string) => {
    try {
      const [y, m, d] = dStr.split('-').map(Number)
      return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return dStr
    }
  }

  // Filter shipments locally by search query
  const filteredShipments = useMemo(() => {
    if (!searchQuery.trim()) return shipments
    const q = searchQuery.toLowerCase().trim()
    return shipments.filter((s) => {
      const numMatch = s.shipment_number?.toLowerCase().includes(q)
      const custMatch = s.customer?.customer?.toLowerCase().includes(q)
      const rollMatch = s.shipment_rolls?.some(sr => 
        sr.roll?.no_roll?.toLowerCase().includes(q) || String(sr.roll_no).includes(q)
      )
      return numMatch || custMatch || rollMatch
    })
  }, [shipments, searchQuery])

  const renderStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s === 'completed') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1 border border-emerald-200">
          <CheckCircle2 size={11} />
          Completed
        </span>
      )
    }
    if (s === 'pending') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1 border border-amber-200">
          <Clock size={11} />
          Pending
        </span>
      )
    }
    if (s === 'qc_in_progress') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1 border border-blue-200">
          <Sparkles size={11} />
          QC In Progress
        </span>
      )
    }
    if (s === 'canceled' || s === 'cancelled') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 flex items-center gap-1 border border-rose-200">
          <Ban size={11} />
          Canceled
        </span>
      )
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
        {status}
      </span>
    )
  }

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4 min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] flex flex-col overflow-y-auto lg:overflow-hidden bg-slate-50/50">
      {/* Title Bar & Status Filter */}
      <div className="flex flex-wrap justify-between items-center gap-3 flex-shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="text-blue-600" size={24} />
            Shipment History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View completed and scheduled shipments archive by date
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs overflow-x-auto max-w-full">
          {[
            { id: 'all', label: 'All', count: statusCounts.all ?? 0 },
            { id: 'completed', label: 'Completed', count: statusCounts.completed ?? 0 },
            { id: 'pending', label: 'Pending', count: statusCounts.pending ?? 0 },
            { id: 'qc_in_progress', label: 'QC Checking', count: statusCounts.qc_in_progress ?? 0 },
          ].map((tab) => {
            const isActive = statusFilter === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleStatusChange(tab.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer select-none shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* TOP: Fixed Grid Calendar */}
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

            {shipmentDates.length > 0 && (
              <button
                onClick={goToLatest}
                className="px-2.5 py-1 text-xs font-semibold bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg text-blue-700 transition-colors cursor-pointer flex items-center gap-1"
                title={`Jump to latest shipment date (${formatShortDate(shipmentDates[0])})`}
              >
                <Sparkles size={12} className="text-blue-600" />
                Latest ({formatShortDate(shipmentDates[0])})
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block ring-2 ring-red-200"></span>
              <span className="font-medium text-[11px]">Has Shipment</span>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Selected: {formattedSelectedDate}
            </span>
          </div>
        </div>

        {/* Calendar Grid: 7 Columns x 6 Rows */}
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
                      ? 'bg-blue-600 text-white font-bold shadow-xs ring-2 ring-blue-400/50'
                      : hasShipment
                      ? 'bg-blue-50/70 hover:bg-blue-100/80 text-blue-900 font-semibold border border-blue-200/60'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="leading-none">{d.getDate()}</span>
                  {hasShipment && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        isSelected ? 'bg-white' : 'bg-red-500 ring-1 ring-white'
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
          {/* Header & Search */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex flex-col gap-2 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <PackageCheck size={14} className="text-blue-600" />
                Shipments on {date}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {filteredShipments.length} {filteredShipments.length === 1 ? 'Shipment' : 'Shipments'}
              </span>
            </div>

            {/* Quick search */}
            {shipments.length > 1 && (
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter shipment no. or customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Shipment Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredShipments.length === 0 ? (
              <div className="text-center py-8 px-4 text-slate-400">
                <PackageCheck size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-xs font-semibold text-slate-700">No shipments found on {date}.</p>
                
                {shipmentDates.length > 0 ? (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-[11px] font-medium text-slate-500 mb-2">
                      Available shipment dates:
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {shipmentDates.map((dStr) => (
                        <button
                          key={dStr}
                          onClick={() => handleDateChange(dStr)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>{formatShortDate(dStr)}</span>
                          <ArrowRight size={10} />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    No shipments found matching the active status filter.
                  </p>
                )}
              </div>
            ) : (
              filteredShipments.map((s) => {
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
                      {renderStatusBadge(s.status)}
                    </div>

                    <div className="text-xs font-semibold text-slate-700 line-clamp-1 mb-2">
                      Customer: <span className="text-slate-900 font-bold">{s.customer?.customer || '—'}</span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-medium">
                        <FileText size={11} className="text-blue-500" />
                        {s.shipment_rolls?.length || 0} {(s.shipment_rolls?.length || 0) === 1 ? 'Roll' : 'Rolls'}
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        QC: <strong className="text-slate-700">{s.qc?.username || '—'}</strong>
                      </span>
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
              {/* Active Shipment Header & Actions */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex-shrink-0 flex flex-wrap justify-between items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      Shipment:
                      <span className="text-blue-700 font-extrabold">{activeShipment.shipment_number}</span>
                    </h3>
                    {renderStatusBadge(activeShipment.status)}
                  </div>
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                    <p>
                      <span className="font-semibold text-slate-500">Customer:</span>{' '}
                      <span className="font-bold text-slate-800">{activeShipment.customer?.customer || '—'}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-slate-500">Admin:</span>{' '}
                      <span className="text-slate-700">{activeShipment.admin?.username || '—'}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-slate-500">QC Officer:</span>{' '}
                      <span className="text-slate-700">{activeShipment.qc?.username || '—'}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-slate-500">Total Rolls:</span>{' '}
                      <span className="font-bold text-blue-600">
                        {activeShipment.shipment_rolls?.length || 0} {(activeShipment.shipment_rolls?.length || 0) === 1 ? 'roll' : 'rolls'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Print Quick Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.open(`/shipments/${activeShipment.id}/print`, '_blank')}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Print Weight List Document"
                  >
                    <Printer size={13} className="text-slate-600" />
                    <span>Weight List</span>
                  </button>
                  <button
                    onClick={() => window.open(`/shipments/${activeShipment.id}/print-qc`, '_blank')}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Print QC Inspection Report"
                  >
                    <Printer size={13} className="text-blue-600" />
                    <span>QC Report</span>
                  </button>
                </div>
              </div>

              {/* Table of Rolls in Shipment */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-white shadow-xs z-10">
                    <tr className="border-b border-slate-200 text-slate-600 bg-slate-50/90 backdrop-blur-xs">
                      <th className="py-2.5 px-4 font-bold">Roll No.</th>
                      <th className="py-2.5 px-4 font-bold">Grade</th>
                      <th className="py-2.5 px-4 font-bold text-center">GSM</th>
                      <th className="py-2.5 px-4 font-bold text-right">Width (mm)</th>
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
                          {sr.roll?.no_roll || `Roll #${sr.roll_no}`}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{sr.roll?.grade || '—'}</td>
                        <td className="py-3 px-4 text-center text-slate-600">{sr.roll?.gsm || '—'}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{sr.roll?.width ? `${sr.roll.width}` : '—'}</td>
                        <td className="py-3 px-4 text-slate-700 text-right font-medium">
                          {sr.roll?.weight ? `${Number(sr.roll.weight).toLocaleString('en-US')} kg` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              sr.qc_status === 'passed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : (sr.qc_status || '').toLowerCase().includes('reject')
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {sr.qc_status || 'pending'}
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
          <div className="card w-full max-w-md p-0 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Roll Details</h3>
                <p className="text-xs text-slate-500">Roll No: <span className="font-semibold text-slate-800">{selectedRoll.no_roll}</span></p>
              </div>
              <button
                onClick={() => setSelectedRoll(null)}
                className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-1.5 rounded-full transition-colors cursor-pointer border border-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Grade</p>
                  <p className="text-sm font-bold text-slate-800">{selectedRoll.grade || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">GSM</p>
                  <p className="text-sm font-bold text-slate-800">{selectedRoll.gsm || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Width (mm)</p>
                  <p className="text-sm font-bold text-slate-800">{selectedRoll.width || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Diameter (mm)</p>
                  <p className="text-sm font-bold text-slate-800">{selectedRoll.diameter || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Weight (kg)</p>
                  <p className="text-sm font-bold text-slate-800">
                    {selectedRoll.weight ? `${Number(selectedRoll.weight).toLocaleString('en-US')} kg` : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Core</p>
                  <p className="text-sm font-bold text-slate-800 capitalize">{selectedRoll.core || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Type / ExMaterial</p>
                  <p className="text-sm font-bold text-slate-800 capitalize">{selectedRoll.type || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Warehouse Location</p>
                  <p className="text-sm font-bold text-slate-800">{selectedRoll.location || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Roll Status</p>
                  <p className="text-sm font-bold text-slate-800">{selectedRoll.status || '—'}</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
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
