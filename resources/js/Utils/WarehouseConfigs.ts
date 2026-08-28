export interface RackConfig {
  rack: string
  label?: string
  cols: { col: number; maxRow: number }[]
  special?: string
  specialColSpan?: number
  specialRowStart?: number
  specialRowSpan?: number
}

export const A_RACK_CONFIGS: RackConfig[] = [
  // A17: 4 × 6
  { rack: 'A17', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A16: LOADING DOCK 1 — 4 × 6
  { rack: 'A16', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'LOADING DOCK 1', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  // A15: 4 × 6
  { rack: 'A15', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A14: LOADING DOCK 2 — 4 × 6
  { rack: 'A14', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'LOADING DOCK 2', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  // A13: 4 × 6
  { rack: 'A13', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A12: 4 × 6
  { rack: 'A12', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A11: 4 × 6
  { rack: 'A11', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A10: 4 × 6
  { rack: 'A10', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A9: 4 × 6
  { rack: 'A9', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A8: 4 × 6
  { rack: 'A8', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A7: 4 × 6
  { rack: 'A7', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A6: 4 × 6
  { rack: 'A6', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A5: 4 × 6
  { rack: 'A5', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // A4: 1 × 12 (col 1) + DOOR 3 × 12 (cols 4,3,2)
  { rack: 'A4', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 12 }], special: 'DOOR', specialColSpan: 3, specialRowStart: 1, specialRowSpan: 12 },
  // A3: 4 × 12
  { rack: 'A3', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  // A2: 4 × 12
  { rack: 'A2', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  // A1: 4 × 12
  { rack: 'A1', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
];

export const E_RACK_CONFIGS: RackConfig[] = [
  { rack: 'E17', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'E16', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'E15', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'E14', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'E13', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'E12', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'E11', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'E10', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'E9', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'E8', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'E7', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'E6', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'E5', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'E4', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'E3', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'E2', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
];

export const G_RACK_CONFIGS: RackConfig[] = [
  { rack: 'G12', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'G11', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'G10', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'G9', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'G8', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'G7', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'G6', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'G5', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'G4', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'G3', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'G2', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 12 }, { col: 1, maxRow: 12 }] },
  { rack: 'G1', cols: [{ col: 4, maxRow: 12 }, { col: 3, maxRow: 12 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }] },
];

export const B_KANAN_RACK_CONFIGS: RackConfig[] = [
  { rack: 'B35', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: ' ', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  { rack: 'B34', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: ' ', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  { rack: 'B33', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'B32', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'B31', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'B30', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'B29', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'B28', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'B27', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'B26', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'B25', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'B24', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'B23', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'B22', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'B21', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: ' ', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
];

export const B_KIRI_RACK_CONFIGS: RackConfig[] = [
  { rack: 'B35L', label: 'B35', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'SPARE PART', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  { rack: 'B34L', label: 'B34', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'SPARE PART', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  { rack: 'B33L', label: 'B33', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'SPARE PART', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  { rack: 'B32L', label: 'B32', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'SPARE PART', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  { rack: 'B31L', label: 'B31', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'SPARE PART', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  { rack: 'B30L', label: 'B30', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'SPARE PART', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  { rack: 'B29L', label: 'B29', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'SPARE PART', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  { rack: 'B28L', label: 'B28', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'SPARE PART', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  { rack: 'B27L', label: 'B27', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'SPARE PART', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  
  // B26: col 2, 1
  { rack: 'B26L', label: 'B26', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // B25: full
  { rack: 'B25L', label: 'B25', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // B24: full
  { rack: 'B24L', label: 'B24', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  // B23: col 4, 3, 2
  { rack: 'B23L', label: 'B23', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 0 }] },
  
  { rack: 'B22L', label: 'B22', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: ' ', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  { rack: 'B21L', label: 'B21', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: ' ', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
];

export const C_KANAN_RACK_CONFIGS: RackConfig[] = [
  { rack: 'C35', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: ' ', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  { rack: 'C34', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: ' ', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  { rack: 'C33', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C32', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C31', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C30', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C29', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C28', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C27', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C26', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C25', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C24', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C23', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C22', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C21', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: ' ', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
];

export const C_KIRI_RACK_CONFIGS: RackConfig[] = [
  { rack: 'C35L', label: 'C35', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: ' ', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  { rack: 'C34L', label: 'C34', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: ' ', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
  { rack: 'C33L', label: 'C33', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C32L', label: 'C32', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C31L', label: 'C31', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C30L', label: 'C30', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C29L', label: 'C29', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C28L', label: 'C28', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C27L', label: 'C27', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C26L', label: 'C26', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C25L', label: 'C25', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C24L', label: 'C24', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C23L', label: 'C23', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C22L', label: 'C22', cols: [{ col: 4, maxRow: 6 }, { col: 3, maxRow: 6 }, { col: 2, maxRow: 6 }, { col: 1, maxRow: 6 }] },
  { rack: 'C21L', label: 'C21', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: ' ', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 6 },
];

export const H_RACK_CONFIGS: RackConfig[] = [
  { rack: 'H8', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'AREA SLITTING', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 15 },
  { rack: 'H7', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'AREA SLITTING', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 15 },
  { rack: 'H6', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'AREA SLITTING', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 15 },
  { rack: 'H5', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'AREA SLITTING', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 15 },
  { rack: 'H4', cols: [{ col: 4, maxRow: 0 }, { col: 3, maxRow: 0 }, { col: 2, maxRow: 0 }, { col: 1, maxRow: 0 }], special: 'AREA SLITTING', specialColSpan: 4, specialRowStart: 1, specialRowSpan: 15 },
  { rack: 'H3', cols: [{ col: 4, maxRow: 15 }, { col: 3, maxRow: 15 }, { col: 2, maxRow: 15 }, { col: 1, maxRow: 15 }] },
  { rack: 'H2', cols: [{ col: 4, maxRow: 15 }, { col: 3, maxRow: 15 }, { col: 2, maxRow: 15 }, { col: 1, maxRow: 15 }] },
  { rack: 'H1', cols: [{ col: 4, maxRow: 15 }, { col: 3, maxRow: 15 }, { col: 2, maxRow: 15 }, { col: 1, maxRow: 15 }] },
];

export const AREA_CONFIGS: Record<string, { racks: RackConfig[], name: string, totalSlots?: number }> = {
  A: { racks: A_RACK_CONFIGS, name: 'Column A', totalSlots: 420 },
  E: { racks: E_RACK_CONFIGS, name: 'Column E' },
  B_KANAN: { racks: B_KANAN_RACK_CONFIGS, name: 'Warehouse B (RIGHT)' },
  B_KIRI: { racks: B_KIRI_RACK_CONFIGS, name: 'Warehouse B (LEFT)' },
  C_KANAN: { racks: C_KANAN_RACK_CONFIGS, name: 'Warehouse C (RIGHT)' },
  C_KIRI: { racks: C_KIRI_RACK_CONFIGS, name: 'Warehouse C (LEFT)' },
  G: { racks: G_RACK_CONFIGS, name: 'Warehouse G' },
  H: { racks: H_RACK_CONFIGS, name: 'Warehouse H' }
};
