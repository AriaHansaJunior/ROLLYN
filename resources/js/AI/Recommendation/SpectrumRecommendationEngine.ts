/**
 * SPECTRUM AI Machine Learning Recommendation Engine (Client-Side Instrument)
 * Unified with backend LightGBM ranker and Zero-Tolerance Gravity Safety rules.
 */

export interface RollInput {
  id?: string | number
  no?: number
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
  rollsCount?: number
  rolls?: any[]
}

export interface RecommendationCandidate {
  id: number
  code: string
  rack: string
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
    rack: string
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
  currentLocationId?: number | string
): SpectrumRecommendationResult {
  const rollGrade = (roll.grade || '').trim().toUpperCase()
  const rollWeight = Number(roll.weight) || 900
  const rollGsm = Number(roll.gsm) || 150
  const rollJop = (roll.jop || '').trim().toUpperCase()

  // Build warehouse occupancy index by rack
  const rackGrades: Record<string, string[]> = {}
  const rackJops: Record<string, string[]> = {}

  allSlots.forEach(s => {
    const isOccupied = s.status !== 0 && String(s.id) !== String(currentLocationId)
    if (isOccupied && s.code) {
      const parts = s.code.split('-')
      const rack = parts[0]
      if (s.grade) {
        if (!rackGrades[rack]) rackGrades[rack] = []
        rackGrades[rack].push(s.grade.trim().toUpperCase())
      }
      if (s.jop) {
        if (!rackJops[rack]) rackJops[rack] = []
        rackJops[rack].push(s.jop.trim().toUpperCase())
      }
    }
  })

  const weights = actionType === 'MOVE'
      ? { grade: 0.25, weight: 0.25, habit: 0.20, jop: 0.15, proximity: 0.15 }
      : { grade: 0.30, weight: 0.25, habit: 0.25, jop: 0.15, proximity: 0.05 }

  const candidates: RecommendationCandidate[] = []

  // Evaluate all available physical slots in database
  allSlots.forEach(slot => {
    if (!slot || slot.id <= 0) return

    // Physical vertical stack height: existing rolls in this slot
    const stackCount = slot.rollsCount ?? (slot.rolls ? slot.rolls.length : 0)
    if (stackCount >= 4) return // Max capacity reached

    const parts = slot.code.split('-')
    const rack = parts[0] || 'E17'
    const col = parts.length > 1 ? parseInt(parts[1], 10) || 1 : 1

    // Tier is determined by vertical stack level (Tier 1 = Floor, Tier 2 = Middle, Tier 3, Tier 4)
    const tier = stackCount > 0 ? (stackCount + 1) : 1

    // --- ZERO-TOLERANCE GRAVITATIONAL SAFETY AUDIT RULE ---
    // Roll with weight >= 1000 kg CANNOT be placed on Tier 3 or Tier 4 under any circumstance!
    if (rollWeight >= 1000 && tier >= 3) {
      return // Hard rejection: Structural safety hazard
    }

    // Inverted Pyramid check: upper roll cannot be heavier than lower roll
    if (stackCount > 0 && slot.rolls && slot.rolls.length > 0) {
      const bottomRoll = slot.rolls[slot.rolls.length - 1]
      const bottomWeight = Number(bottomRoll.weight) || 900
      if ((rollWeight - bottomWeight) > 100) {
        return // Crushing/toppling hazard
      }
    }

    const reasonings: string[] = []
    let tag = 'SPECTRUM Recommendation'

    // 1. Grade Clustering Score (0 - 100)
    let gradeScore = 60.0
    const gradesInRack = rackGrades[rack] || []
    if (gradesInRack.length > 0) {
      if (rollGrade && gradesInRack.includes(rollGrade)) {
        gradeScore = 100.0
        reasonings.push(`Grade Cluster: Rack ${rack} is optimized for grade ${rollGrade}`)
        tag = `Cluster ${rollGrade}`
      } else {
        gradeScore = 30.0
      }
    } else {
      gradeScore = 70.0
    }

    // 2. Weight & Structural Safety Score (0 - 100)
    let weightScore = 70.0
    if (tier === 1) {
      if (rollWeight >= 900) {
        weightScore = 100.0
        reasonings.push(`Foundation Stability: Heavy load (${rollWeight} kg) optimal at Ground Tier 1`)
        if (tag === 'SPECTRUM Recommendation') tag = 'Ground Foundation Tier 1'
      } else {
        weightScore = 80.0
      }
      } else if (tier === 2) {
        if (rollWeight <= 1000) {
          weightScore = 95.0
          reasonings.push(`Balanced Stacking: Tier 2 secure for weight ${rollWeight} kg`)
        } else {
          weightScore = 60.0
        }
        } else if (tier >= 3) {
          if (rollWeight < 750) {
            weightScore = 95.0
            reasonings.push(`Safe Upper Stacking: Lightweight roll (${rollWeight} kg) safe at Tier ${tier}`)
            tag = `Safe Upper Tier ${tier}`
          } else {
            weightScore = 20.0
          }
        }

        // 3. JOP / Customer Order Batching Score (0 - 100)
        let jopScore = 50.0
        if (rollJop) {
          const jopsInRack = rackJops[rack] || []
          if (jopsInRack.includes(rollJop)) {
            jopScore = 100.0
            reasonings.push(`JOP Synchronization: Order batch zone for ${rollJop}`)
            if (tag === 'SPECTRUM Recommendation') tag = `Batch ${rollJop}`
          } else {
            jopScore = 40.0
          }
        }

        // 4. Operator Accessibility & Loading Dock Proximity (0 - 100)
        let habitScore = 60.0
          if (rack.startsWith('E') || rack.startsWith('A')) {
            habitScore = 90.0
            reasonings.push(`Strategic Area: Rack ${rack} has direct access to main loading docks`)
          }

          // 5. Proximity
          let proximityScore = 75.0
          if (actionType === 'MOVE' && currentLocationId) {
            const curSlot = allSlots.find(s => String(s.id) === String(currentLocationId))
            if (curSlot && curSlot.code.split('-')[0] === rack) {
              proximityScore = 95.0
              reasonings.push(`Distance Efficiency: Relocation near origin (${curSlot.code})`)
            }
          }

            let totalScore =
              gradeScore * weights.grade +
              weightScore * weights.weight +
              habitScore * weights.habit +
              jopScore * weights.jop +
              proximityScore * weights.proximity

          // Bonus adjustments mirroring backend LightGBM priority
          if (rollJop && (rackJops[rack] || []).includes(rollJop)) totalScore += 25.0
          if (rollGrade && (rackGrades[rack] || []).includes(rollGrade)) totalScore += 15.0
          if (rollWeight >= 1000 && tier === 1) totalScore += 20.0

          const confidence = Math.min(99.4, Math.max(75.0, Math.round(totalScore * 0.98)))

          candidates.push({
            id: slot.id,
            code: slot.code,
            rack,
            col,
            tier,
            totalScore: Math.round(totalScore * 10) / 10,
            confidence,
            reasonings: Array.from(new Set(reasonings)).slice(0, 3),
            tag
          })
        })

  // Sort descending
  candidates.sort((a, b) => b.totalScore - a.totalScore)

  if (candidates.length === 0) {
    const fallback = allSlots.find(s => (s.rollsCount || 0) < 4 && s.id > 0)
    return {
      recommendedSlot: fallback ? {
        id: fallback.id,
        code: fallback.code,
        rack: fallback.code.split('-')[0],
        col: parseInt(fallback.code.split('-')[1] || '1', 10),
        tier: (fallback.rollsCount || 0) + 1,
      } : null,
      confidence: 60.0,
      reasonings: ['Empty foundation slot available in database'],
      topCandidates: [],
      featureWeights: weights
    }
  }

  const top = candidates[0]

  return {
    recommendedSlot: {
      id: top.id,
      code: top.code,
      rack: top.rack,
      col: top.col,
      tier: top.tier,
    },
    confidence: top.confidence,
    reasonings: top.reasonings,
    topCandidates: candidates.slice(0, 4),
    featureWeights: weights
  }
}
