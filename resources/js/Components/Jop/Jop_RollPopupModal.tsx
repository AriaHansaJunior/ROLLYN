import React from 'react'
import { X } from 'lucide-react'

interface Jop_RollPopupModalProps {
  selectedRollPopup: any
  selectedJopDetail: any
  onClose: () => void
}

export default function Jop_RollPopupModal({
  selectedRollPopup,
  selectedJopDetail,
  onClose,
}: Jop_RollPopupModalProps) {
  if (!selectedRollPopup) return null

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
              {selectedRollPopup.form ? `F-${selectedRollPopup.form}` : 'R'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  Roll Detail — {selectedRollPopup.no_roll || `R-${selectedRollPopup.no}`}
                </h3>
                {(() => {
                  const st = (selectedRollPopup.status || 'OK').toUpperCase()
                  const isHold = st === 'HOLD'
                  const isBad = st === 'REJECT' || st === 'REJECTED' || st === 'DEFECT' || st === 'CANCEL' || st === 'CANCELED'
                  return (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      isHold ? 'bg-amber-100 text-amber-700' : isBad ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {selectedRollPopup.status || 'OK'}
                    </span>
                  )
                })()}
              </div>
              <p className="text-[11px] text-slate-500">
                Technical specifications & roll inspection without leaving the JOP page
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/40 flex-1 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 1. Roll Information */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider text-blue-700 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                <span>Roll Information</span>
                <span className="text-slate-400 text-[10px] font-normal">ID: {selectedRollPopup.no}</span>
              </div>
              <div className="space-y-1.5 pt-0.5">
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">Roll Number</span><span className="font-bold text-slate-800 font-mono">{selectedRollPopup.no_roll || `R-${selectedRollPopup.no}`}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">Form Number</span><span className="font-semibold text-slate-800">{selectedRollPopup.form ? `F-${selectedRollPopup.form}` : '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">Shift</span><span className="font-semibold text-slate-800">{selectedRollPopup.shift?.shift || '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">Entry Date</span><span className="font-semibold text-slate-800">{selectedRollPopup.entry_date || '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">Operator (PIC)</span><span className="font-semibold text-slate-800">{selectedRollPopup.user?.username || selectedRollPopup.user?.name || 'ADMIN'}</span></div>
                <div className="flex justify-between py-1"><span className="text-slate-500">Allocation Status</span><span className="font-semibold text-slate-800">{selectedRollPopup.locations_id ? 'Slotted' : 'Shipment Plan'}</span></div>
              </div>
            </div>

            {/* 2. Specification */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider text-blue-700 border-b border-slate-100 pb-1.5">
                Technical Specifications
              </div>
              <div className="space-y-1.5 pt-0.5">
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">Grade</span><span className="font-bold text-slate-800">{selectedRollPopup.grade?.grade || selectedJopDetail?.grade || '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">GSM</span><span className="font-bold text-slate-800">{selectedRollPopup.gsm?.gsm || selectedRollPopup.gsm || selectedJopDetail?.gsm || '—'} g/m²</span></div>
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">Plybond (IB)</span><span className="font-semibold text-slate-800">{selectedRollPopup.plybond?.plybonds ?? '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">Thickness</span><span className="font-semibold text-slate-800">{selectedRollPopup.thickness?.thickness ? `${selectedRollPopup.thickness.thickness} mm` : '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">Bulk</span><span className="font-semibold text-slate-800">{selectedRollPopup.bulk ?? '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">Roll Width (RW)</span><span className="font-semibold text-slate-800">{(selectedRollPopup.rolls_width?.width || selectedRollPopup.rollsWidth?.width) ? `${selectedRollPopup.rolls_width?.width || selectedRollPopup.rollsWidth?.width} mm` : '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">Roll Diameter</span><span className="font-semibold text-slate-800">{(selectedRollPopup.rolls_diameter?.diameter || selectedRollPopup.rollsDiameter?.diameter) ? `${selectedRollPopup.rolls_diameter?.diameter || selectedRollPopup.rollsDiameter?.diameter} mm` : '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">Core Size</span><span className="font-semibold text-slate-800">{selectedRollPopup.core?.core ? `${selectedRollPopup.core.core} mm` : '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">Actual Weight</span><span className="font-bold text-blue-700">{selectedRollPopup.weight ? `${selectedRollPopup.weight} kg` : '—'}</span></div>
                <div className="flex justify-between py-1"><span className="text-slate-500">Cobb</span><span className="font-semibold text-slate-800">{selectedRollPopup.cobb?.cobb ?? '—'}</span></div>
              </div>
            </div>

            {/* 3. Inspection & Warehouse */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider text-blue-700 border-b border-slate-100 pb-1.5">
                Inspection & Warehouse
              </div>
              <div className="space-y-1.5 pt-0.5">
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">Ex Material</span><span className="font-semibold text-slate-800">{selectedRollPopup.exmaterial || 'IMPORT'}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">Visual</span><span className="font-semibold text-slate-800">{selectedRollPopup.visual || 'OK'}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">Warehouse Location</span><span className="font-bold text-slate-800">{selectedRollPopup.location?.location || 'Not Assigned'}</span></div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Roll Status</span>
                  {(() => {
                    const st = (selectedRollPopup.status || 'OK').toUpperCase()
                    const isHold = st === 'HOLD'
                    const isBad = st === 'REJECT' || st === 'REJECTED' || st === 'DEFECT' || st === 'CANCEL' || st === 'CANCELED'
                    return (
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                        isHold ? 'bg-amber-100 text-amber-700' : isBad ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {selectedRollPopup.status || 'OK'}
                      </span>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* 4. Order Information */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider text-blue-700 border-b border-slate-100 pb-1.5">
                Order Information
              </div>
              <div className="space-y-1.5 pt-0.5">
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">Job Order Production</span><span className="font-bold text-blue-700 font-mono">{selectedJopDetail?.jop || '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">SPK</span><span className="font-semibold text-slate-800">{selectedJopDetail?.spk || '—'}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-50"><span className="text-slate-500">PO</span><span className="font-semibold text-slate-800">{selectedJopDetail?.po || '—'}</span></div>
                <div className="flex justify-between py-1"><span className="text-slate-500">Customer</span><span className="font-semibold text-slate-800">{selectedJopDetail?.customer || '—'}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-100 bg-white flex justify-end">
          <button
            className="btn btn-secondary text-xs px-4 py-1.5 cursor-pointer"
            onClick={onClose}
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  )
}
