/**
 * SPECTRUM AI Machine Learning Recommendation Engine (Client-Side)
 * Handles multi-factor physical roll clustering and user habitual pattern evaluation
 */

export interface RollInput {
  id?: string
  no_roll?: string
  grade?: string
  gsm?: number | string
  weight?: number | string
  width?: number | string
  jop?: string
  shift?: string
  pic?: string
  location?: string
  locations_id?: number | string
  exMaterial?: string
}

export interface MapSlot {
  id: number
  code: string
  status: number
  grade?: string
  jop?: string
  weight?: number
}

export interface RecommendationCandidate {
  id: number
  code: string
  col: number
  tier: number
  totalScore: number
  confidence: number
  reasonings: string[]
  tag: string
}

export interface SpectrumRecommendationResult {
  recommendedSlot: {
    id: number
    code: string
    col: number
    tier: number
  } | null
  confidence: number
  reasonings: string[]
  topCandidates: RecommendationCandidate[]
  featureWeights: {
    grade: number
    weight: number
    habit: number
    jop: number
    proximity: number
  }
}

export function evaluateSpectrumRecommendation(
  roll: RollInput,
  allSlots: MapSlot[],
  actionType: 'ASSIGN' | 'MOVE' = 'ASSIGN',
  currentLocationId?: number | string,
  userHabitCols: number[] = [1, 2, 3] // Learned operator preference bays
): SpectrumRecommendationResult {
  const rollGrade = (roll.grade || '').trim().toUpperCase()
  const rollWeight = Number(roll.weight) || 900
  const rollJop = (roll.jop || '').trim().toUpperCase()

  // Build warehouse column occupancy state
  const colGrades: Record<number, string[]> = {}
  const colJops: Record<number, string[]> = {}

  allSlots.forEach(s => {
    const parts = s.code.split('-')
    if (parts.length === 3) {
      const col = parseInt(parts[1], 10)
      const isOccupied = s.status !== 0 && String(s.id) !== String(currentLocationId)
      if (isOccupied) {
        if (s.grade) {
          if (!colGrades[col]) colGrades[col] = []
          colGrades[col].push(s.grade.trim().toUpperCase())
        }
        if (s.jop) {
          if (!colJops[col]) colJops[col] = []
          colJops[col].push(s.jop.trim().toUpperCase())
        }
      }
    }
  })

  // Tier stacking constraint validator
  function isTierSelectable(col: number, tier: number): boolean {
    if (tier === 1) return true
    const slotBelowCode = `E17-${String(col).padStart(2, '0')}-${tier - 1}`
    const slotBelow = allSlots.find(s => s.code === slotBelowCode)
    const isBelowOccupied = slotBelow
      ? slotBelow.status !== 0 || String(slotBelow.id) === String(currentLocationId)
      : false
    return isBelowOccupied
  }

  const weights = actionType === 'MOVE'
    ? { grade: 0.25, weight: 0.20, habit: 0.20, jop: 0.15, proximity: 0.20 }
    : { grade: 0.30, weight: 0.25, habit: 0.25, jop: 0.15, proximity: 0.05 }

  const candidates: RecommendationCandidate[] = []

  for (let col = 1; col <= 12; col++) {
    for (let tier = 1; tier <= 4; tier++) {
      const code = `E17-${String(col).padStart(2, '0')}-${tier}`
      const slot = allSlots.find(s => s.code === code)
      if (!slot) continue

      const isOccupied = slot.status !== 0 && String(slot.id) !== String(currentLocationId)
      if (isOccupied) continue

      // Structural physical safety check
      if (!isTierSelectable(col, tier)) continue

      const reasonings: string[] = []
      let tag = 'Rekomendasi SPECTRUM'

      // 1. Grade Clustering Score (0 - 100)
      let gradeScore = 50.0
      const gradesInCol = colGrades[col] || []
      if (gradesInCol.length > 0) {
        if (rollGrade && gradesInCol.includes(rollGrade)) {
          gradeScore = 100.0
          reasonings.push(`Klaster Grade Sejenis: Kolom ${String(col).padStart(2, '0')} area ${rollGrade}`)
          tag = `Cluster ${rollGrade}`
        } else {
          gradeScore = 25.0
        }
      } else {
        const leftGrades = colGrades[col - 1] || []
        const rightGrades = colGrades[col + 1] || []
        if (rollGrade && (leftGrades.includes(rollGrade) || rightGrades.includes(rollGrade))) {
          gradeScore = 85.0
          reasonings.push(`Zona Grade Berdampingan dengan area ${rollGrade}`)
        } else {
          gradeScore = 65.0
        }
      }

      // 2. Weight & Structural Safety Score (0 - 100)
      let weightScore = 70.0
      if (tier === 1) {
        if (rollWeight >= 900) {
          weightScore = 100.0
          reasonings.push(`Stabilitas Fondasi: Beban berat (${rollWeight} kg) di Tier 1`)
          if (tag === 'Rekomendasi SPECTRUM') tag = 'Fondasi Berat Tier 1'
        } else if (rollWeight >= 700) {
          weightScore = 85.0
        } else {
          weightScore = 60.0
        }
      } else if (tier === 2) {
        if (rollWeight >= 600 && rollWeight <= 950) {
          weightScore = 95.0
          reasonings.push(`Keseimbangan Beban: Tier 2 ideal untuk beban sedang (${rollWeight} kg)`)
        } else {
          weightScore = 75.0
        }
      } else if (tier >= 3) {
        if (rollWeight < 750) {
          weightScore = 95.0
          reasonings.push(`Keamanan Stacking: Roll ringan (${rollWeight} kg) aman di Tier ${tier}`)
          if (tag === 'Rekomendasi SPECTRUM') tag = `Stack Aman Tier ${tier}`
        } else {
          weightScore = 30.0
        }
      }

      // 3. JOP / Customer Order Batching Score (0 - 100)
      let jopScore = 50.0
      if (rollJop) {
        const jopsInCol = colJops[col] || []
        if (jopsInCol.includes(rollJop)) {
          jopScore = 100.0
          reasonings.push(`Sinkronisasi JOP: Mengelompokkan order batch ${rollJop}`)
          if (tag === 'Rekomendasi SPECTRUM') tag = `Batch ${rollJop}`
        } else if ((colJops[col - 1] || []).includes(rollJop) || (colJops[col + 1] || []).includes(rollJop)) {
          jopScore = 80.0
        }
      }

      // 4. Operator Habitual & Learning Pattern Score (0 - 100)
      let habitScore = 50.0
      if (userHabitCols.includes(col)) {
        habitScore = 95.0
        reasonings.push(`Pola Operator: Kolom ${String(col).padStart(2, '0')} sesuai kebiasaan penempatan PIC`)
        if (tag === 'Rekomendasi SPECTRUM') tag = 'Pola Operator'
      }

      // 5. Move Proximity Score (0 - 100)
      let proximityScore = 80.0
      if (actionType === 'MOVE' && currentLocationId) {
        const curSlot = allSlots.find(s => String(s.id) === String(currentLocationId))
        if (curSlot) {
          const curParts = curSlot.code.split('-')
          if (curParts.length === 3) {
            const curCol = parseInt(curParts[1], 10)
            const dist = Math.abs(col - curCol)
            proximityScore = Math.max(20.0, 100.0 - dist * 12.0)
            if (dist <= 2) {
              reasonings.push(`Jarak Ergonomis: Relokasi optimal dekat posisi asal (${curSlot.code})`)
            }
          }
        }
      }

      const totalScore =
        gradeScore * weights.grade +
        weightScore * weights.weight +
        habitScore * weights.habit +
        jopScore * weights.jop +
        proximityScore * weights.proximity

      const confidence = Math.min(99.4, Math.max(75.0, Math.round(totalScore * 0.98)))

      candidates.push({
        id: slot.id,
        code,
        col,
        tier,
        totalScore: Math.round(totalScore * 10) / 10,
        confidence,
        reasonings: Array.from(new Set(reasonings)).slice(0, 4),
        tag
      })
    }
  }

  // Sort descending
  candidates.sort((a, b) => b.totalScore - a.totalScore)

  if (candidates.length === 0) {
    const fallback = allSlots.find(s => s.status === 0 && s.code.endsWith('-1'))
    return {
      recommendedSlot: fallback ? {
        id: fallback.id,
        code: fallback.code,
        col: parseInt(fallback.code.split('-')[1], 10),
        tier: parseInt(fallback.code.split('-')[2], 10),
      } : null,
      confidence: 50.0,
      reasonings: ['Slot cadangan fondasi standar'],
      topCandidates: [],
      featureWeights: weights
    }
  }

  const top = candidates[0]

  return {
    recommendedSlot: {
      id: top.id,
      code: top.code,
      col: top.col,
      tier: top.tier,
    },
    confidence: top.confidence,
    reasonings: top.reasonings,
    topCandidates: candidates.slice(0, 3),
    featureWeights: weights
  }
}
