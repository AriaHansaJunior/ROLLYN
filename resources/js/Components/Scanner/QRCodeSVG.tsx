import React, { useMemo } from 'react'
import QRCode from 'qrcode'

interface QRCodeSVGProps {
  value: string
  size?: number
  bgColor?: string
  fgColor?: string
  className?: string
  margin?: number
}

export default function QRCodeSVG({
  value,
  size = 140,
  bgColor = '#FFFFFF',
  fgColor = '#1e293b',
  className = '',
  margin = 2
}: QRCodeSVGProps) {
  const { moduleCount, pathData } = useMemo(() => {
    try {
      const qr = QRCode.create(value || 'ROLLYN', { errorCorrectionLevel: 'M' })
      const modules = qr.modules
      const count = modules.size
      let path = ''

      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (modules.get(r, c)) {
            path += `M${c + margin} ${r + margin}h1v1h-1z `
          }
        }
      }
      return { moduleCount: count + margin * 2, pathData: path }
    } catch (err) {
      console.error('Failed to generate standard QR code:', err)
      return { moduleCount: 25, pathData: '' }
    }
  }, [value, margin])

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
      {pathData ? <path d={pathData} fill={fgColor} /> : null}
    </svg>
  )
}
