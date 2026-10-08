export interface RollItem {
  id: string
  raw_id: number
  no_roll: string
  form: string
  raw_form?: number
  shift: string
  shifts_id?: number
  date: string
  grade: string
  grades_id?: number
  gsm: number
  gsms_id?: number
  weight: number
  width: number
  location: string
  locations_id?: number
  jop: string
  jops_id?: number
  pic: string
  status: string
  roll_status?: string
  in_shipment_queue?: boolean
  shipment_queue_number?: string | null
  shipment_queue_status?: string | null
  shipment_queue_qc_status?: string | null
  exMaterial: string
  visual: string
  plybond?: number
  thickness?: number
  bulk?: number
  diameter?: number
  core?: string
  cobb?: string
  jumbo_roll?: string | null
  jumbo_roll_id?: number | null
  reproduction_status?: string | null
}

export interface OptionItem {
  id: number
  shift?: string
  grade?: string
  location?: string
  jop?: string
  status?: number
}

export interface ShipmentRollItem {
  id: number
  roll_no: number
  no_roll: string
  grade: string
  gsm: number
  weight: number
  location: string
  qc_status: string // 'pending' | 'passed' | 'rejected_replace'
  reproduction_status?: string | null
  qc_notes: string | null
  qc_checked_at: string | null
}

export interface ShipmentData {
  id: number
  shipment_number: string
  customer: string
  admin: string
  qc_officer: string
  qc_users_id: number
  date: string
  status: string // 'pending' | 'qc_in_progress' | 'completed' | 'canceled'
  total_rolls: number
  checked_rolls: number
  passed_rolls: number
  rejected_rolls: number
  rolls: ShipmentRollItem[]
}

export interface Props {
  rolls?: RollItem[]
  shifts?: OptionItem[]
  grades?: OptionItem[]
  gsms?: { id: number; gsm: number }[]
  locations?: OptionItem[]
  jops?: OptionItem[]
  customers?: { id: number, customer: string }[]
  qcUsers?: { id: number, username?: string, name?: string }[]
  shipments?: ShipmentData[]
}

export const statusColors: Record<string, { bg: string; color: string }> = {
  'Slotted': { bg: '#d0e8f5', color: '#286090' },
  'Shipment Plan': { bg: '#d4edda', color: '#3C763D' },
  'Hold': { bg: '#cce5ff', color: '#004085' },
  'Non-PO': { bg: '#fde8e8', color: '#C0392B' },
  'Incoming': { bg: '#fff3cd', color: '#8A6D3B' },
}

export const QC_CHECKLIST = [
  {
    category: "Identitas Produk",
    items: [
      "Label produk sesuai dengan spesifikasi",
      "Lebar produk sesuai dengan spesifikasi",
      "Diameter produk sesuai dengan spesifikasi",
      "Thickness, Plybond sesuai dengan spesifikasi"
    ]
  },
  {
    category: "Kondisi Fisik Roll",
    items: [
      "Tidak cembung/cekung berlebihan",
      "Roll tidak sobek",
      "Roll tidak terdapat lipatan mati",
      "Roll tidak basah/lembab",
      "Roll tidak ada kontaminasi (debu, sawang, dll)"
    ]
  },
  {
    category: "Packing & Proteksi",
    items: [
      "Wrapping dalam kondisi bagus",
      "Core tidak rusak/penyok",
      "Strap/pallet/pengganjal dalam kondisi tidak rusak",
      "Penataan Roll diatas kendaraan tidak saling menekan"
    ]
  },
  {
    category: "Proses Loading",
    items: [
      "Penggunaan forklift clam untuk produk roll",
      "Penggunaan forklift garpu untuk produk slitting",
      "Arah roll sesuai dengan standar (vertical)"
    ]
  },
  {
    category: "Dokumen",
    items: [
      "Roll yang dimuat sesuai dengan weight list"
    ]
  }
]
