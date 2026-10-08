import React from 'react'
import {
  Disc, X, FileText, TruckIcon, Link2, Plus, ArrowUpRight, Unlink, Package, Edit3
} from 'lucide-react'
import { Link } from '@inertiajs/react'
import { JumboRollItem } from './JumboRoll_types'

interface JumboRoll_DetailModalProps {
  isOpen: boolean
  onClose: () => void
  selectedJumbo: JumboRollItem | null
  canManage: boolean
  formatWeight: (w: number | null | undefined) => string
  formatTonnage: (w: number | null | undefined) => string
  formatDate: (d: string | null | undefined) => string
  handleOpenLinkModal: () => void
  handleOpenEdit: (item: JumboRollItem) => void
  handleRemoveRoll: (rollNo: number, rollName: string) => void
}

export default function JumboRoll_DetailModal({
  isOpen,
  onClose,
  selectedJumbo,
  canManage,
  formatWeight,
  formatTonnage,
  formatDate,
  handleOpenLinkModal,
  handleOpenEdit,
  handleRemoveRoll,
}: JumboRoll_DetailModalProps) {
  if (!isOpen || !selectedJumbo) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Detail Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0 font-extrabold text-sm">
              <Disc size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Jumbo Roll: {selectedJumbo.jumbo_roll_number}
                </h3>
                <span
                  className={`badge text-[11px] ${
                    selectedJumbo.status === 'COMPLETED'
                      ? 'badge-success'
                      : selectedJumbo.status === 'HOLD'
                      ? 'badge-warning'
                      : 'badge-info'
                  }`}
                >
                  {selectedJumbo.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Registered on {formatDate(selectedJumbo.production_date)} • Operator:{' '}
                {selectedJumbo.user}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-md"
          >
            <X size={20} />
          </button>
        </div>

        {/* Detail Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Key Metrics / Yield Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Jumbo Weight
              </div>
              <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                {formatWeight(selectedJumbo.weight)}
              </div>
              <div className="text-[11px] text-slate-500">
                {formatTonnage(selectedJumbo.weight)}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Cut Weight
              </div>
              <div className="text-lg font-extrabold text-blue-700 mt-0.5">
                {formatWeight(selectedJumbo.total_cut_weight)}
              </div>
              <div className="text-[11px] text-blue-600 font-semibold">
                {selectedJumbo.rolls_count} Incoming Rolls
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Cutting Yield
              </div>
              <div className="text-lg font-extrabold text-emerald-600 mt-0.5">
                {selectedJumbo.yield_percentage}%
              </div>
              <div className="text-[11px] text-slate-500">
                Efficiency rate
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Trim / Balance
              </div>
              <div className="text-lg font-extrabold text-amber-700 mt-0.5">
                {formatWeight(selectedJumbo.remaining_weight)}
              </div>
              <div className="text-[11px] text-slate-500">
                Remaining uncut
              </div>
            </div>
          </div>

          {/* Associated JOP Specifications */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText size={14} className="text-slate-400" />
              <span>Associated JOP & Specifications</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-white rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  JOP Code
                </span>
                <span className="font-bold text-slate-900">{selectedJumbo.jop.jop}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  SPK & PO
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {selectedJumbo.jop.spk} / {selectedJumbo.jop.po}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Customer
                </span>
                <span className="font-bold text-slate-800">
                  {selectedJumbo.jop.customer}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Paper Grade & GSM
                </span>
                <span className="font-bold text-slate-800">
                  {selectedJumbo.jop.grade}{' '}
                  {selectedJumbo.jop.gsm ? `(${selectedJumbo.jop.gsm} GSM)` : ''}
                </span>
              </div>
              {selectedJumbo.notes && (
                <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-100 text-slate-600">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Notes
                  </span>
                  <p className="mt-0.5">{selectedJumbo.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Associated Rewinder / Incoming Rolls Table */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <TruckIcon size={14} className="text-blue-500" />
                  <span>Rewinder / Associated Incoming Rolls</span>
                </h4>
                <span className="badge badge-info text-[10px]">
                  {selectedJumbo.rolls?.length || 0} Rolls
                </span>
              </div>

              {canManage && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleOpenLinkModal}
                    className="btn btn-secondary btn-sm py-1 px-2.5 text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Link existing unassigned incoming rolls to this Jumbo Roll"
                  >
                    <Link2 size={13} />
                    <span>Link Incoming Rolls</span>
                  </button>
                  <Link
                    href={`/incoming-roll?jumbo=${encodeURIComponent(
                      selectedJumbo.jumbo_roll_number
                    )}`}
                    className="btn btn-primary btn-sm py-1 px-2.5 text-[11px] flex items-center gap-1"
                    title="Create a new incoming roll cut from this Jumbo Roll"
                  >
                    <Plus size={13} />
                    <span>Cut New Roll</span>
                  </Link>
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="data-table w-full text-xs">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Roll Number</th>
                    <th style={{ textAlign: 'center' }}>Form</th>
                    <th style={{ textAlign: 'center' }}>Weight</th>
                    <th style={{ textAlign: 'center' }}>Grade / GSM</th>
                    <th style={{ textAlign: 'center' }}>Shift</th>
                    <th style={{ textAlign: 'center' }}>Location</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Entry Date</th>
                    {canManage && (
                      <th style={{ textAlign: 'center', width: '90px' }}>
                        Action
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {selectedJumbo.rolls && selectedJumbo.rolls.length > 0 ? (
                    selectedJumbo.rolls.map((roll) => (
                      <tr key={roll.no} className="hover:bg-slate-50/80">
                        <td className="font-mono font-bold text-blue-900">
                          <Link
                            href={`/roll-detail/${roll.no}`}
                            className="hover:underline flex items-center gap-1"
                            title="View Roll Inventory Detail"
                          >
                            <span>{roll.no_roll}</span>
                            <ArrowUpRight size={11} className="text-slate-400" />
                          </Link>
                        </td>
                        <td className="text-center font-mono text-slate-600">
                          {roll.form ? `F-${roll.form}` : '—'}
                        </td>
                        <td className="text-center font-mono font-bold text-slate-800">
                          {formatWeight(roll.weight)}
                        </td>
                        <td className="text-center text-slate-700">
                          {roll.grade} {roll.gsm ? `${roll.gsm}g` : ''}
                        </td>
                        <td className="text-center font-medium">
                          Shift {roll.shift}
                        </td>
                        <td className="text-center font-semibold text-slate-600">
                          {roll.location || 'Unallocated'}
                        </td>
                        <td className="text-center">
                          <span
                            className={`badge text-[10px] ${
                              roll.status === 'OK'
                                ? 'badge-success'
                                : 'badge-warning'
                            }`}
                          >
                            {roll.status}
                          </span>
                        </td>
                        <td className="text-center text-slate-500">
                          {formatDate(roll.entry_date)}
                        </td>
                        {canManage && (
                          <td className="text-center">
                            <button
                              onClick={() =>
                                handleRemoveRoll(roll.no, roll.no_roll)
                              }
                              className="btn btn-sm py-0.5 px-2 text-[10px] text-red-600 hover:bg-red-50 border border-red-200"
                              title="Unlink roll from this Jumbo Roll"
                            >
                              <Unlink size={11} className="mr-0.5 inline" />
                              <span>Unlink</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={canManage ? 9 : 8}
                        className="text-center py-8 text-slate-400"
                      >
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Package size={24} className="text-slate-300 stroke-1" />
                          <p className="text-xs">
                            No incoming rolls have been cut from this Jumbo Roll yet.
                          </p>
                          {canManage && (
                            <button
                              onClick={handleOpenLinkModal}
                              className="btn btn-secondary btn-sm text-[11px] mt-1"
                            >
                              <Link2 size={12} className="mr-1 inline" />
                              Link Existing Incoming Rolls
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detail Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Jumbo Roll #{selectedJumbo.id} • {selectedJumbo.jumbo_roll_number}
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                onClick={() => {
                  onClose()
                  handleOpenEdit(selectedJumbo)
                }}
                className="btn btn-secondary text-xs flex items-center gap-1"
              >
                <Edit3 size={12} />
                <span>Edit Jumbo Roll</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="btn btn-primary text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
