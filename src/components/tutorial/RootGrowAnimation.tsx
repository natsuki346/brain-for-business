'use client'

import { useEffect, useState } from 'react'
import WateringAnimation from './WateringAnimation'
import { NEGATIVE } from '@/src/styles/colors'

type RootGrowAnimationProps = {
  onComplete: () => void
}

export const ROOT_GROW_SHOWN_KEY = 'whyme_root_grow_shown'

// 根が伸びていく様子を示す小さな円（元は根の先端の位置）
const GROWTH_DOTS = [
  { cx: 80, cy: 200, delay: 0 },
  { cx: 50, cy: 185, delay: 0.4 },
  { cx: 110, cy: 185, delay: 0.4 },
  { cx: 56, cy: 205, delay: 0.8 },
  { cx: 104, cy: 205, delay: 0.9 },
] as const

// 最後の円が表れてから1秒後に閉じる
const GROWING_DURATION = 0.9 * 1000 + 0.5 * 1000 + 1000

export default function RootGrowAnimation({ onComplete }: RootGrowAnimationProps) {
  const [phase, setPhase] = useState<'watering' | 'growing'>('watering')

  useEffect(() => {
    sessionStorage.setItem(ROOT_GROW_SHOWN_KEY, '1')
  }, [])

  useEffect(() => {
    if (phase !== 'growing') return
    const t = setTimeout(onComplete, GROWING_DURATION)
    return () => clearTimeout(t)
  }, [phase, onComplete])

  if (phase === 'watering') {
    return <WateringAnimation onComplete={() => setPhase('growing')} />
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{ zIndex: 280, maxWidth: 390, margin: '0 auto', background: 'rgba(59,47,30,0.6)' }}
    >
      <style>{`
        @keyframes root-grow-pop {
          0%   { opacity: 0; transform: scale(0.3); }
          70%  { opacity: 1; transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes root-grow-pulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.08); }
        }
      `}</style>
      <svg width="240" height="320" viewBox="0 0 160 240" style={{ display: 'block' }}>
        {/* 土の表面層 */}
        <path d="M0,70 C40,52 90,78 160,58 L160,240 L0,240 Z" fill={NEGATIVE.pale} />
        {/* 土の中層 */}
        <path d="M0,140 L160,140 L160,240 L0,240 Z" fill={NEGATIVE.soft} opacity="0.7" />
        {/* 土の深層 */}
        <path d="M0,195 L160,195 L160,240 L0,240 Z" fill={NEGATIVE.deep} opacity="0.4" />

        {/* 種（脈動する円） */}
        <circle
          cx="80" cy="98" r="32" fill={NEGATIVE.deep}
          style={{ transformOrigin: '80px 98px', animation: 'root-grow-pulse 1.6s ease-in-out 0.3s infinite' }}
        />

        {/* 根が伸びていく様子を示す小さな円 */}
        {GROWTH_DOTS.map((d, i) => (
          <circle
            key={i}
            cx={d.cx} cy={d.cy} r={7}
            fill={NEGATIVE.base}
            style={{
              transformOrigin: `${d.cx}px ${d.cy}px`,
              animation: `root-grow-pop 0.5s ${d.delay}s cubic-bezier(0.34,1.56,0.64,1) both`,
            }}
          />
        ))}
      </svg>

      <p className="text-sm mt-4 text-center" style={{ color: NEGATIVE.soft }}>
        根っこが伸びています…
      </p>
    </div>
  )
}
