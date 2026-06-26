'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { NEGATIVE, POSITIVE, withAlpha } from '@/src/styles/colors'
import BubbleDetailModal from '@/src/components/BubbleDetailModal'
import { useNetworkData } from './useNetworkData'
import { radiusForNode, useForceLayout } from './useForceLayout'
import type { SimNode } from './types'

const GRAPH_HEIGHT = 460
const FRIEND_COLOR = '#4A7C59'

function nodeFill(node: SimNode): string {
  if (node.kind === 'self') return '#3B2F1E'
  if (node.kind === 'person') return FRIEND_COLOR
  return node.type === 'light' ? POSITIVE.base : NEGATIVE.base
}

function nodeBorder(node: SimNode): string {
  if (node.kind === 'self') return '#3B2F1E'
  if (node.kind === 'person') return FRIEND_COLOR
  return node.type === 'light' ? POSITIVE.deep : NEGATIVE.deep
}

function linkColor(kind: string): string {
  if (kind === 'person-thought') return withAlpha(POSITIVE.base, 0.35)
  return 'rgba(59,47,30,0.18)'
}

export default function NetworkGraph() {
  const router = useRouter()
  const { data, loading } = useNetworkData()
  const [width, setWidth] = useState(0)
  const nodes = useForceLayout(data, width, GRAPH_HEIGHT)
  const [selectedThought, setSelectedThought] = useState<{ tagId: string; tagText: string; tagType: 'light' | 'shadow' } | null>(null)

  if (loading) {
    return (
      <p style={{ textAlign: 'center', padding: '48px 24px', fontSize: 13, color: '#A09070' }}>
        読み込み中...
      </p>
    )
  }

  // 自分以外に1つでもノードがあるか（data===nullの場合もここでまとめて弾く）
  if (!data || data.nodes.length <= 1) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: '#A09070', fontSize: 14 }}>
        <p>まだつながりがありません</p>
        <p style={{ fontSize: 12, marginTop: 8 }}>
          PositiveやNegativeのルームで話しかけたり、タグを増やしてみよう
        </p>
      </div>
    )
  }

  const byId = new Map(nodes.map(n => [n.id, n]))

  return (
    <>
    <div
      ref={el => { if (el) setWidth(el.clientWidth) }}
      style={{ position: 'relative', width: '100%', height: GRAPH_HEIGHT, overflow: 'hidden' }}
    >
      {/* リンク */}
      <svg
        width={width} height={GRAPH_HEIGHT}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {data.links.map((link, i) => {
          const s = byId.get(link.source)
          const t = byId.get(link.target)
          if (!s || !t) return null
          return (
            <line
              key={i}
              x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke={linkColor(link.kind)}
              strokeWidth={link.kind === 'person-thought' ? 1.5 : 1}
            />
          )
        })}
      </svg>

      {/* ノード */}
      {nodes.map(node => {
        const r = radiusForNode(node)
        const label = node.kind === 'thought' ? `#${node.text.replace(/^#+/, '')}` : node.username
        return (
          <div
            key={node.id}
            onClick={() => {
              if (node.kind === 'person') router.push(`/room/friend/chat?friendId=${node.id}`)
              if (node.kind === 'thought') setSelectedThought({ tagId: node.id, tagText: node.text, tagType: node.type })
            }}
            style={{
              position: 'absolute',
              left: node.x, top: node.y,
              transform: 'translate(-50%, -50%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              cursor: node.kind === 'self' ? 'default' : 'pointer',
              width: r * 2 + 40,
            }}
          >
            <div style={{
              width: r * 2, height: r * 2, borderRadius: '50%',
              background: nodeFill(node),
              border: `2px solid ${nodeBorder(node)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            }}>
              {node.kind !== 'thought' && node.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={node.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : node.kind !== 'thought' ? (
                <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: Math.max(11, r * 0.55) }}>
                  {node.username[0]?.toUpperCase() ?? '?'}
                </span>
              ) : null}
            </div>
            <span style={{
              fontSize: 9.5, fontWeight: 600, color: 'rgba(59,47,30,0.55)',
              maxWidth: r * 2 + 36, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textAlign: 'center',
            }}>
              {label}
            </span>
            {node.kind === 'thought' && node.sharedCount > 0 && (
              <span style={{ fontSize: 8.5, color: 'rgba(59,47,30,0.4)' }}>
                同じ気持ちの人 {node.sharedCount}人
              </span>
            )}
          </div>
        )
      })}
    </div>

    {selectedThought && (
      <BubbleDetailModal
        tagId={selectedThought.tagId}
        tagText={selectedThought.tagText}
        tagType={selectedThought.tagType}
        onClose={() => setSelectedThought(null)}
      />
    )}
    </>
  )
}
