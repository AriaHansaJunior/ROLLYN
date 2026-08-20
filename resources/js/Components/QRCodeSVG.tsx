import React from 'react'

// Lightweight QR Code Generator
function generateQRMatrix(text: string): boolean[][] {
  const size = 25
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))

  // Helper to draw finder pattern 7x7
  function drawFinder(r: number, c: number) {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
          matrix[r + i][c + j] = true
        } else {
          matrix[r + i][c + j] = false
        }
      }
    }
  }

  // Draw 3 Finder Patterns
  drawFinder(0, 0)
  drawFinder(0, size - 7)
  drawFinder(size - 7, 0)

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0
    matrix[i][6] = i % 2 === 0
  }

  // Alignment pattern
  const alignR = size - 7
  const alignC = size - 7
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      const isEdge = Math.abs(i) === 2 || Math.abs(j) === 2
      const isCenter = i === 0 && j === 0
      matrix[alignR + i][alignC + j] = isEdge || isCenter
    }
  }

  // Hash payload bits into data modules
  let hash = 5381
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33) ^ text.charCodeAt(i)
  }

  let bitIndex = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if ((r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8)) continue
      if (r === 6 || c === 6) continue
      if (Math.abs(r - alignR) <= 2 && Math.abs(c - alignC) <= 2) continue

      const bit = ((hash >> (bitIndex % 31)) & 1) === 1
      matrix[r][c] = bit !== ((r + c) % 3 === 0)
      bitIndex++
      hash = (hash * 1664525 + 1013904223) | 0
    }
  }

  return matrix
}

interface QRCodeSVGProps {
  value: string
  size?: number
  bgColor?: string
  fgColor?: string
  className?: string
}

export default function QRCodeSVG({
  value,
  size = 140,
  bgColor = '#FFFFFF',
  fgColor = '#1e293b',
  className = ''
}: QRCodeSVGProps) {
  const matrix = generateQRMatrix(value || 'ROLLYN')
  const moduleCount = matrix.length

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${moduleCount} ${moduleCount}`}
      shapeRendering="crispEdges"
      className={className}
      style={{ backgroundColor: bgColor }}
    >
      <rect width={moduleCount} height={moduleCount} fill={bgColor} />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={fgColor} /> : null
        )
      )}
    </svg>
  )
}
