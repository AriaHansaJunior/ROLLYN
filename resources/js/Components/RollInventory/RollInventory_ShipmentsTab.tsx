import React from 'react'
import {
  Truck, Clock, CheckCircle2, UserCheck, Search, X, Building2,
  Calendar, Printer, Ban, AlertTriangle, FileText, Camera,
  QrCode, XCircle, Scale, RotateCcw, Trash2, Package
} from 'lucide-react'
import EmbeddedQRScanner from '@/Components/EmbeddedQRScanner'
import { ShipmentData, ShipmentRollItem } from './RollInventory_types'

interface RollInventory_ShipmentsTabProps {
  totalShipmentsCount: number
  totalShipmentRolls: number
  pendingShipmentsCount: number
  completedShipmentsCount: number
  totalCheckedRolls: number
  isQC: boolean
  isPpicOrAdmin: boolean
  filteredShipments: ShipmentData[]
  shipmentSearch: string
  setShipmentSearch: (val: string) => void
  shipmentFilter: string
  setShipmentFilter: (val: string) => void
  activeShipmentId: number | null
  setActiveShipmentId: (id: number | null) => void
  activeShipment: ShipmentData | null | undefined
  handleCancelShipment: (shipment: ShipmentData) => void
  setShowQcReportModal: (show: boolean) => void
  handleQCScan: (code: string) => void
  manualScanInput: string
  setManualScanInput: (val: string) => void
  isProcessingScan: boolean
  handleManualScanSubmit: (e: React.FormEvent) => void
  handleManualPassRoll: (r: ShipmentRollItem) => void
  openRejectModal: (r: ShipmentRollItem) => void
  openPpicDispositionModal: (r: ShipmentRollItem) => void
  handleCancelRollFromShipment: (r: ShipmentRollItem) => void
}

