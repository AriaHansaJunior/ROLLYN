import React from 'react'
import { CheckCircle2, XCircle, X, Search, ChevronDown } from 'lucide-react'
import { QC_CHECKLIST } from './RollInventory_types'

interface RollInventory_QcRollEvaluatorModalProps {
  activeQcRoll: any
  onClose: () => void
  qcEvaluationMode: 'decision' | 'checklist'
  setQcEvaluationMode: (mode: 'decision' | 'checklist') => void
  qcIssueSearch: string
  setQcIssueSearch: (search: string) => void
  expandedQcCategories: string[]
  setExpandedQcCategories: React.Dispatch<React.SetStateAction<string[]>>
  selectedQcIssues: string[]
  setSelectedQcIssues: React.Dispatch<React.SetStateAction<string[]>>
  onSubmitQcScan: (issues: string[]) => void
}

export default function RollInventory_QcRollEvaluatorModal({
  activeQcRoll,
  onClose,
  qcEvaluationMode,
  setQcEvaluationMode,
  qcIssueSearch,
  setQcIssueSearch,
  expandedQcCategories,
  setExpandedQcCategories,
  selectedQcIssues,
  setSelectedQcIssues,
  onSubmitQcScan,
}: RollInventory_QcRollEvaluatorModalProps) {
  if (!activeQcRoll) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center shrink-0">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <CheckCircle2 size={20} />
            Roll Quality Control
          </h3>
          <div className="flex items-center gap-3">
            <div className="text-sm bg-blue-700/50 px-3 py-1 rounded-lg font-mono font-bold tracking-wider">
              {activeQcRoll.no_roll}
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto custom-scrollbar flex-1 p-6">
          {qcEvaluationMode === 'decision' ? (
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">Specification</h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-500 text-sm">Grade</span>
                    <span className="font-bold text-slate-800">{activeQcRoll.grade}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-500 text-sm">GSM</span>
                    <span className="font-bold text-slate-800">{activeQcRoll.gsm} g/m²</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-500 text-sm">Plybond</span>
                    <span className="font-bold text-slate-800">{activeQcRoll.plybond}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-500 text-sm">Thickness</span>
                    <span className="font-bold text-slate-800">{activeQcRoll.thickness} µm</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-500 text-sm">Bulk</span>
                    <span className="font-bold text-slate-800">{activeQcRoll.bulk}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-500 text-sm">Roll Width</span>
                    <span className="font-bold text-slate-800">{activeQcRoll.roll_width} mm</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-500 text-sm">Roll Diameter</span>
                    <span className="font-bold text-slate-800">{activeQcRoll.roll_diameter} mm</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-500 text-sm">Core</span>
                    <span className="font-bold text-slate-800">{activeQcRoll.core} inch</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-500 text-sm">Weight</span>
                    <span className="font-bold text-slate-800">{activeQcRoll.weight} kg</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-500 text-sm">Cobb</span>
                    <span className="font-bold text-slate-800">{activeQcRoll.cobb}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4 border-t border-slate-100 mt-2">
                <button
                  onClick={() => onSubmitQcScan([])}
                  className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={20} />
                  OK
                </button>
                <button
                  onClick={() => setQcEvaluationMode('checklist')}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <XCircle size={20} />
                  NOT OK
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Select issues found</h4>
                <button 
                  onClick={() => setQcEvaluationMode('decision')}
                  className="text-blue-600 hover:underline text-sm font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronDown className="rotate-90" size={16} />
                  Back to Specs
                </button>
              </div>
              
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search issues..."
                  value={qcIssueSearch}
                  onChange={(e) => setQcIssueSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-slate-50 transition-all"
                />
              </div>

              <div className="space-y-3">
                {QC_CHECKLIST.map((category, idx) => {
                  const filteredItems = category.items.filter(item => 
                    item.toLowerCase().includes(qcIssueSearch.toLowerCase())
                  )
                  if (filteredItems.length === 0 && qcIssueSearch) return null
                  
                  const isExpanded = expandedQcCategories.includes(category.category) || qcIssueSearch !== ''
                  
                  return (
                    <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <button 
                        type="button"
                        className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
                        onClick={() => {
                          if (isExpanded) {
                            setExpandedQcCategories([])
                          } else {
                            setExpandedQcCategories([category.category])
                          }
                        }}
                      >
                        <span className="font-bold text-slate-800 text-sm">{category.category}</span>
                        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                          <ChevronDown size={16} className="text-slate-400" />
                        </div>
                      </button>
                      
                      <div 
                        className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                      >
                        <div className="overflow-hidden">
                          <div className="p-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filteredItems.map((item, iIdx) => (
                              <label key={iIdx} className="flex items-start gap-3 cursor-pointer group p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                <input 
                                  type="checkbox" 
                                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  checked={selectedQcIssues.includes(item)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedQcIssues([...selectedQcIssues, item])
                                    } else {
                                      setSelectedQcIssues(selectedQcIssues.filter(i => i !== item))
                                    }
                                  }}
                                />
                                <span className="text-sm text-slate-600 group-hover:text-slate-900 leading-tight">
                                  {item}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              <div className="pt-4 flex gap-3 border-t border-slate-100 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancel Scan
                </button>
                <button
                  onClick={() => onSubmitQcScan(selectedQcIssues)}
                  disabled={selectedQcIssues.length === 0}
                  className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  Submit Issues & Pass Roll
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
