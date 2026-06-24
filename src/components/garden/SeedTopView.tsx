'use client'

import type { PointerEvent } from 'react'
import { NEGATIVE, withAlpha } from '@/src/styles/colors'

type SeedTopViewProps = {
  cx: number
  cy: number
  size: number
  label: string
  onClick?: () => void
  onDelete?: () => void
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void
}

// 土壌透視用：上から見たNegativeタグ（根の部屋・影タグ）。タネの形はやめて、単色の円で表現する
export default function SeedTopView({ cx, cy, size, label, onClick, onDelete, onPointerDown }: SeedTopViewProps) {
  return (
    <div
      onClick={onClick}
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        left: cx, top: cy,
        transform: 'translate(-50%, -50%)',
        width: size, height: size,
        cursor: onClick || onPointerDown ? 'pointer' : undefined,
        touchAction: onPointerDown ? 'none' : undefined,
      }}
    >
      <svg
        width={size} height={size}
        viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
        style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
      >
        {/* 影 */}
        <ellipse cx="0" cy={size * 0.36} rx={size * 0.3} ry={size * 0.08} fill="#000000" opacity="0.06" />

        {/* 円 */}
        <circle cx="0" cy="0" r={size * 0.4} fill={NEGATIVE.base} />
      </svg>

      {/* ハッシュタグピル */}
      <span
        style={{
          position: 'absolute', left: '50%', top: -size * 0.6,
          transform: 'translate(-50%, -50%)',
          background: withAlpha(NEGATIVE.pale, 0.9), color: NEGATIVE.text,
          fontSize: 10, fontWeight: 600,
          borderRadius: 10, padding: '3px 10px',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>

      {/* 削除ボタン（左上） */}
      {onDelete && (
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete() }}
          style={{
            position: 'absolute', top: -8, left: -8,
            width: 20, height: 20, borderRadius: '50%',
            background: '#E05050', color: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, lineHeight: 1,
            border: 'none', padding: 0, cursor: 'pointer',
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
