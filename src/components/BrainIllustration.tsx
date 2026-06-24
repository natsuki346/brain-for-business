'use client'

import { useId } from 'react'
import { NEGATIVE, POSITIVE } from '@/src/styles/colors'

// 脳のシルエットを左右半球で塗り分けるための共通パーツ（楕円＋複数の丸で「しわ」を表現）
function BrainShape() {
  return (
    <>
      <ellipse cx="50" cy="52" rx="34" ry="28" />
      <circle cx="34" cy="28" r="12" />
      <circle cx="66" cy="28" r="12" />
      <circle cx="50" cy="20" r="11" />
      <circle cx="20" cy="46" r="11" />
      <circle cx="80" cy="46" r="11" />
      <circle cx="28" cy="68" r="10" />
      <circle cx="72" cy="68" r="10" />
      <circle cx="50" cy="74" r="9" />
      <path d="M44,78 Q50,76 56,78 Q54,88 50,92 Q46,88 44,78 Z" />
    </>
  )
}

// シナプスの輝き（起動アニメーション時のみ点滅させる位置）
const SPARKS = [
  { cx: 30, cy: 24 },
  { cx: 70, cy: 30 },
  { cx: 50, cy: 16 },
  { cx: 22, cy: 50 },
  { cx: 78, cy: 56 },
]

// 起動時のスプラッシュ等で使う脳のイラスト。
// 左半球をPositive（赤系）、右半球をNegative（青系）に塗り分け、
// 「ありのままの自分（光と影の両方）」を一つの脳として表現する。
// animateがtrueの間、ポップインのアニメーションとシナプスの輝きが再生される。
export default function BrainIllustration({ size, animate }: { size: number; animate: boolean }) {
  const clipId = useId()

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }}>
      <style>{`
        @keyframes brain-pop-in {
          0%   { transform: scale(0.6); opacity: 0; }
          70%  { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes brain-spark {
          0%, 100% { opacity: 0; transform: scale(0.4); }
          50%      { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <defs>
        <clipPath id={`${clipId}-left`}><rect x="0" y="0" width="50" height="100" /></clipPath>
        <clipPath id={`${clipId}-right`}><rect x="50" y="0" width="50" height="100" /></clipPath>
      </defs>

      <g
        style={{
          transformOrigin: '50px 52px',
          opacity: animate ? undefined : 1,
          animation: animate ? 'brain-pop-in 0.7s cubic-bezier(0.34,1.56,0.64,1) both' : undefined,
        }}
      >
        <g clipPath={`url(#${clipId}-left)`} fill={POSITIVE.base}>
          <BrainShape />
        </g>
        <g clipPath={`url(#${clipId}-right)`} fill={NEGATIVE.base}>
          <BrainShape />
        </g>

        {/* 左右の半球を分ける中央線 */}
        <path
          d="M50,19 C47,30 53,40 50,52 C47,64 53,72 50,90"
          stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.85" strokeLinecap="round"
        />
      </g>

      {animate && SPARKS.map((s, i) => (
        <circle
          key={i}
          cx={s.cx} cy={s.cy} r={2.2}
          fill="#FFFFFF"
          style={{ animation: `brain-spark 1.4s ${0.6 + i * 0.18}s ease-in-out infinite` }}
        />
      ))}
    </svg>
  )
}
