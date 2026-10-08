import React from 'react'
import { FileText, X, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'
import { ShipmentData } from './RollInventory_types'

interface RollInventory_QcReportModalProps {
  isOpen: boolean
  onClose: () => void
  activeShipment: ShipmentData | null
  aggregatedQcIssues: string[]
  qcReportNotes: Record<string, string>
  setQcReportNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>
  isProcessingScan: boolean
  onSubmit: (e: React.FormEvent) => void
}

export default function RollInventory_QcReportModal({
  isOpen,
  onClose,
  activeShipment,
  aggregatedQcIssues,
  qcReportNotes,
  setQcReportNotes,
  isProcessingScan,
  onSubmit,
}: RollInventory_QcReportModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
              <FileText className="text-blue-600" size={20} />
              QC Inspection Report
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Shipment: <span className="font-bold text-slate-700">{activeShipment?.shipment_number}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {aggregatedQcIssues.length > 0 ? (
              <>
                <div className="bg-amber-50 text-amber-800 text-sm p-4 rounded-xl border border-amber-100 mb-6 flex gap-3">
                  <AlertTriangle className="shrink-0 text-amber-600" size={18} />
                  <p>The following issues were reported during scanning. Please provide a brief note or action taken for each category before submitting the final report.</p>
                </div>

                <div className="space-y-6">
                  {aggregatedQcIssues.map((issue, idx) => (
                    <div key={idx}>
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                        <span className="w-2 h-2 rounded-full bg-red-400"></span>
                        {issue}
                      </label>
                      <textarea 
                        className="w-full border-slate-200 rounded-xl text-sm p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-y min-h-[80px]"
                        placeholder={`Enter remarks for: ${issue}`}
                        value={qcReportNotes[issue] || ''}
                        onChange={e => setQcReportNotes({...qcReportNotes, [issue]: e.target.value})}
                        required
                      ></textarea>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="font-bold text-slate-800 text-lg mb-2">All Clear!</h4>
                <p className="text-slate-500 text-sm">No issues were reported during the QC scanning process for this shipment.</p>
              </div>
            )}
            
            {/* General Notes Field (Optional) */}
            <div className="mt-6 border-t border-slate-100 pt-6">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <FileText size={16} className="text-slate-400" />
                Notes (Optional)
              </label>
              <textarea 
                className="w-full border-slate-200 rounded-xl text-sm p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-y min-h-[80px]"
                placeholder="Enter any additional notes here..."
                value={qcReportNotes['General Note'] || ''}
                onChange={e => setQcReportNotes({...qcReportNotes, ['General Note']: e.target.value})}
              ></textarea>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessingScan || (aggregatedQcIssues.length > 0 && aggregatedQcIssues.some(issue => !qcReportNotes[issue]?.trim()))}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isProcessingScan ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report & Complete Shipment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
