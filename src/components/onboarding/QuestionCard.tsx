'use client'

import { useEffect, useRef, useState } from 'react'
import { NEGATIVE, POSITIVE } from '@/src/styles/colors'
import { getTagCounts } from '@/src/lib/supabase/tagCounts'

// AI生成タグの呼び出し先（Supabase Edge Functions）。
// Next.js API Routesは静的書き出し（output: 'export'）と相性が悪いため、
// ここはNext.jsの外（Supabase Edge Function）に出している。
const EDGE_FUNCTIONS_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
// Edge FunctionsはデフォルトでJWT検証が有効なため、匿名キーをBearerトークンとして送る
// （supabase-jsクライアントが内部で行っているのと同じ仕組み）
const EDGE_FUNCTION_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
}

type Props = {
  questionNumber:   number
  totalQuestions:   number
  questionText:     string
  exampleTags?:     string[]  // 初回生成前に候補タグとして表示しておく例タグ
  addButtonText?:   string   // タグ追加ボタンのラベル（デフォルト: '+ これ自分！'）
  onComplete:       (positive: string[], negative: string[]) => void
}

// ── メインコンポーネント ────────────────────────────────────────────────────────

export function QuestionCard({
  questionNumber,
  totalQuestions,
  questionText,
  exampleTags = [],
  addButtonText = '+ これ自分！',
  onComplete,
}: Props) {
  const [text,           setText]           = useState('')
  // AIが生成したタグ。空の間は固定の例タグ（exampleTags）を表示し、
  // 生成が完了したらこちらだけを表示する（例タグは隠す）
  const [generatedTags,  setGeneratedTags]  = useState<string[]>([])
  const [registeredTags, setRegisteredTags] = useState<string[]>([])
  const [isGenerating,   setIsGenerating]   = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [showAll,        setShowAll]        = useState(false)
  const [suggestedTags,  setSuggestedTags]  = useState<Set<string>>(new Set())
  const [positiveTagSet, setPositiveTagSet] = useState<Set<string>>(new Set())
  // AIが生成・提案した候補タグごとの「既に持っている人数」（textを#なしに正規化したものをキーにする）
  const [tagCounts,      setTagCounts]      = useState<Record<string, number>>({})

  const displayTags = generatedTags.length > 0 ? generatedTags : exampleTags

  const suggestChainCount = useRef(0)

  const MAX_VISIBLE      = 10
  const MAX_SUGGEST_CHAIN = 3
  const isLight     = questionNumber <= 2   // Q1・Q2 = 地上、Q3・Q4 = 地下

  // 質問グループ別カラーテーマ
  const c = {
    pageBg:             '#FFFFFF',
    progress:           'rgba(0,0,0,0.4)',
    questionText:       '#111111',
    tagBg:              '#1A1A1A',
    tagColor:           '#FFFFFF',
    overflowBg:         'rgba(0,0,0,0.08)',
    overflowColor:      '#333333',
    candidateLabel:     'rgba(0,0,0,0.4)',
    candidateRowAdded:  'rgba(0,0,0,0.03)',
    candidateRowNormal: 'rgba(0,0,0,0.06)',
    tagTextAdded:       'rgba(0,0,0,0.25)',
    tagTextNormal:      '#222222',
    addBtnAdded:        'rgba(0,0,0,0.07)',
    addBtnAddedText:    'rgba(0,0,0,0.2)',
    addBorderNormal:    POSITIVE.base,
    addTextNormal:      POSITIVE.text,
    genBorderActive:    POSITIVE.base,
    genTextActive:      POSITIVE.text,
    genBorderInactive:  'rgba(0,0,0,0.15)',
    genTextInactive:    'rgba(0,0,0,0.28)',
    nextBorderActive:   POSITIVE.base,
    nextTextActive:     POSITIVE.text,
    nextBorderInactive: 'rgba(0,0,0,0.15)',
    nextTextInactive:   'rgba(0,0,0,0.28)',
    textareaBg:         'rgba(0,0,0,0.04)',
    textareaBorder:     'rgba(0,0,0,0.10)',
    candidateCount:     'rgba(0,0,0,0.35)',
  }

  // 表示中の候補タグ（生成済み or 例タグ）が更新されるたびに既に持っている人数を取得する。
  // 取得が遅れても画面はブロックしない（未取得の間はその行を表示しないだけ）。
  useEffect(() => {
    if (displayTags.length === 0) { setTagCounts({}); return }
    let cancelled = false
    ;(async () => {
      const counts = await getTagCounts(displayTags)
      if (!cancelled) setTagCounts(counts)
    })()
    return () => { cancelled = true }
  }, [generatedTags, exampleTags])

  const handleGenerate = async () => {
    if (!text.trim() || isGenerating) return
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch(`${EDGE_FUNCTIONS_BASE}/generate-tags`, {
        method: 'POST',
        headers: EDGE_FUNCTION_HEADERS,
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'エラーが発生しました')
      const positive: string[] = data.positive ?? []
      const negative: string[] = data.negative ?? []
      const all = [...positive, ...negative]
      setPositiveTagSet(prev => new Set([...prev, ...positive]))
      setGeneratedTags(prev => [...prev, ...all.filter(t => !prev.includes(t))])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setIsGenerating(false)
    }
  }

  const addTag = (tag: string) => {
    if (registeredTags.includes(tag)) return
    const updated = [...registeredTags, tag]
    setRegisteredTags(updated)
    fetchSuggestions(updated)
  }

  // 選択タグから連想される新しいタグをバックグラウンドで取得し、
  // 生成されたタグリストの末尾にそっと追加する（最大3連鎖）
  const fetchSuggestions = async (selected: string[]) => {
    if (suggestChainCount.current >= MAX_SUGGEST_CHAIN) return
    suggestChainCount.current += 1

    try {
      const res = await fetch(`${EDGE_FUNCTIONS_BASE}/suggest-tags`, {
        method: 'POST',
        headers: EDGE_FUNCTION_HEADERS,
        body: JSON.stringify({ selectedTags: selected }),
      })
      const data = await res.json()
      const positiveSuggestions: string[] = data.positive ?? []
      const negativeSuggestions: string[] = data.negative ?? []
      const suggestions = [...positiveSuggestions, ...negativeSuggestions]

      setGeneratedTags(prev => {
        const additions = suggestions.filter(t => !prev.includes(t) && !selected.includes(t))
        if (additions.length === 0) return prev
        setSuggestedTags(prevSet => new Set([...prevSet, ...additions]))
        const positiveAdditions = positiveSuggestions.filter(t => !prev.includes(t) && !selected.includes(t))
        if (positiveAdditions.length > 0) {
          setPositiveTagSet(prevSet => new Set([...prevSet, ...positiveAdditions]))
        }
        return [...prev, ...additions]
      })
    } catch {
      // サジェスト失敗は握りつぶす（UIには何も表示しない）
    }
  }

  const removeRegistered = (tag: string) => {
    setRegisteredTags(prev => prev.filter(t => t !== tag))
  }

  const handleNext = () => {
    if (registeredTags.length === 0) return
    const positive = registeredTags.filter(t => positiveTagSet.has(t))
    const negative = registeredTags.filter(t => !positiveTagSet.has(t))
    onComplete(positive, negative)
  }

  const handleSkip = () => {
    setRegisteredTags([])
    onComplete([], [])
  }

  const visibleTags   = showAll ? registeredTags : registeredTags.slice(0, MAX_VISIBLE)
  const overflowCount = registeredTags.length - MAX_VISIBLE

  return (
    <div
      className="px-6 pt-12 pb-10"
      style={{ minHeight: '100svh', overflowY: 'auto', position: 'relative', background: c.pageBg, maxWidth: 390, width: '100%', margin: '0 auto' }}
    >
      {/* ── スキップ ── */}
      <button
        onClick={handleSkip}
        className="absolute"
        style={{
          top: 8, right: 8, zIndex: 2,
          padding: '8px 12px',
          fontSize: 13, color: '#777777',
          background: 'none', border: 'none', textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        スキップ
      </button>

      <div style={{ maxWidth: 390, width: '100%', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Progress */}
        <p className="text-xs mb-6 tracking-widest uppercase" style={{ color: c.progress }}>
          {questionNumber} / {totalQuestions}
        </p>

        {/* Question */}
        <div className="mb-8 text-center" style={{ maxWidth: 320 }}>
          <div className="text-center">
            {questionText.split('\n').map((line, i) => (
              <p key={i} className="text-base font-bold leading-relaxed" style={{ color: c.questionText }}>
                {line}
              </p>
            ))}
          </div>
        </div>

        {/* ── Textarea ── */}
        <textarea
          value={text}
          onChange={e => {
            const next = e.target.value
            setText(next)
            // 入力が空になったら、生成済みタグをクリアして固定の例タグ表示に戻す
            if (!next.trim() && generatedTags.length > 0) setGeneratedTags([])
          }}
          placeholder="ここに書いてみてください..."
          rows={4}
          className="w-full rounded-2xl text-sm p-4 outline-none resize-none mb-4 placeholder:text-black/25"
          style={{
            background: c.textareaBg,
            border: `1px solid ${c.textareaBorder}`,
            color: c.questionText,
            transition: 'border-color 0.2s ease',
          }}
        />

        {/* ── Generate button ── */}
        <button
          onClick={handleGenerate}
          disabled={!text.trim() || isGenerating}
          className="w-full py-3.5 rounded-full text-sm font-semibold mb-2.5 transition-all"
          style={{
            background: '#FFFFFF',
            border: `2px solid ${text.trim() && !isGenerating ? c.genBorderActive : c.genBorderInactive}`,
            color:      text.trim() && !isGenerating ? c.genTextActive : c.genTextInactive,
            cursor:     text.trim() && !isGenerating ? 'pointer'      : 'default',
          }}
        >
          {isGenerating ? '生成中...' : 'タグを生成する'}
        </button>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-xs mb-2.5 text-center">{error}</p>
        )}

        {/* ── Next button ── */}
        <button
          onClick={handleNext}
          disabled={registeredTags.length === 0}
          className="w-full py-4 rounded-full text-sm font-semibold mb-6 transition-all"
          style={{
            background: '#FFFFFF',
            border: `2px solid ${registeredTags.length > 0 ? c.nextBorderActive : c.nextBorderInactive}`,
            color:      registeredTags.length > 0 ? c.nextTextActive : c.nextTextInactive,
            cursor:     registeredTags.length > 0 ? 'pointer'       : 'default',
          }}
        >
          次へ
        </button>

        {/* ── Registered tags ── */}
        {registeredTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {visibleTags.map(tag => (
              <button
                key={tag}
                onClick={() => removeRegistered(tag)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ background: c.tagBg, color: c.tagColor }}
              >
                {tag}
                <span className="text-xs opacity-40 ml-0.5">×</span>
              </button>
            ))}
            {!showAll && overflowCount > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ background: c.overflowBg, color: c.overflowColor }}
              >
                +{overflowCount}
              </button>
            )}
          </div>
        )}

        {/* ── Candidate tags ── */}
        {displayTags.length > 0 && (
          <div className="mb-6">
            <p className="text-xs mb-3" style={{ color: c.candidateLabel }}>{generatedTags.length > 0 ? '生成されたタグ' : '例）'}</p>
            <div className="flex flex-col gap-2">
              {displayTags.map(tag => {
                const added = registeredTags.includes(tag)
                const count = tagCounts[tag.replace(/^#+/, '')] ?? 0
                return (
                  <div
                    key={tag}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl ${suggestedTags.has(tag) ? 'animate-fadeIn' : ''}`}
                    style={{ background: added ? c.candidateRowAdded : c.candidateRowNormal }}
                  >
                    <div className="flex flex-col" style={{ minWidth: 0 }}>
                      <span
                        className="text-sm font-medium"
                        style={{ color: added ? c.tagTextAdded : c.tagTextNormal }}
                      >
                        {tag}
                      </span>
                      {count > 0 && (
                        <span
                          className="text-[10px] leading-tight"
                          style={{ color: c.candidateCount, marginTop: 2 }}
                        >
                          同じ気持ちの人 {count}人
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => addTag(tag)}
                      disabled={added}
                      className="flex items-center justify-center h-7 rounded-full text-xs font-semibold transition-all flex-shrink-0"
                      style={{
                        background: added ? c.addBtnAdded : '#FFFFFF',
                        border:     added ? 'none' : `1.5px solid ${c.addBorderNormal}`,
                        color:      added ? c.addBtnAddedText : c.addTextNormal,
                        cursor:     added ? 'default'         : 'pointer',
                        padding: '0 10px',
                        minWidth: 28,
                      }}
                    >
                      {added ? '✓' : addButtonText}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
