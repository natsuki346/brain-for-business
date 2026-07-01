'use client'

import { useEffect, useState } from 'react'
import { NEGATIVE } from '@/src/styles/colors'

interface BubbleGrowthIndicatorProps {
  growthPoint: number
}

type Stage = 'seed' | 'sprout' | 'bud' | 'bloom'

function getStage(gp: number): Stage {
  if (gp >= 30) return 'bloom'
  if (gp >= 20) return 'bud'
  if (gp >= 10) return 'sprout'
  return 'seed'
}

type BarConfig = {
  trackColor: string
  fillColor:  string
  progress:   number  // 0〜1
  label:      string
  leftEmoji:  string
  rightEmoji: string
}

function getBarConfig(gp: number): BarConfig {
  const stage = getStage(gp)

  if (stage === 'bloom') {
    return {
      trackColor: NEGATIVE.deep,
      fillColor:  NEGATIVE.deep,
      progress:   1,
      label:      '満開に到達！',
      leftEmoji:  '',
      rightEmoji: '',
    }
  }

  if (stage === 'bud') {
    return {
      trackColor: NEGATIVE.base,
      fillColor:  NEGATIVE.deep,
      progress:   (gp - 20) / 10,  // gp=20 → 0%, gp=30 → 100%
      label:      `次のステージまで あと${30 - gp}pt`,
      leftEmoji:  '',
      rightEmoji: '',
    }
  }

  if (stage === 'sprout') {
    return {
      trackColor: NEGATIVE.soft,
      fillColor:  NEGATIVE.base,
      progress:   (gp - 10) / 10,  // gp=10 → 0%, gp=20 → 100%
      label:      `次のステージまで あと${20 - gp}pt`,
      leftEmoji:  '',
      rightEmoji: '',
    }
  }

  return {
    trackColor: NEGATIVE.pale,
    fillColor:  NEGATIVE.soft,
    progress:   gp / 10,  // gp=0 → 0%, gp=10 → 100%
    label:      `次のステージまで あと${10 - gp}pt`,
    leftEmoji:  '',
    rightEmoji: '',
  }
}

export default function BubbleGrowthIndicator({ growthPoint }: BubbleGrowthIndicatorProps) {
  const gp     = Math.max(0, growthPoint)
  const config = getBarConfig(gp)

  const [animatedWidth, setAnimatedWidth] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setAnimatedWidth(config.progress), 50)
    return () => clearTimeout(t)
  }, [config.progress])

  return (
    <div style={{ margin: '0 20px 20px' }}>
      <p style={{
        fontSize: 12,
        color: 'rgba(0,0,0,0.5)',
        margin: '0 0 8px',
        textAlign: 'center',
      }}>
        {config.label}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{config.leftEmoji}</span>

        <div style={{
          flex: 1,
          height: 10,
          borderRadius: 99,
          background: config.trackColor,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.round(animatedWidth * 100)}%`,
            borderRadius: 99,
            background: config.fillColor,
            transition: 'width 0.8s ease-out',
          }} />
        </div>

        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{config.rightEmoji}</span>
      </div>
    </div>
  )
}
