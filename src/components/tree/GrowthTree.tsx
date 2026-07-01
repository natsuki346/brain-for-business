'use client'

import type { GrowthStage } from './useGrowthStage'

const STEM_COLOR = '#1A1A1A'
const LEAF_COLOR = '#5A9C6A'
const ROOT_COLOR = '#555555'
const SEED_COLOR = '#CCCCCC'
const BLOOM_COLOR = '#E8A020'
const BLOOM_GLOW = '#F5D060'

const GROUND_LINE_Y = 360
const GRASS_HEIGHT = 8
const SOIL_HEIGHT = 5
const SOIL_TOP = GROUND_LINE_Y + GRASS_HEIGHT + SOIL_HEIGHT
const SEED_Y = SOIL_TOP + 5

// 根の先端を示す小さな円（位置のみ。形は丸で統一する）
const ROOT_DOTS = [
  { cx: 160, cy: 417, delay: 0 },
  { cx: 122, cy: 419, delay: 0.1 },
  { cx: 198, cy: 419, delay: 0.1 },
  { cx: 116, cy: 419, delay: 0.25 },
  { cx: 204, cy: 419, delay: 0.25 },
] as const

function LeafDots({ y, r }: { y: number; r: number }) {
  return (
    <>
      <circle cx={160 - r * 1.7} cy={y} r={r} fill={LEAF_COLOR} />
      <circle cx={160 + r * 1.7} cy={y} r={r} fill={LEAF_COLOR} />
    </>
  )
}

export default function GrowthTree({ stage, size = 320 }: { stage: GrowthStage; size?: number }) {
  const showBloom = stage === 'bloom'

  return (
    <div key={stage} style={{ width: size, aspectRatio: '320 / 420', position: 'relative', animation: 'gt-tree-fade-in 0.8s ease both' }}>
      <style>{`
        @keyframes gt-tree-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gt-tree-pop { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes gt-tree-bloom { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
        @keyframes gt-tree-grow { from { transform: scale(0.92); } to { transform: scale(1); } }
        @keyframes gt-dot-pop { 0% { opacity: 0; transform: scale(0.3); } 70% { opacity: 1; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes gt-seed-fade { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.6); } }
        @keyframes gt-stem-grow { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes gt-bloom-glow { 0%, 100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.08); } }
        .gt-fade-out { transform-box: fill-box; transform-origin: center; animation: gt-seed-fade 0.5s ease-in forwards; animation-delay: 0.2s; }
        .gt-pop  { transform-box: fill-box; transform-origin: center; animation: gt-tree-pop 0.8s ease both; }
        .gt-dot  { transform-box: fill-box; transform-origin: center; animation: gt-dot-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
        .gt-bloom-group { transform-box: fill-box; transform-origin: center; animation: gt-tree-bloom 1s ease both; }
        .gt-whole-bloom { transform-box: fill-box; transform-origin: 50% 90%; animation: gt-tree-grow 1.2s ease both; }
        .gt-stem { stroke-dasharray: 1; stroke-dashoffset: 1; animation: gt-stem-grow 0.7s ease-out forwards; }
        .gt-glow { transform-box: fill-box; transform-origin: center; animation: gt-bloom-glow 2.2s ease-in-out infinite; }
      `}</style>
      <svg width="100%" height="100%" viewBox="0 0 320 420" className={showBloom ? 'gt-whole-bloom' : undefined}>
        {/* 地面 */}
        <rect x="0" y={GROUND_LINE_Y} width="320" height={GRASS_HEIGHT} fill={STEM_COLOR} />
        <rect x="0" y={GROUND_LINE_Y + GRASS_HEIGHT} width="320" height={SOIL_HEIGHT} fill={ROOT_COLOR} />
        <rect x="0" y={SOIL_TOP} width="320" height={420 - SOIL_TOP} fill="#C9A96E" />

        {/* タネ（seed）：丸ひとつ */}
        {stage === 'seed' && (
          <circle cx="160" cy={GROUND_LINE_Y} r="16" fill={SEED_COLOR} className="gt-pop" />
        )}

        {/* 芽吹き（sprout）：根が伸びて、地上に茎と葉が出る */}
        {stage === 'sprout' && (
          <>
            {ROOT_DOTS.map((d, i) => (
              <circle key={i} cx={d.cx} cy={d.cy} r={5} fill={ROOT_COLOR} className="gt-dot"
                style={{ animationDelay: `${d.delay}s` }} />
            ))}
            <circle cx="160" cy={SEED_Y} r="16" fill={SEED_COLOR} className="gt-pop" />
            <path d="M160 360 L160 312" fill="none" stroke={STEM_COLOR} strokeWidth="3.5" strokeLinecap="round"
              pathLength={1} className="gt-stem" style={{ animationDelay: '0.55s' }} />
            <g className="gt-pop" style={{ animationDelay: '1.1s' }}>
              <LeafDots y={318} r={9} />
            </g>
          </>
        )}

        {/* つぼみ（bud）：根とタネは退き、茎と葉が育つ */}
        {stage === 'bud' && (
          <>
            <g className="gt-fade-out">
              {ROOT_DOTS.map((d, i) => (
                <circle key={i} cx={d.cx} cy={d.cy} r={5} fill={ROOT_COLOR} />
              ))}
            </g>
            <circle cx="160" cy={SEED_Y} r="16" fill={SEED_COLOR} className="gt-fade-out" />
            <path d="M160 360 L160 296" stroke={STEM_COLOR} strokeWidth="4" strokeLinecap="round"
              pathLength={1} className="gt-stem" style={{ animationDelay: '0.2s' }} />
            <g className="gt-pop" style={{ animationDelay: '0.7s' }}>
              <LeafDots y={302} r={10} />
            </g>
          </>
        )}

        {/* 枝葉とつぼみ（budding） */}
        {stage === 'budding' && (
          <>
            <LeafDots y={302} r={10} />
            <line x1="160" y1={GROUND_LINE_Y} x2="160" y2="296" stroke={STEM_COLOR} strokeWidth="4" strokeLinecap="round" />
            <path d="M160 296 L160 240" stroke={STEM_COLOR} strokeWidth="4" strokeLinecap="round"
              pathLength={1} className="gt-stem" style={{ animationDelay: '0.2s' }} />
            <g className="gt-pop" style={{ animationDelay: '0.6s' }}>
              <LeafDots y={248} r={12} />
            </g>
            <circle cx="160" cy="232" r="17" fill={LEAF_COLOR} className="gt-pop" style={{ animationDelay: '1.1s' }} />
          </>
        )}

        {/* 開花（bloom）：丸ひとつ＋やわらかな光で表現する */}
        {showBloom && (
          <>
            <line x1="160" y1={GROUND_LINE_Y} x2="160" y2="200" stroke={STEM_COLOR} strokeWidth="5" strokeLinecap="round" />
            <g className="gt-pop">
              <LeafDots y={302} r={10} />
              <LeafDots y={248} r={12} />
            </g>
            <g className="gt-bloom-group">
              <circle cx="160" cy="190" r="58" fill={BLOOM_GLOW} className="gt-glow" />
              <circle cx="160" cy="190" r="42" fill={BLOOM_COLOR} />
            </g>
          </>
        )}
      </svg>
    </div>
  )
}
