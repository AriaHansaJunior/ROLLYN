import { ArrowLeft, Package, CheckCircle } from 'lucide-react'

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
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #EEEEEE' }}>
      <span style={{ fontSize: 12, color: '#777', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 className="section-title" style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '2px solid #286090' }}>{title}</h3>
      {children}
    </div>
  )
}

import { router } from '@inertiajs/react'

export default function RollDetail() {
  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => router.visit('/roll-inventory')}><ArrowLeft size={13} /> Back</button>
        <h2 className="page-title" style={{ margin: 0 }}>Roll Detail — {roll.id}</h2>
        <span className="badge" style={{ background: '#d0e8f5', color: '#286090', marginLeft: 'auto' }}>{roll.status}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }} className="max-[1179px]:grid-cols-2! max-[679px]:grid-cols-1!">
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
          <InfoRow label="JOP" value={roll.jop} />
          <InfoRow label="SPK" value={roll.spk} />
          <InfoRow label="PO" value={roll.po} />
          <InfoRow label="Customer" value={roll.customer} />
          <InfoRow label="Order Status" value={roll.orderStatus} />
        </Section>

        <Section title="OCR Information">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 10px', background: '#f2f9f2', borderRadius: 4 }}>
            <CheckCircle size={16} style={{ color: '#5CB85C' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#3C763D' }}>Recognition Successful</span>
          </div>
          <InfoRow label="OCR Timestamp" value={roll.ocrTimestamp} />
          <InfoRow label="Detected Weight" value={`${roll.ocrWeight} kg`} />
          <InfoRow label="Confidence" value={roll.ocrConfidence} />
          <InfoRow label="OCR Status" value={roll.ocrStatus} />
        </Section>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn btn-primary"><Package size={14} /> Assign Location</button>
        <button className="btn btn-secondary">Edit Roll Data</button>
        <button className="btn btn-danger" style={{ marginLeft: 'auto' }}>Delete Roll</button>
      </div>
    </div>
  )
}
