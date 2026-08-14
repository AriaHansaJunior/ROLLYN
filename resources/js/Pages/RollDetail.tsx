import React from 'react'
import { ArrowLeft, Package, CheckCircle, Trash2, Edit } from 'lucide-react'
import { router } from '@inertiajs/react'
import { SystemUI } from '@/Utils/SystemUI'

const roll = {
  id: 'R-10421', form: 'F-2241', shift: 'A', date: '2024-07-10',
  grade: 'KLB-150', gsm: 150, plybond: 1.8, thickness: 0.22, bulk: 1.47,
  width: 1650, diameter: 1120, core: 76, weight: 1007, cobb: 68,
  exMaterial: 'OCC', visual: 'OK', location: 'A-01-01',
  jop: 'JOP-240710', pic: 'Budi S.', status: 'Slotted',
  customer: 'PT Surya Makmur', po: 'PO-TYO-2407', spk: 'SPK-240701',
  orderStatus: 'Ready to Ship',
  ocrTimestamp: '2024-07-10 08:22:14', ocrWeight: 1007, ocrConfidence: '98.4%', ocrStatus: 'Success',
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
      <span className="text-slate-500 font-medium">{label}</span>
      <span className="text-slate-900 font-semibold text-right">{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 pb-2 border-b-2 border-blue-600">
        {title}
      </h3>
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  )
}

export default function RollDetail() {
  async function handleDeleteRoll() {
    const confirmed = await SystemUI.confirm({
      title: 'Delete Roll Record',
      message: `Are you sure you want to delete roll "${roll.id}"? This will free the allocated slot and cannot be undone.`,
      confirmText: 'Delete Roll',
      cancelText: 'Cancel'
    })

    if (confirmed) {
      SystemUI.toast({ message: `Roll ${roll.id} deleted successfully.`, type: 'success' })
      router.visit('/roll-inventory')
    }
  }

  function handleAssignLocation() {
    SystemUI.toast({ message: `Location ${roll.location} is already assigned.`, type: 'info' })
  }

  function handleEditRoll() {
    SystemUI.toast({ message: 'Roll edit modal opened.', type: 'info' })
  }

  return (
    <div className="py-4 px-2.5 sm:px-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary btn-sm" onClick={() => router.visit('/roll-inventory')}>
            <ArrowLeft size={13} /> <span>Back</span>
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Roll Detail — {roll.id}</h2>
            <p className="text-xs text-slate-500">Comprehensive technical specifications & traceability</p>
          </div>
        </div>
        <span className="badge bg-blue-50 text-blue-700 border-blue-200 font-bold px-3 py-1 text-xs">
          {roll.status}
        </span>
      </div>

      <div className="grid grid-cols-1 min-[680px]:grid-cols-2 min-[1180px]:grid-cols-3 gap-4">
        <Section title="Roll Information">
          <InfoRow label="Roll Number" value={roll.id} />
          <InfoRow label="Form Number" value={roll.form} />
          <InfoRow label="Shift" value={roll.shift} />
          <InfoRow label="Entry Date" value={roll.date} />
          <InfoRow label="PIC" value={roll.pic} />
          <InfoRow label="Status" value={roll.status} />
        </Section>

        <Section title="Specification">
          <InfoRow label="Grade" value={roll.grade} />
          <InfoRow label="GSM" value={`${roll.gsm} g/m²`} />
          <InfoRow label="Plybond" value={roll.plybond} />
          <InfoRow label="Thickness" value={`${roll.thickness} mm`} />
          <InfoRow label="Bulk" value={roll.bulk} />
          <InfoRow label="Roll Width" value={`${roll.width} mm`} />
          <InfoRow label="Roll Diameter" value={`${roll.diameter} mm`} />
          <InfoRow label="Core" value={`${roll.core} mm`} />
          <InfoRow label="Weight" value={`${roll.weight} kg`} />
          <InfoRow label="Cobb" value={roll.cobb} />
        </Section>

        <Section title="Inspection Information">
          <InfoRow label="Ex Material" value={roll.exMaterial} />
          <InfoRow label="Visual" value={roll.visual} />
        </Section>

        <Section title="Warehouse Information">
          <InfoRow label="Location" value={roll.location} />
          <InfoRow label="Warehouse" value="Warehouse A" />
          <InfoRow label="Slot Status" value={roll.status} />
        </Section>

        <Section title="Order Information">
          <InfoRow label="Job Order Production" value={roll.jop} />
          <InfoRow label="SPK" value={roll.spk} />
          <InfoRow label="PO" value={roll.po} />
          <InfoRow label="Customer" value={roll.customer} />
          <InfoRow label="Order Status" value={roll.orderStatus} />
        </Section>

        <Section title="OCR Recognition Log">
          <div className="flex items-center gap-2 mb-2 p-2 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle size={15} className="text-green-600 shrink-0" />
            <span className="text-xs font-semibold text-green-700">Recognition Successful</span>
          </div>
          <InfoRow label="OCR Timestamp" value={roll.ocrTimestamp} />
          <InfoRow label="Detected Weight" value={`${roll.ocrWeight} kg`} />
          <InfoRow label="Confidence" value={roll.ocrConfidence} />
          <InfoRow label="OCR Status" value={roll.ocrStatus} />
        </Section>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button className="btn btn-primary flex-1 sm:flex-initial justify-center" onClick={handleAssignLocation}>
          <Package size={14} /> <span>Assign Location</span>
        </button>
        <button className="btn btn-secondary flex-1 sm:flex-initial justify-center" onClick={handleEditRoll}>
          <Edit size={14} /> <span>Edit Roll Data</span>
        </button>
        <div className="w-full sm:w-auto flex justify-center sm:ml-auto mt-1 sm:mt-0">
          <button className="btn btn-danger justify-center" onClick={handleDeleteRoll}>
            <Trash2 size={14} /> <span>Delete Roll</span>
          </button>
        </div>
      </div>
    </div>
  )
}
