import React from 'react'
import { X, Printer, Eye } from 'lucide-react'

interface Jop_DetailModalProps {
  selectedJopDetail: any
  onClose: () => void
  selectedRWFilter: string
  setSelectedRWFilter: (rw: string) => void
  uniqueRWs: any[]
  filteredRolls: any[]
  onSelectRoll: (roll: any) => void
  onPrint: (jop: any) => void
}

export default function Jop_DetailModal({
  selectedJopDetail,
  onClose,
  selectedRWFilter,
  setSelectedRWFilter,
  uniqueRWs,
  filteredRolls,
  onSelectRoll,
  onPrint,
}: Jop_DetailModalProps) {
  if (!selectedJopDetail) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Production Results: {selectedJopDetail.jop}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Target: {selectedJopDetail.target} | Realized: {selectedJopDetail.rolls} | Remaining: {selectedJopDetail.sisa}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {selectedJopDetail.noted_order && (
          <div className="px-4 py-2 bg-amber-50/90 border-b border-amber-200/80 flex items-start gap-2 text-xs text-amber-900">
            <span className="font-bold shrink-0">Notes / Remarks:</span>
            <span className="font-medium">{selectedJopDetail.noted_order}</span>
          </div>
        )}

        {/* Target Specifications from PPIC */}
        <div className="px-4 py-2 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-blue-900">
          <span className="font-bold uppercase tracking-wider text-[10px] text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
            Target Specs (PPIC)
          </span>
          <span><strong>Grade:</strong> {selectedJopDetail.grade}</span>
          <span><strong>GSM:</strong> {selectedJopDetail.gsm} g/m²</span>
          <span><strong>Plybond:</strong> {selectedJopDetail.plybond}</span>
          <span><strong>Thickness:</strong> {selectedJopDetail.thickness}</span>
          <span><strong>Core:</strong> {selectedJopDetail.core}&quot;</span>
        </div>

        <div className="p-4 bg-white border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3 text-[11px]">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="block text-slate-500 mb-1">Target Tonnage</span>
            <strong className="text-slate-900 text-xs">{selectedJopDetail.est?.target_tonnage ?? "-"} Ton</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="block text-slate-500 mb-1">Actual Tonnage</span>
            <strong className="text-slate-900 text-xs">{selectedJopDetail.est?.actual_tonnage ?? "-"} Ton</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="block text-slate-500 mb-1">Remaining Ton</span>
            <strong className="text-amber-700 text-xs">{selectedJopDetail.est?.remaining_tonnage ?? "-"} Ton</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100">
            <span className="block text-blue-600 font-semibold mb-1">Select RW</span>
            <select
              value={selectedRWFilter}
              onChange={(e) => setSelectedRWFilter(e.target.value)}
              className="form-input text-xs w-full py-1 px-2 bg-white"
            >
              <option value="">-- Select RW --</option>
              {uniqueRWs.map((rw: any) => (
                <option key={rw} value={rw}>{rw} mm</option>
              ))}
            </select>
          </div>

          {selectedRWFilter ? (() => {
            const selectedRWTarget = selectedJopDetail?.rwTargets?.find((tgt: any) => String(tgt.rolls_width?.width || tgt.rollsWidth?.width) === selectedRWFilter)?.qty || 0;
            const realizedRollsForRW = filteredRolls.length;
            const remainingRollsForRW = Math.max(0, selectedRWTarget - realizedRollsForRW);
            
            return (
              <>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-slate-500 mb-1">Target Roll</span>
                  <strong className="text-slate-900 text-xs">{selectedRWTarget} Rolls</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-slate-500 mb-1">Realized Roll</span>
                  <strong className="text-slate-900 text-xs">{realizedRollsForRW} Rolls</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-slate-500 mb-1">Remaining Roll</span>
                  <strong className="text-amber-700 font-bold text-xs">{remainingRollsForRW} Rolls</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-slate-500 mb-1">Est. Duration</span>
                  <strong className="text-slate-900 text-xs">{selectedJopDetail.est?.estimated_duration_formatted ?? "N/A"}</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-slate-500 mb-1">Est. Finish</span>
                  <strong className="text-slate-900 font-mono text-[10px]">{selectedJopDetail.est?.estimated_finish_time ?? "N/A"}</strong>
                </div>
              </>
            );
          })() : (
            <>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 opacity-50">
                <span className="block text-slate-500 mb-1">Target Roll</span>
                <strong className="text-slate-900 text-xs">N/A</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 opacity-50">
                <span className="block text-slate-500 mb-1">Realized Roll</span>
                <strong className="text-slate-900 text-xs">N/A</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 opacity-50">
                <span className="block text-slate-500 mb-1">Remaining Roll</span>
                <strong className="text-amber-700 font-mono text-[10px]">N/A</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 opacity-50">
                <span className="block text-slate-500 mb-1">Est. Duration</span>
                <strong className="text-slate-900 text-xs">N/A</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 opacity-50">
                <span className="block text-slate-500 mb-1">Est. Finish</span>
                <strong className="text-slate-900 font-mono text-[10px]">N/A</strong>
              </div>
            </>
          )}
        </div>

        <div className="p-4 overflow-y-auto bg-slate-50 flex-1">
          <div className="card overflow-x-auto bg-white border border-slate-200">
            <table className="data-table w-full text-xs">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>No</th>
                  <th style={{ textAlign: 'left' }}>Roll Number</th>
                  <th style={{ textAlign: 'center' }}>Entry Date</th>
                  <th style={{ textAlign: 'center' }}>Shift</th>
                  <th style={{ textAlign: 'center' }}>Actual Grade</th>
                  <th style={{ textAlign: 'center' }}>Actual GSM</th>
                  <th style={{ textAlign: 'center' }}>Weight (kg)</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {!selectedRWFilter ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-500">
                      Please select an RW to view the rolls.
                    </td>
                  </tr>
                ) : filteredRolls.length > 0 ? (
                  filteredRolls.map((roll: any, index: number) => (
                    <tr key={roll.no || index} className="hover:bg-slate-50">
                      <td style={{ textAlign: 'center' }} className="text-slate-500">{index + 1}</td>
                      <td className="font-bold text-blue-700 font-mono" style={{ textAlign: 'left' }}>
                        <button
                          onClick={() => onSelectRoll(roll)}
                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer font-bold font-mono"
                          title="Click to view full roll details"
                        >
                          <span>{roll.no_roll || `R-${roll.no}`}</span>
                          <Eye size={12} className="opacity-60" />
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }} className="text-slate-600">{roll.entry_date || '-'}</td>
                      <td style={{ textAlign: 'center' }}>{roll.shift?.shift || '-'}</td>
                      <td style={{ textAlign: 'center' }} className="font-medium text-slate-800">{roll.grade?.grade || '-'}</td>
                      <td style={{ textAlign: 'center' }}>{roll.gsm?.gsm || roll.gsm || '-'}</td>
                      <td style={{ textAlign: 'center' }} className="font-medium">{roll.weight}</td>
                      <td style={{ textAlign: 'center' }}>
                        {(() => {
                          const st = (roll.status || 'OK').toUpperCase();
                          const isHold = st === 'HOLD';
                          const isBad = st === 'REJECT' || st === 'REJECTED' || st === 'DEFECT' || st === 'CANCEL' || st === 'CANCELED';
                          return (
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                              isHold
                                ? 'bg-amber-100 text-amber-700'
                                : isBad
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {roll.status || 'OK'}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => onSelectRoll(roll)}
                          className="btn btn-secondary btn-sm py-1 px-2.5 text-[11px] flex items-center gap-1 mx-auto cursor-pointer"
                          title="View Roll Details"
                        >
                          <Eye size={12} />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-500">
                      No rolls found for this RW.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-3 border-t border-slate-100 bg-white flex items-center justify-between">
          <button
            className="btn btn-primary text-xs px-4 py-1.5 cursor-pointer flex items-center gap-1.5"
            onClick={() => onPrint(selectedJopDetail)}
          >
            <Printer size={13} />
            <span>Print Handover Letter</span>
          </button>
          <button className="btn btn-secondary text-xs px-4 py-1.5 cursor-pointer" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
