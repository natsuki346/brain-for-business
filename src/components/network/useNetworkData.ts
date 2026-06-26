'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase/client'
import { getTagCounts } from '@/src/lib/supabase/tagCounts'
import type { NetworkData, NetworkLink, PersonNode, ThoughtNode } from './types'

const MAX_PERSON_NODES  = 12
const MAX_THOUGHT_NODES = 20

type UserRow = { id: string; username: string; avatar_url: string | null }
type ConnectionRow = { requester_id: string; receiver_id: string }
type TagRow = { id: string; text: string; type: 'light' | 'shadow'; growth_point: number; user_id?: string }

function levelFromMessageCount(count: number): 1 | 2 | 3 {
  if (count >= 30) return 3
  if (count >= 10) return 2
  return 1
}

/**
 * ネットワーク図に必要なデータ（自分・人物ノード・思考ノード・リンク）を取得する。
 * すべて既存パターン（FriendRoomView/garden-displayの友達取得、rooms.tsのタグ問い合わせ方式、
 * tagCounts.tsの集計）をクライアントから直接Supabaseに問い合わせる形で再利用する。
 *
 * プライバシー方針：person-thoughtリンク（友達と自分を思考ノード経由で結ぶ表現）は
 * Positive（light）タグのみを対象とする。Negative（shadow）タグは悩みなど機微な内容を
 * 含むため、特定の相手と結びつけて開示することはしない（自分ノードへの接続のみ）。
 * 代わりにgetTagCountsによる匿名の集計数を全タグに付与する。
 */
export function useNetworkData() {
  const [data, setData] = useState<NetworkData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const userId = sessionStorage.getItem('user_id')
      if (!userId) { setLoading(false); return }

      // ── 自分のプロフィール ──
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const selfRes = await (supabase.from('users') as any)
        .select('id, username, avatar_url')
        .eq('id', userId)
        .single()
      const self = selfRes.data as UserRow | null
      if (!self) { setLoading(false); return }

      // ── 友達（つながり）+ 1:1メッセージ数 ──
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [connRes, msgRes, tagsRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('connections') as any)
          .select('requester_id, receiver_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('friend_messages') as any)
          .select('sender_id, receiver_id')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('tags') as any)
          .select('id, text, type, growth_point')
          .eq('user_id', userId)
          .eq('is_active', true),
      ])

      const connections: ConnectionRow[] = connRes.data ?? []
      const friendIds = connections.map((c: ConnectionRow) =>
        c.requester_id === userId ? c.receiver_id : c.requester_id,
      )

      const msgCounts = new Map<string, number>()
      for (const msg of (msgRes.data ?? []) as { sender_id: string; receiver_id: string }[]) {
        const fid = msg.sender_id === userId ? msg.receiver_id : msg.sender_id
        msgCounts.set(fid, (msgCounts.get(fid) ?? 0) + 1)
      }

      // 関係が深い（メッセージ数が多い）順に上位MAX_PERSON_NODES件
      const topFriendIds = [...friendIds]
        .sort((a, b) => (msgCounts.get(b) ?? 0) - (msgCounts.get(a) ?? 0))
        .slice(0, MAX_PERSON_NODES)

      let friendUsers: UserRow[] = []
      if (topFriendIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const usersRes = await (supabase.from('users') as any)
          .select('id, username, avatar_url')
          .in('id', topFriendIds)
        friendUsers = (usersRes.data ?? []) as UserRow[]
      }

      const personNodes: PersonNode[] = friendUsers.map(u => ({
        kind: 'person',
        id: u.id,
        username: u.username,
        avatarUrl: u.avatar_url,
        level: levelFromMessageCount(msgCounts.get(u.id) ?? 0),
      }))

      // ── 自分の思考（タグ）：growth_pointが高い順に上位MAX_THOUGHT_NODES件 ──
      const ownTags = ((tagsRes.data ?? []) as TagRow[])
        .sort((a, b) => (b.growth_point ?? 0) - (a.growth_point ?? 0))
        .slice(0, MAX_THOUGHT_NODES)

      // 匿名の集計数（Positive/Negativeどちらも対象。個人を特定しない）
      const counts = await getTagCounts(ownTags.map(t => t.text))

      const thoughtNodes: ThoughtNode[] = ownTags.map(t => ({
        kind: 'thought',
        id: t.id,
        text: t.text,
        type: t.type,
        growthPoint: t.growth_point ?? 0,
        sharedCount: counts[t.text.replace(/^#+/, '')] ?? 0,
      }))

      // ── person-thoughtリンク（Positiveタグのみ）：上位友達がそのタグも持っているか判定 ──
      const lightTags = ownTags.filter(t => t.type === 'light')
      const personThoughtLinks: NetworkLink[] = []

      if (lightTags.length > 0 && topFriendIds.length > 0) {
        const texts = lightTags.flatMap(t => {
          const stripped = t.text.replace(/^#+/, '')
          return [stripped, `#${stripped}`]
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matchRes = await (supabase.from('tags') as any)
          .select('text, user_id')
          .eq('type', 'light')
          .eq('is_active', true)
          .in('text', texts)
          .in('user_id', topFriendIds)

        const matches = (matchRes.data ?? []) as { text: string; user_id: string }[]
        for (const tag of lightTags) {
          const stripped = tag.text.replace(/^#+/, '')
          const owners = matches.filter(m => m.text.replace(/^#+/, '') === stripped)
          for (const owner of owners) {
            personThoughtLinks.push({ kind: 'person-thought', source: owner.user_id, target: tag.id })
          }
        }
      }

      const links: NetworkLink[] = [
        ...personNodes.map(p => ({ kind: 'self-person' as const, source: self.id, target: p.id })),
        ...thoughtNodes.map(t => ({ kind: 'self-thought' as const, source: self.id, target: t.id })),
        ...personThoughtLinks,
      ]

      if (!cancelled) {
        setData({
          nodes: [
            { kind: 'self', id: self.id, username: self.username, avatarUrl: self.avatar_url },
            ...personNodes,
            ...thoughtNodes,
          ],
          links,
        })
        setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [])

  return { data, loading }
}
