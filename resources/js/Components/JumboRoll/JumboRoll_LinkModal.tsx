import React from 'react'
import { Search, X } from 'lucide-react'
import { IncomingRollItem, JumboRollItem } from './JumboRoll_types'

interface JumboRoll_LinkModalProps {
  isOpen: boolean
  onClose: () => void
  selectedJumbo: JumboRollItem | null
  linkRollSearch: string
  setLinkRollSearch: (val: string) => void
  selectedRollNos: number[]
  toggleRollSelection: (no: number) => void
  loadingAvailable: boolean
  filteredAvailableRolls: IncomingRollItem[]
  linking: boolean
  handleSaveLinkedRolls: () => void
  formatDate: (d: string | null | undefined) => string
  formatWeight: (w: number | null | undefined) => string
}

export default function JumboRoll_LinkModal({
  isOpen,
  onClose,
  selectedJumbo,
  linkRollSearch,
  setLinkRollSearch,
  selectedRollNos,
  toggleRollSelection,
  loadingAvailable,
  filteredAvailableRolls,
  linking,
  handleSaveLinkedRolls,
  formatDate,
  formatWeight,
}: JumboRoll_LinkModalProps) {
  if (!isOpen || !selectedJumbo) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Link Incoming Rolls to {selectedJumbo.jumbo_roll_number}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select unassigned incoming rolls produced from this jumbo roll
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Selector */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by Roll Number, Form, or Grade..."
              value={linkRollSearch}
              onChange={(e) => setLinkRollSearch(e.target.value)}
              className="form-input text-xs pl-8 w-full"
            />
          </div>
          <div className="text-xs text-slate-600 font-semibold shrink-0">
            Selected: <strong>{selectedRollNos.length}</strong>
          </div>
        </div>

        {/* Table */}
        <div className="p-4 overflow-y-auto flex-1">
          {loadingAvailable ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Loading unassigned rolls...
            </div>
          ) : filteredAvailableRolls.length > 0 ? (
            <div className="space-y-1.5">
              {filteredAvailableRolls.map((r) => {
                const isSelected = selectedRollNos.includes(r.no)
                return (
                  <div
                    key={r.no}
                    onClick={() => toggleRollSelection(r.no)}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-900'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-mono font-bold text-slate-900">
                          {r.no_roll}{' '}
                          {r.form ? (
                            <span className="text-[11px] text-slate-500 font-normal">
                              (Form: {r.form})
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {r.grade} {r.gsm ? `${r.gsm}g` : ''} • Shift {r.shift} •{' '}
                          {formatDate(r.entry_date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-800">
                        {formatWeight(r.weight)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {r.location || 'Unallocated'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">
              No available unassigned incoming rolls found.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={linking || selectedRollNos.length === 0}
            onClick={handleSaveLinkedRolls}
            className="btn btn-primary text-xs flex items-center gap-1.5"
          >
            {linking ? (
              <span>Linking...</span>
            ) : (
              <span>Link {selectedRollNos.length} Selected Roll(s)</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
