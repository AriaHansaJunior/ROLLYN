export interface CustomerItem { id: number; customer: string }
export interface GradeItem { id: number; grade: string }
export interface GsmItem { id: number; gsm: number }
export interface PlybondItem { id: number; plybonds: number }
export interface ThicknessItem { id: number; thickness: number }
export interface CoreItem { id: number; core: string }

export interface JopFormState {
  spk: string
  jop: string
  po: string
  customers_id: string
  grades_id: string
  gsms_id: string
  plybonds_id: string
  thicknesses_id: string
  cores_id: string
  quantity: string
  tph: string
  noted_order: string
  rw_targets: { id: number; width: string; quantity: string }[]
}
