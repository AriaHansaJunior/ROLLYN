export interface JopOption {
  id: number
  jop: string
  spk: string
  po: string
  customer: string
  grade: string
  gsm: number | null
  width: number | null
  weight: number | null
  quantity: number | null
}

export interface IncomingRollItem {
  no: number
  no_roll: string
  form: number | string | null
  weight: number
  grade: string
  gsm: string | number
  shift: string
  width?: number | null
  diameter?: number | null
  core?: string | null
  status: string
  location: string
  entry_date: string
  pic?: string
}

export interface JumboRollItem {
  id: number
  jumbo_roll_number: string
  jops_id: number
  weight: number
  production_date: string | null
  status: string
  notes: string | null
  created_at: string | null
  user: string
  jop: {
    id: number
    jop: string
    spk: string
    po: string
    customer: string
    grade: string
    gsm: number | null
    width: number | null
    target_weight: number | null
  }
  rolls_count: number
  total_cut_weight: number
  remaining_weight: number
  yield_percentage: number
  rolls: IncomingRollItem[]
}

export interface SummaryData {
  totalJumboRolls: number
  totalJumboWeight: number
  totalCutRolls: number
  totalCutWeight: number
  averageYield: number
}

export interface JumboRollFormState {
  jumbo_roll_number: string
  jops_id: string
  weight: string
  production_date: string
  status: string
  notes: string
}
