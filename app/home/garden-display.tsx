'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase/client'
import BubbleDetailModal from '@/src/components/BubbleDetailModal'
import HelpModal from '@/src/components/HelpModal'
import DaisyBubble from '@/src/components/DaisyBubble'
import { NEGATIVE, POSITIVE, withAlpha } from '@/src/styles/colors'
import { forceCollide, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force'

type LightTag  = { id: string; text: string; growth_point: number; position_x?: number | null; position_y?: number | null }
type ShadowTag = { id: string; text: string; growth_point: number; seed_weight: string | null; stage: string | null; position_x?: number | null; position_y?: number | null }
type FriendBubble = {
  id: string              // friend の user ID
  text: string            // username（表示・key用）
  username: string
  avatarUrl: string | null
  msgCount: number
  level: 1 | 2 | 3
  position_x?: number | null
  position_y?: number | null
}
type AnyTag    = LightTag | ShadowTag | FriendBubble
type TabType   = 'light' | 'shadow' | 'friend'

const BASE_FRIEND_SIZE = 68
const FRIEND_LEVEL_SIZES: Record<1 | 2 | 3, number> = {
  1: BASE_FRIEND_SIZE,
  2: Math.round(BASE_FRIEND_SIZE * 1.2),
  3: Math.round(BASE_FRIEND_SIZE * 1.4),
}
const FRIEND_LEVEL_COLORS: Record<1 | 2 | 3, { bg: string; text: string }> = {
  1: { bg: '#EEEEEE', text: '#444444' },
  2: { bg: '#E0E0E0', text: '#333333' },
  3: { bg: '#D0D0D0', text: '#1A1A1A' },
}

// growth_point に応じて青→紫→赤へ滑らかに変化する背景色
// 最大値は HEAVY_THRESHOLDS の上限（growthPoint.ts 参照）
const NEGATIVE_MAX_GROWTH = 60

function lerpRgb(c1: [number, number, number], c2: [number, number, number], t: number): string {
  return `rgb(${Math.round(c1[0]+(c2[0]-c1[0])*t)},${Math.round(c1[1]+(c2[1]-c1[1])*t)},${Math.round(c1[2]+(c2[2]-c1[2])*t)})`
}
function hexToRgbArr(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function negativeGrowthBubbleColor(growthPoint: number): string {
  const t      = Math.min(1, Math.max(0, (growthPoint ?? 0) / NEGATIVE_MAX_GROWTH))
  const blue   = hexToRgbArr(NEGATIVE.base)                 // #3B82F6
  const purple: [number, number, number] = [139, 92, 246]   // #8B5CF6
  const red    = hexToRgbArr(POSITIVE.base)                 // #EF4444
  if (t <= 0.5) return lerpRgb(blue, purple, t * 2)
  return lerpRgb(purple, red, (t - 0.5) * 2)
}

const BASE_SEED_SIZE  = 68
const BASE_DAISY_SIZE = 52
const MAX_BUBBLE_SIZE = 100
// 通常タグの満開ライン（growthPoint.ts の LIGHT_THRESHOLDS 最大値）に合わせて
// この点数でバブルが最大サイズに達するようにする
const POINT_SIZE_CAP = 30

function clamp(v: number, min: number, max: number) { return Math.min(Math.max(v, min), max) }

// growth_point に応じてバブルサイズを base〜MAX_BUBBLE_SIZE の範囲で滑らかに大きくする。
// ルームを訪れる（ポイントが入る）たびに少しずつ膨らんでいく。
function sizeFromPoints(growthPoint: number, base: number): number {
  const ratio = clamp(growthPoint, 0, POINT_SIZE_CAP) / POINT_SIZE_CAP
  return Math.round(base + (MAX_BUBBLE_SIZE - base) * ratio)
}

function getSeedSize(growthPoint: number): number {
  return sizeFromPoints(growthPoint, BASE_SEED_SIZE)
}

function getDaisySize(growthPoint: number): number {
  return sizeFromPoints(growthPoint, BASE_DAISY_SIZE)
}

function getConsecutiveDays(dates: string[]): number {
  if (!dates.length) return 0
  const days = [...new Set(dates.map(d => d.slice(0, 10)))].sort().reverse()
  const today = new Date().toISOString().slice(0, 10)
  if (days[0] !== today) return 0
  let count = 1
  for (let i = 0; i < days.length - 1; i++) {
    const diff = (new Date(days[i]).getTime() - new Date(days[i + 1]).getTime()) / 86400000
    if (diff === 1) count++
    else break
  }
  return count
}

const BUBBLE_TOP_OFFSET = 24

// ── d3-force によるバブル配置 ──
// growth_point が高いタグほど中心に引き寄せられる重み付きシミュレーション。
// forceX / forceY の strength を growth_point に比例させることで、
// 成長したバブルが自然に中央にクラスタリングされる。
interface ForceNode extends SimulationNodeDatum {
  x: number; y: number; r: number; gp: number
}

function simulatePositions(
  w: number,
  sizes: number[],
  growthPoints: number[],
  topOffset: number = BUBBLE_TOP_OFFSET,
): Array<{ x: number; y: number }> {
  const count = sizes.length
  if (count === 0 || w === 0) return []

  const cx0 = w / 2
  const totalArea = sizes.reduce((s, d) => s + Math.PI * (d / 2) ** 2, 0)
  const simH = topOffset + Math.max(300, (totalArea * 2.2) / w)
  const cy0 = topOffset + (simH - topOffset) * 0.45

  // 決定論的な初期配置（インデックスに基づくリング状散布）
  const nodes: ForceNode[] = sizes.map((size, i) => {
    const angle = (2 * Math.PI * i) / Math.max(1, count)
    const ir = Math.min(w / 6, 70)
    return {
      x: cx0 + ir * Math.cos(angle),
      y: cy0 + ir * Math.sin(angle),
      r: size / 2,
      gp: growthPoints[i] ?? 0,
    }
  })

  // growth_point に比例した中心引力（gp=0→弱い引力、MAX_GP→強い引力）
  const MAX_GP = 60
  const MIN_STR = 0.02
  const MAX_STR = 0.65
  const strengthFn = (d: ForceNode) =>
    MIN_STR + (MAX_STR - MIN_STR) * Math.min(d.gp / MAX_GP, 1)

  const simulation = forceSimulation<ForceNode>(nodes)
    .force('collide', forceCollide<ForceNode>(d => d.r + 2).strength(1).iterations(3))
    .force('x', forceX<ForceNode>(cx0).strength(strengthFn))
    .force('y', forceY<ForceNode>(cy0).strength(strengthFn))
    .stop()

  // 境界制約を各tick後に適用（左右端・上端を拘束、下方向は自由に伸ばす）
  const MARGIN = 10
  for (let tick = 0; tick < 300; tick++) {
    simulation.tick()
    for (const n of nodes) {
      n.x = Math.max(n.r + MARGIN, Math.min(w - n.r - MARGIN, n.x))
      n.y = Math.max(topOffset + n.r + MARGIN, n.y)
    }
  }

  return nodes.map(n => ({ x: n.x - n.r, y: n.y - n.r }))
}

// canvasH は positions から動的に算出するため定数不要

export default function GardenDisplay() {
  const router = useRouter()

  const [tab, setTab]                   = useState<TabType>('light')
  const [lightTags, setLightTags]       = useState<LightTag[]>([])
  const [shadowTags, setShadowTags]     = useState<ShadowTag[]>([])
  const [friendBubbles, setFriendBubbles] = useState<FriendBubble[]>([])
  const [eventCount, setEventCount]     = useState(0)
  const [consecutiveDays, setConsecutiveDays] = useState(0)
  const [loading, setLoading]           = useState(true)
  const [visible, setVisible]           = useState(false)
  const [containerW, setContainerW]     = useState(330)
  const [pan, setPan]                   = useState({ x: 0, y: 0 })

  const [selectedBubble, setSelectedBubble] = useState<{ tagId: string; tagText: string; tagType: 'light' | 'shadow' } | null>(null)

  const [pulseTagIds, setPulseTagIds]               = useState<Set<string>>(new Set())
  const [showHelp, setShowHelp]                             = useState(false)

  // ドラッグ用 ref
  const dragRef    = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  const isDragging = useRef(false)

  // ポイントで育って一回り大きくなったバブルに「膨らみ」アニメーションを付ける
  const pulseTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const triggerGrowthPulse = (tagId: string) => {
    setPulseTagIds(prev => new Set(prev).add(tagId))
    const existing = pulseTimers.current.get(tagId)
    if (existing) clearTimeout(existing)
    pulseTimers.current.set(tagId, setTimeout(() => {
      setPulseTagIds(prev => {
        if (!prev.has(tagId)) return prev
        const next = new Set(prev)
        next.delete(tagId)
        return next
      })
      pulseTimers.current.delete(tagId)
    }, 700))
  }
  useEffect(() => {
    return () => { pulseTimers.current.forEach(t => clearTimeout(t)) }
  }, [])

  // ── データフェッチ ──
  useEffect(() => {
    const userId = sessionStorage.getItem('user_id')
    if (!userId) { setLoading(false); return }
    ;(async () => {
      const [tagsRes, eventsRes] = await Promise.all([
        (supabase.from('tags') as any)
          .select('id, text, type, growth_point, seed_weight, stage, position_x, position_y')
          .eq('user_id', userId).eq('is_active', true),
        (supabase.from('tag_events') as any)
          .select('created_at').eq('user_id', userId),
      ])
      if (tagsRes.data) {
        const newLight  = tagsRes.data.filter((t: any) => t.type === 'light')
        const newShadow = tagsRes.data.filter((t: any) => t.type === 'shadow')
        setLightTags(newLight)
        setShadowTags(newShadow)

        // 前回ガーデンを見た時より育っているバブルには「膨らみ」アニメーションを付ける
        // （初回訪問時は比較対象がないので発火させず、基準値の記録のみ行う）
        for (const t of [...newLight, ...newShadow] as { id: string; growth_point: number }[]) {
          const seenKey = `bubble_seen_gp_${t.id}`
          const seenGp  = Number(sessionStorage.getItem(seenKey) ?? 'NaN')
          const curGp   = t.growth_point ?? 0
          if (!isNaN(seenGp) && curGp > seenGp) {
            setTimeout(() => triggerGrowthPulse(t.id), 500)
          }
          sessionStorage.setItem(seenKey, String(curGp))
        }
      }
      if (eventsRes.data) {
        setEventCount(eventsRes.data.length)
        setConsecutiveDays(getConsecutiveDays(eventsRes.data.map((e: any) => e.created_at as string)))
      }
      setLoading(false)
    })()
  }, [])

  // ── Friend バブルフェッチ ──
  useEffect(() => {
    const userId = sessionStorage.getItem('user_id')
    if (!userId) return
    ;(async () => {
      // accepted な繋がりを取得
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [connRes, msgRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('connections') as any)
          .select('requester_id, receiver_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('friend_messages') as any)
          .select('sender_id, receiver_id')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
      ])

      const connections: { requester_id: string; receiver_id: string }[] = connRes.data ?? []
      const friendIds = connections.map(c =>
        c.requester_id === userId ? c.receiver_id : c.requester_id,
      )
      if (friendIds.length === 0) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usersRes = await (supabase.from('users') as any)
        .select('id, username, avatar_url')
        .in('id', friendIds)

      const usersMap = new Map<string, { username: string; avatar_url: string | null }>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((usersRes.data ?? []) as any[]).map((u: any) => [u.id as string, u]),
      )

      // メッセージ数を friend ごとにカウント
      const msgCounts = new Map<string, number>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const msg of ((msgRes.data ?? []) as any[])) {
        const fid: string = msg.sender_id === userId ? msg.receiver_id : msg.sender_id
        msgCounts.set(fid, (msgCounts.get(fid) ?? 0) + 1)
      }

      const bubbles: FriendBubble[] = friendIds
        .filter(fid => usersMap.has(fid))
        .map(fid => {
          const u     = usersMap.get(fid)!
          const count = msgCounts.get(fid) ?? 0
          const level: 1 | 2 | 3 = count >= 30 ? 3 : count >= 10 ? 2 : 1
          return {
            id: fid,
            text: u.username ?? '?',
            username: u.username ?? '?',
            avatarUrl: u.avatar_url ?? null,
            msgCount: count,
            level,
          }
        })

      setFriendBubbles(bubbles)
    })()
  }, [])

  // ── tagsテーブルのリアルタイム購読（seed_weight/growth_point変化を即時反映） ──
  useEffect(() => {
    const userId = sessionStorage.getItem('user_id')
    if (!userId) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch = (supabase as any)
      .channel('garden-tags-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tags', filter: `user_id=eq.${userId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const updated = payload.new
          if (updated.type === 'shadow') {
            setShadowTags(prev => prev.map(t => {
              if (t.id !== updated.id) return t
              const newGp = updated.growth_point ?? 0
              if (newGp > (t.growth_point ?? 0)) triggerGrowthPulse(t.id)
              return { ...t, growth_point: newGp, seed_weight: String(updated.seed_weight ?? ''), stage: updated.stage ?? null }
            }))
          } else if (updated.type === 'light') {
            setLightTags(prev => prev.map(t => {
              if (t.id !== updated.id) return t
              const newGp = updated.growth_point ?? 0
              if (newGp > (t.growth_point ?? 0)) triggerGrowthPulse(t.id)
              return { ...t, growth_point: newGp }
            }))
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [])

  // ── タブ切替でバブルフェードイン & pan リセット ──
  useEffect(() => {
    setVisible(false)
    setPan({ x: 0, y: 0 })
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [tab])

  const currentTags: AnyTag[] = tab === 'light' ? lightTags : tab === 'shadow' ? shadowTags : friendBubbles
  const totalTags = lightTags.length + shadowTags.length

  const bubbleSizes = useMemo(() => {
    if (tab === 'light')  return lightTags.map(t => getDaisySize(t.growth_point ?? 0))
    if (tab === 'shadow') return shadowTags.map(t => getSeedSize(t.growth_point ?? 0))
    return friendBubbles.map(f => FRIEND_LEVEL_SIZES[f.level])
  }, [tab, lightTags, shadowTags, friendBubbles])

  const positions = useMemo(() => {
    if (containerW === 0) return []
    return simulatePositions(
      containerW,
      bubbleSizes,
      currentTags.map(t => ('growth_point' in t ? (t as LightTag | ShadowTag).growth_point ?? 0 : 0)),
    )
  }, [tab, containerW, bubbleSizes, currentTags])

  // 最も下のバブルの底辺 + 余白
  const canvasH = useMemo(() => {
    if (positions.length === 0) return 460
    const maxBottom = Math.max(...positions.map((p, i) => p.y + (bubbleSizes[i] ?? 52)))
    return maxBottom + 40
  }, [positions, bubbleSizes])

  // ── ドラッグハンドラ ──
  // setPointerCapture はドラッグ開始時にのみ呼ぶ。
  // pointerDown で即キャプチャすると pointerup がコンテナに届いてバブルの click が発火しなくなる。
  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = false
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (Math.hypot(dx, dy) >= 5) {
      if (!isDragging.current) {
        isDragging.current = true
        // ドラッグ確定時にキャプチャ → コンテナ外でも追従できる
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      }
      setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy })
    }
  }

  const onPointerUp = () => { dragRef.current = null }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80, color: 'rgba(0,0,0,0.4)', fontSize: 13 }}>
        読み込み中...
      </div>
    )
  }

  const activeBg   = tab === 'light' ? POSITIVE.pale : tab === 'shadow' ? NEGATIVE.pale : '#E0E0E0'
  const activeText = tab === 'light' ? POSITIVE.text : tab === 'shadow' ? NEGATIVE.text : '#333333'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <style>{`@keyframes bubble-pulse { 0% { transform: scale(1); } 45% { transform: scale(1.25); } 75% { transform: scale(0.95); } 100% { transform: scale(1); } }`}</style>

      {/* ── ヘッダー（タイトル・統計・タブをまとめて最前面に固定） ── */}
      {/* バブル側の座標計算が多少ズレてもヘッダーに重ならないよう、座標ではなく
          スタッキング自体で確実に分離する。z-indexはスタッキングコンテキストの
          兄弟間でのみ比較されるため、このラッパーとバブルエリアは同じ親(この
          コンポーネントのルート)の直下の兄弟である必要がある。背景色がないと
          最前面でもバブルが透けて見えるため、ページ背景色を明示的に敷く。 */}
      <div style={{ position: 'relative', zIndex: 50, background: '#FFFFFF', flexShrink: 0 }}>
        {/* ── タイトル行 ── */}
        <div style={{
          padding: '44px 20px 8px', flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111111', margin: '0 0 2px' }}>
              マイブレイン
            </h1>
            <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', margin: 0 }}>
              タグをタップしてつながりへ
            </p>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            aria-label="ヘルプ"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.15)',
              cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#333333',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 4,
            }}
          >
            ？
          </button>
        </div>

        {/* ── ステータス行 ── */}
        <div style={{ display: 'flex', padding: '10px 20px 14px', flexShrink: 0 }}>
          {[
            { label: '向き合った回数', value: `${eventCount}回` },
            { label: 'タグ数',         value: `${totalTags}個` },
            { label: '連続日数',       value: `${consecutiveDays}日` },
          ].map(({ label, value }, i) => (
            <div key={label} style={{
              flex: 1, textAlign: 'center',
              borderLeft: i > 0 ? '1px solid rgba(0,0,0,0.08)' : 'none',
            }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#111111', margin: 0 }}>{value}</p>
              <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* ── タブ ── */}
        <div style={{ display: 'flex', padding: '0 20px', gap: 8, marginBottom: 12, flexShrink: 0 }}>
          {(['light', 'shadow', 'friend'] as TabType[]).map(t => {
            const tabBorder = t === 'light' ? POSITIVE.base : t === 'shadow' ? NEGATIVE.base : '#888888'
            const tabText = t === 'light' ? POSITIVE.text : t === 'shadow' ? NEGATIVE.text : '#333333'
            const tabLabel = t === 'light' ? 'Positive' : t === 'shadow' ? 'Negative' : 'Friend'
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12,
                  background: '#FFFFFF',
                  border: tab === t ? `2px solid ${tabBorder}` : '1px solid rgba(0,0,0,0.1)',
                  color: tab === t ? tabText : 'rgba(0,0,0,0.4)',
                  fontSize: 13, fontWeight: tab === t ? 700 : 500, cursor: 'pointer',
                  transition: 'background 0.2s ease, color 0.2s ease, border-color 0.2s ease',
                }}
              >
                {tabLabel}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── バブルエリア（ドラッグ可能） ── */}
      {/* ヘッダーラッパー（zIndex:50）より確実に背面（zIndex:0）に固定する。
          個々のバブル要素は明示的なzIndexを持たない（DOM順のautoスタッキングのみ）ため、
          このコンテナのzIndexがそのままバブル全体の階層を決める。 */}
      <div
        ref={el => { if (el) setContainerW(el.clientWidth) }}
        style={{
          flex: 1, position: 'relative', zIndex: 0,
          margin: '0 20px', overflow: 'visible',
          cursor: 'grab', touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* パン用キャンバス */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: containerW, height: canvasH,
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          willChange: 'transform',
        }}>
          {currentTags.length === 0 ? (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)', textAlign: 'center',
            }}>
              <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.3)', margin: 0 }}>
                タグがありません
              </p>
            </div>
          ) : currentTags.map((tag, i) => {
            const isFriend   = tab === 'friend'
            const isPulsing  = !isFriend && pulseTagIds.has(tag.id)
            const baseSize   = bubbleSizes[i] ?? 60
            const size       = baseSize
            const pos        = positions[i] ?? { x: 0, y: 0 }

            let bg: string
            let textColor: string

            if (isFriend) {
              const colors = FRIEND_LEVEL_COLORS[(tag as FriendBubble).level]
              bg = colors.bg; textColor = colors.text
            } else if (tab === 'light') {
              bg = activeBg; textColor = activeText
            } else {
              bg = negativeGrowthBubbleColor((tag as ShadowTag).growth_point ?? 0)
              textColor = '#FFFFFF'
            }

            return (
              <button
                key={tag.id}
                onClick={() => {
                  if (isDragging.current) return
                  if (isFriend) {
                    router.push(`/room/friend/chat?friendId=${tag.id}`)
                  } else {
                    setSelectedBubble({ tagId: tag.id, tagText: tag.text, tagType: tab as 'light' | 'shadow' })
                  }
                }}
                style={{
                  position: 'absolute',
                  left: pos.x, top: pos.y,
                  width: size, height: size,
                  minWidth: size, minHeight: size,
                  borderRadius: '50%',
                  background: tab === 'light' ? 'none' : bg,
                  border: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 2,
                  overflow: 'hidden',
                  boxShadow: isPulsing
                    ? `0 0 20px rgba(0,0,0,0.3), 0 3px 10px rgba(0,0,0,0.1)`
                    : '0 3px 10px rgba(0,0,0,0.1)',
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'scale(1)' : 'scale(0.75)',
                  animation: isPulsing ? 'bubble-pulse 0.7s cubic-bezier(0.34,1.56,0.64,1)' : undefined,
                  transition: `opacity 0.4s ease ${i * 0.12}s, transform 0.4s ease ${i * 0.12}s, width 0.5s ease, height 0.5s ease, background 0.5s ease`,
                  pointerEvents: 'auto',
                  userSelect: 'none',
                }}
              >
                {isFriend ? (() => {
                  const fb       = tag as FriendBubble
                  const avatarSz = Math.round(size * 0.45)
                  return (
                    <>
                      <div style={{
                        width: avatarSz, height: avatarSz, borderRadius: '50%',
                        overflow: 'hidden', flexShrink: 0,
                        background: 'rgba(255,255,255,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: Math.round(avatarSz * 0.5), fontWeight: 700,
                        color: textColor,
                      }}>
                        {fb.avatarUrl
                          ? <img src={fb.avatarUrl} alt={fb.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : fb.username[0]?.toUpperCase() ?? '?'
                        }
                      </div>
                      <span style={{
                        fontSize: clamp(Math.round(size * 0.13), 7, 10),
                        fontWeight: 600, color: textColor,
                        maxWidth: size - 8, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginTop: 2,
                      }}>
                        {fb.username}
                      </span>
                    </>
                  )
                })() : tab === 'light' ? (
                  /* Positive バブル: SVG が背景ごと描画、テキストを下部に重ねる */
                  <>
                    <DaisyBubble size={size} />
                    <span style={{
                      position: 'absolute',
                      left: 4, right: 4, top: 0, bottom: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      textAlign: 'center',
                      fontSize: clamp(Math.round(size * 0.13), 7, 12),
                      fontWeight: 700, color: '#FFFFFF',
                      overflow: 'hidden', lineHeight: 1.3,
                      wordBreak: 'break-all',
                    }}>
                      {tag.text.replace(/^#+/, '')}
                    </span>
                  </>
                ) : (
                  <span style={{
                    fontSize: clamp(Math.round(size * 0.14), 8, 12),
                    fontWeight: 700, color: '#FFFFFF',
                    maxWidth: size - 8, overflow: 'hidden',
                    textAlign: 'center', lineHeight: 1.3,
                    wordBreak: 'break-all',
                    paddingLeft: 4, paddingRight: 4,
                  }}>
                    {tag.text.replace(/^#+/, '')}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── バブル詳細モーダル ── */}
      {selectedBubble && (
        <BubbleDetailModal
          tagId={selectedBubble.tagId}
          tagText={selectedBubble.tagText}
          tagType={selectedBubble.tagType}
          onClose={() => setSelectedBubble(null)}
        />
      )}

      {/* ── ヘルプモーダル ── */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}
