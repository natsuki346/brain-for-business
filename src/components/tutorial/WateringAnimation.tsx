'use client'

import { useEffect } from 'react'
import { NEGATIVE } from '@/src/styles/colors'

type WateringAnimationProps = {
  onComplete: () => void
}

export default function WateringAnimation({ onComplete }: WateringAnimationProps) {
  useEffect(() => {
    const t = setTimeout(onComplete, 2500)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{ zIndex: 280, background: '#FFFFFF', maxWidth: 390, margin: '0 auto' }}
    >
      <svg width="240" height="240" viewBox="0 0 280 280">
        {/* 土の断面 */}
        <rect x="0" y="160" width="280" height="60" fill={NEGATIVE.pale} />
        <rect x="0" y="220" width="280" height="60" fill={NEGATIVE.soft} opacity="0.55" />

        {/* 種 */}
        <ellipse cx="140" cy="190" rx="16" ry="11" fill={NEGATIVE.deep} />
        <ellipse cx="134" cy="185" rx="5" ry="3" fill={NEGATIVE.soft} />

        {/* 根：水やりで少し伸びる */}
        <g className="animate-rootGrow" style={{ transformOrigin: 'center top', transformBox: 'fill-box' }}>
          <path d="M140 201 L130 222" fill="none" stroke={NEGATIVE.deep} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          <path d="M140 201 L140 226" fill="none" stroke={NEGATIVE.deep} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          <path d="M140 201 L150 222" fill="none" stroke={NEGATIVE.deep} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        </g>

        {/* ジョウロ */}
        <g className="animate-pour" style={{ transformOrigin: '203px 53px' }}>
          {/* 持ち手 */}
          <path d="M188 30 C188 8 232 8 232 30" fill="none" stroke={NEGATIVE.deep} strokeWidth="8" strokeLinecap="round" />
          {/* 本体 */}
          <rect x="170" y="30" width="66" height="46" rx="12" fill={NEGATIVE.deep} />
          {/* 注ぎ口 */}
          <path d="M170 44 L170 60 L120 98 L126 82 Z" fill={NEGATIVE.deep} />
          {/* はす口 */}
          <ellipse cx="120" cy="90" rx="15" ry="9" fill={NEGATIVE.deep} transform="rotate(-30 120 90)" />
          <circle cx="115" cy="87" r="1.6" fill={NEGATIVE.soft} />
          <circle cx="121" cy="91" r="1.6" fill={NEGATIVE.soft} />
          <circle cx="126" cy="86" r="1.6" fill={NEGATIVE.soft} />
        </g>

        {/* 水滴 */}
        <circle cx="120" cy="116" r="3" fill={NEGATIVE.base} className="animate-dropFall" />
        <circle cx="111" cy="114" r="2.5" fill={NEGATIVE.base} className="animate-dropFall [animation-delay:0.45s]" />
        <circle cx="128" cy="118" r="2" fill={NEGATIVE.base} className="animate-dropFall [animation-delay:0.85s]" />
      </svg>

      <p className="text-sm mt-4 text-center" style={{ color: NEGATIVE.text }}>
        あなたの種に水が撒かれています…
      </p>
    </div>
  )
}
