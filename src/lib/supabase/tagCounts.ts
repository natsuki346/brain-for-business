import { supabase } from './client'

/**
 * 指定したタグ群について、is_active=true なレコードを持つユーザー数（重複なし）を集計する。
 * 同じユーザーが同じテキストのタグを複数回登録していても1人として数える。
 * ジェネラル版・ビジネス版の区別なく、全ユーザーを対象にカウントする。
 * # 有無の揺れを吸収: "存在する" と "#存在する" を同一タグとして扱う。
 */
export async function getTagCounts(tags: string[]): Promise<Record<string, number>> {
  const cleaned = [...new Set(tags.map(t => t.replace(/^#+/, '')).filter(Boolean))]
  if (cleaned.length === 0) return {}

  const variants = cleaned.flatMap(t => [t, `#${t}`])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('tags') as any)
    .select('text, user_id')
    .in('text', variants)
    .eq('is_active', true)

  if (error || !data) return {}

  const usersByTag = new Map<string, Set<string>>()
  for (const row of data as { text: string; user_id: string }[]) {
    const key = row.text.replace(/^#+/, '')
    if (!usersByTag.has(key)) usersByTag.set(key, new Set())
    usersByTag.get(key)!.add(row.user_id)
  }

  const counts: Record<string, number> = {}
  for (const t of cleaned) counts[t] = usersByTag.get(t)?.size ?? 0
  return counts
}