export default function RollInventory_ShipmentsTab({
  totalShipmentsCount,
  totalShipmentRolls,
  pendingShipmentsCount,
  completedShipmentsCount,
  totalCheckedRolls,
  isQC,
  isPpicOrAdmin,
  filteredShipments,
  shipmentSearch,
  setShipmentSearch,
  shipmentFilter,
  setShipmentFilter,
  activeShipmentId,
  setActiveShipmentId,
  activeShipment,
  handleCancelShipment,
  setShowQcReportModal,
  handleQCScan,
  manualScanInput,
  setManualScanInput,
  isProcessingScan,
  handleManualScanSubmit,
  handleManualPassRoll,
  openRejectModal,
  openPpicDispositionModal,
  handleCancelRollFromShipment,
}: RollInventory_ShipmentsTabProps) {
  return (
    <div className="space-y-4">
      {/* Metrics summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3.5 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Shipments</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md"><Truck size={15} /></div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{totalShipmentsCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{totalShipmentRolls} rolls in total</div>
        </div>

        <div className="card p-3.5 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending QC</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md"><Clock size={15} /></div>
          </div>
          <div className="text-xl font-extrabold text-amber-600 mt-1">{pendingShipmentsCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Awaiting complete verification</div>
        </div>

        <div className="card p-3.5 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Completed</span>
            <div className="p-1.5 bg-green-50 text-green-600 rounded-md"><CheckCircle2 size={15} /></div>
          </div>
          <div className="text-xl font-extrabold text-green-600 mt-1">{completedShipmentsCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Ready for final dispatch</div>
        </div>

        <div className="card p-3.5 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">QC Verified</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md"><UserCheck size={15} /></div>
          </div>
          <div className="text-xl font-extrabold text-indigo-600 mt-1">
            {totalCheckedRolls} <span className="text-xs font-normal text-slate-400">/ {totalShipmentRolls}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {totalShipmentRolls > 0 ? `${Math.round((totalCheckedRolls / totalShipmentRolls) * 100)}% verified` : '0%'}
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Shipments Sidebar & Inspection View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Shipment List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="card p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Truck size={15} className="text-blue-600" />
                {isQC ? 'My Assigned Shipments' : 'All Shipments'}
              </h3>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {filteredShipments.length}
              </span>
            </div>

            {/* Search & Filter pills */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  value={shipmentSearch}
                  onChange={e => setShipmentSearch(e.target.value)}
                  placeholder="Search SHP, customer, QC..."
                  className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400"
                />
                {shipmentSearch && (
                  <button onClick={() => setShipmentSearch('')} className="text-slate-400 hover:text-slate-600">
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg text-[11px]">
                <button
                  className={`flex-1 py-1 text-center font-bold rounded-md transition-all cursor-pointer ${shipmentFilter === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  onClick={() => setShipmentFilter('all')}
                >
                  All
                </button>
                <button
                  className={`flex-1 py-1 text-center font-bold rounded-md transition-all cursor-pointer ${shipmentFilter === 'pending' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  onClick={() => setShipmentFilter('pending')}
                >
                  Pending
                </button>
                <button
                  className={`flex-1 py-1 text-center font-bold rounded-md transition-all cursor-pointer ${shipmentFilter === 'completed' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  onClick={() => setShipmentFilter('completed')}
                >
                  Completed
                </button>
                {!isQC && (
                  <button
                    className={`flex-1 py-1 text-center font-bold rounded-md transition-all cursor-pointer ${shipmentFilter === 'canceled' ? 'bg-white text-red-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    onClick={() => setShipmentFilter('canceled')}
                  >
                    Canceled
                  </button>
                )}
              </div>
            </div>

            {/* Shipment Cards List */}
            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {filteredShipments.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-1">
                  <Truck size={28} className="mx-auto opacity-30" />
                  <p className="text-xs font-semibold">No shipments found</p>
                  <p className="text-[10px] text-slate-400">
                    {isQC ? 'No shipments currently assigned to your account.' : 'Create a shipment from the Storage tab.'}
                  </p>
                </div>
              ) : (
                filteredShipments.map(s => {
                  const isActive = activeShipmentId === s.id
                  const isComplete = s.status === 'completed'
                  const isCanceled = s.status === 'canceled'
                  const progressPct = s.total_rolls > 0 ? Math.round((s.checked_rolls / s.total_rolls) * 100) : 0

                  return (
                    <div
                      key={s.id}
                      onClick={() => setActiveShipmentId(s.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${isActive
                          ? 'bg-blue-50/80 border-blue-400 shadow-sm ring-1 ring-blue-300'
                          : isCanceled
                            ? 'bg-slate-50/60 border-slate-200 opacity-75'
                            : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="text-xs font-bold text-slate-900 font-mono flex items-center gap-1">
                          {s.shipment_number}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isCanceled
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : isComplete
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                          {isCanceled ? 'Canceled' : isComplete ? 'Completed' : 'QC Pending'}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-slate-800 flex items-center gap-1 mb-1">
                        <Building2 size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{s.customer}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} className="text-slate-400" />
                          {s.date}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <UserCheck size={11} className="text-blue-500" />
                          {s.qc_officer}
                        </span>
                      </div>

                      {/* Progress bar */}
                      {!isCanceled && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-500">QC Progress</span>
                            <span className="font-bold text-slate-700">
                              {s.checked_rolls} / {s.total_rolls} Rolls ({progressPct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${isComplete ? 'bg-green-500' : 'bg-blue-600'}`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Shipment QC Station (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {activeShipment ? (
            <>
              {/* Shipment Header Banner */}
              <div className="card p-4 bg-white border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-slate-900 font-mono">
                        {activeShipment.shipment_number}
                      </h3>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${activeShipment.status === 'canceled'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : activeShipment.status === 'completed'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                        {activeShipment.status === 'canceled'
                          ? '✕ Canceled'
                          : activeShipment.status === 'completed'
                            ? '✓ Completed'
                            : 'QC In Progress'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Created by <strong>{activeShipment.admin}</strong> • Target Date: <strong>{activeShipment.date}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Customer</div>
                      <div className="text-xs font-bold text-slate-900">{activeShipment.customer}</div>
                    </div>
                    <div className="h-7 w-px bg-slate-200" />
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">QC Officer</div>
                      <div className="text-xs font-bold text-blue-700">{activeShipment.qc_officer}</div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pl-2 border-l border-slate-200 flex gap-2">
                      <button
                        onClick={() => window.open(`/shipments/${activeShipment.id}/print`, '_blank')}
                        className="btn btn-sm bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                        title="Print Weight List"
                      >
                        <Printer size={13} />
                        Print Weight List
                      </button>
                      <button
                        onClick={() => window.open(`/shipments/${activeShipment.id}/print-qc`, '_blank')}
                        className="btn btn-sm bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                        title="Print QC Report"
                      >
                        <Printer size={13} />
                        Print QC Report
                      </button>
                      
                      {/* Admin/PPIC Cancel Shipment Button */}
                      {!isQC && activeShipment.status !== 'canceled' && activeShipment.status !== 'completed' && (
                        <button
                          onClick={() => handleCancelShipment(activeShipment)}
                          className="btn btn-sm bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                          title="Cancel entire shipment order"
                        >
                          <Ban size={13} />
                          Cancel Shipment
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cancel notice if shipment is canceled */}
                {activeShipment.status === 'canceled' && (
                  <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-600 shrink-0" />
                    <span>
                      <strong>This shipment order was canceled.</strong> All rolls have been unlinked and returned to available inventory.
                    </span>
                  </div>
                )}

                {/* Progress summary stats */}
                {activeShipment.status !== 'canceled' && (
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-semibold">Total Rolls</div>
                      <div className="text-sm font-extrabold text-slate-800">{activeShipment.total_rolls}</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                      <div className="text-[10px] text-green-700 font-semibold">Passed</div>
                      <div className="text-sm font-extrabold text-green-700">{activeShipment.passed_rolls}</div>
                    </div>
                    <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                      <div className="text-[10px] text-red-700 font-semibold">Replaced / Rejected</div>
                      <div className="text-sm font-extrabold text-red-700">{activeShipment.rejected_rolls}</div>
                    </div>
                  </div>
                )}
                
                {/* QC Report Trigger */}
                {isQC && activeShipment.status === 'qc_in_progress' && activeShipment.total_rolls === activeShipment.checked_rolls && activeShipment.total_rolls > 0 && (
                  <div className="pt-2 border-t border-slate-100 mt-3">
                    <button
                      onClick={() => setShowQcReportModal(true)}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      <FileText size={18} />
                      Buat Laporan QC
                    </button>
                  </div>
                )}
              </div>

              {/* QR Scanner Station */}
              {isQC && activeShipment.status !== 'completed' && activeShipment.status !== 'canceled' && (
                <>
                  <div className="card p-0 overflow-hidden border border-blue-200 shadow-xs">
                    <div className="bg-blue-600 px-4 py-2.5 text-white flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <Camera size={15} />
                        Live QC Barcode Scanner
                      </span>
                      <span className="text-[11px] text-blue-100">
                        Scan barcode to verify quality
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900">
                      <EmbeddedQRScanner onScanSuccess={handleQCScan} />
                    </div>

                    {/* Manual Barcode Input Fallback */}
                    <form onSubmit={handleManualScanSubmit} className="p-3 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
                      <QrCode size={16} className="text-slate-400 shrink-0" />
                      <input
                        value={manualScanInput}
                        onChange={e => setManualScanInput(e.target.value)}
                        placeholder="Or type roll barcode (e.g. 260731-11.04.04) and press Enter..."
                        disabled={isProcessingScan}
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={!manualScanInput.trim() || isProcessingScan}
                        className="btn btn-primary text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        Verify Roll
                      </button>
                    </form>
                  </div>
                </>
              )}

              {/* Rolls Table for Active Shipment */}
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Rolls in Shipment ({activeShipment.rolls.length})
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    {activeShipment.checked_rolls} of {activeShipment.total_rolls} checked
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold">
                        <th className="pb-2 pl-1">Roll Number</th>
                        <th className="pb-2">Grade & GSM</th>
                        <th className="pb-2">Weight</th>
                        <th className="pb-2">Location</th>
                        <th className="pb-2">QC Status</th>
                        <th className="pb-2 text-right pr-1">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeShipment.rolls.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-slate-400">
                            No rolls assigned to this shipment.
                          </td>
                        </tr>
                      ) : activeShipment.rolls.map((r, idx) => {
                        const isPassed = r.qc_status === 'passed'
                        const isReplace = r.qc_status === 'rejected_replace'
                        const isPending = r.qc_status === 'pending'
                        const isShipmentCanceled = activeShipment.status === 'canceled'

                        return (
                          <tr key={r.id || idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 pl-1 font-bold text-slate-900 font-mono">
                              {r.no_roll}
                            </td>
                            <td className="py-3 text-slate-700">
                              <span className="font-semibold text-slate-900">{r.grade}</span>
                              <span className="text-[11px] text-slate-500 block">{r.gsm} GSM</span>
                            </td>
                            <td className="py-3 text-slate-700 font-medium">
                              {r.weight ? r.weight.toLocaleString('en-US') : 0} kg
                            </td>
                            <td className="py-3">
                              <span className="inline-block font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono">
                                {r.location || '—'}
                              </span>
                            </td>
                            <td className="py-3">
                              {isPassed ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-bold text-[10px] border border-green-200">
                                    <CheckCircle2 size={12} /> Passed
                                  </span>
                                  {r.qc_notes && (
                                    <div className="text-[10px] text-slate-500 italic truncate max-w-[150px]" title={r.qc_notes}>
                                      {r.qc_notes}
                                    </div>
                                  )}
                                  {r.qc_checked_at && (
                                    <div className="text-[9px] text-slate-400">{r.qc_checked_at}</div>
                                  )}
                                </div>
                              ) : isReplace ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full font-bold text-[10px] border border-red-200">
                                    <XCircle size={12} /> Replace Requested
                                  </span>
                                  {r.reproduction_status && r.reproduction_status !== 'none' && (
                                    <span
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                        r.reproduction_status === 'shipped'
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                          : r.reproduction_status === 'reject'
                                          ? 'bg-red-50 text-red-700 border border-red-300'
                                          : r.reproduction_status === 'reweigh'
                                          ? 'bg-amber-50 text-amber-700 border border-amber-300'
                                          : 'bg-purple-50 text-purple-700 border border-purple-300'
                                      }`}
                                    >
                                      {r.reproduction_status === 'shipped' && <Truck size={10} />}
                                      {r.reproduction_status === 'reject' && <XCircle size={10} />}
                                      {r.reproduction_status === 'reweigh' && <Scale size={10} />}
                                      {r.reproduction_status === 'reproduce_again' && <RotateCcw size={10} />}
                                      PPIC: {r.reproduction_status === 'shipped'
                                        ? 'Shipped'
                                        : r.reproduction_status === 'reject'
                                        ? 'Reject'
                                        : r.reproduction_status === 'reweigh'
                                        ? 'Reweigh'
                                        : 'Reproduce Again'}
                                    </span>
                                  )}
                                  {r.qc_notes && (
                                    <div className="text-[10px] text-red-600 truncate max-w-[150px]" title={r.qc_notes}>
                                      {r.qc_notes}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold text-[10px] border border-amber-200">
                                  <Clock size={12} /> Pending Scan
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-right pr-1">
                              {isQC && isPending && !isShipmentCanceled ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleManualPassRoll(r)}
                                    disabled={isProcessingScan}
                                    className="btn btn-sm bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] px-2.5 py-1 rounded cursor-pointer transition-colors"
                                    title="Mark roll as passed"
                                  >
                                    Pass
                                  </button>
                                  <button
                                    onClick={() => openRejectModal(r)}
                                    disabled={isProcessingScan}
                                    className="btn btn-sm bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[10px] px-2.5 py-1 rounded cursor-pointer transition-colors"
                                    title="Report defect or roll issue"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : !isShipmentCanceled && isPpicOrAdmin && (isReplace || (r.reproduction_status && r.reproduction_status !== 'none')) ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => openPpicDispositionModal(r)}
                                    className="btn btn-sm bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[10px] px-2.5 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 ml-auto"
                                    title="Manage Re-produced Roll Disposition (PPIC)"
                                  >
                                    <RotateCcw size={11} />
                                    PPIC Disposition
                                  </button>
                                  <button
                                    onClick={() => handleCancelRollFromShipment(r)}
                                    className="p-1 rounded text-red-400 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                                    title="Remove roll from this shipment"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ) : !isQC && !isShipmentCanceled && isPending ? (
                                <button
                                  onClick={() => handleCancelRollFromShipment(r)}
                                  className="btn btn-sm bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[10px] px-2.5 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 ml-auto"
                                  title="Remove roll from this shipment"
                                >
                                  <Trash2 size={11} />
                                  Remove
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="card p-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-200">
              <Package size={40} className="mx-auto opacity-30 text-slate-400" />
              <h4 className="text-sm font-bold text-slate-600">No Shipment Selected</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Select a shipment from the list on the left to inspect rolls or manage the order.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
