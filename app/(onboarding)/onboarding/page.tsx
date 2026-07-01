'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QuestionCard } from '@/src/components/onboarding/QuestionCard'
import { supabase } from '@/src/lib/supabase/client'
import { recordTagEvent } from '@/src/lib/supabase/events'
import { useGrowthStage } from '@/src/components/tree/useGrowthStage'
import TagConfirmScreen from '@/src/components/onboarding/TagConfirmScreen'
import { NEGATIVE, POSITIVE } from '@/src/styles/colors'

// Q1〜Q4：AIがpositive/negativeを自動分類する
const QUESTIONS: { text: string; hintTags: string[]; exampleTags: string[] }[] = [
  {
    text: '仕事の中で、気づいたら頼られていることや、\n自然と得意にやれていることはありますか？',
    hintTags: ['#決めたことは最後までやり切れる', '#複雑なことをわかりやすく伝えられる', '#困っている人を見たら放っておけない'],
    exampleTags: [],
  },
  {
    text: '最近、仕事でモヤモヤしていることや、\nなんとなく引っかかっていることはありますか？',
    hintTags: ['#得意なことを活かせていない気がする', '#自分のペースで仕事ができない', '#頑張っても手応えを感じられない'],
    exampleTags: [],
  },
  {
    text: '職場での人との関わりで、うまくいっていると感じることや、\n逆に難しいと感じることはありますか？',
    hintTags: ['#チームの雰囲気を大切にできる', '#上司に本音を話せない', '#本音で話せる同僚がいない'],
    exampleTags: [],
  },
  {
    text: '今の自分の状態について、誰かに正直に話すとしたら\n何を話したいですか？',
    hintTags: ['#将来のキャリアが全く見えない', '#職場での孤独感がずっと続いている', '#自分の悩みをわかってもらえる人がいない気がする'],
    exampleTags: [],
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentIndex,  setCurrentIndex]  = useState(0)
  const [showGrowthOverlay, setShowGrowthOverlay] = useState(false)
  const { setGrowthStage } = useGrowthStage()

  // オンボーディング開始時にチュートリアル表示フラグをリセット（毎回表示）
  useEffect(() => {
    sessionStorage.removeItem('canvas_tutorial_shown_light')
    sessionStorage.removeItem('canvas_tutorial_shown_shadow')
  }, [])
  const [collectedTags, setCollectedTags] = useState<{ positive: string[]; negative: string[] }[]>([])

  const handleComplete = (positive: string[], negative: string[]) => {
    const updated = [...collectedTags, { positive, negative }]
    setCollectedTags(updated)

    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex(prev => prev + 1)
      return
    }

    // ── Q4 完了：全タグを DB に保存 ──────────────────────
    const lightTags  = updated.flatMap(q => q.positive)
    const shadowTags = updated.flatMap(q => q.negative)

    // sessionStorage に保存（canvas-light / canvas-shadow ページが参照）
    sessionStorage.setItem('onboarding_tags', JSON.stringify({ lightTags, shadowTags }))

    // DB 保存は fire-and-forget（遷移をブロックしない）
    const userId = sessionStorage.getItem('user_id')
    if (userId) {
      const allTags = [
        ...lightTags.map((text) => ({
          user_id: userId, text: text.replace(/^#+/, ''), type: 'light' as const,
          color:   POSITIVE.pale,
        })),
        ...shadowTags.map((text) => ({
          user_id: userId, text: text.replace(/^#+/, ''), type: 'shadow' as const,
          color:   NEGATIVE.pale,
        })),
      ]
      const insertTags = (rows: unknown[]) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('tags').insert(rows as any).select('id') as any) as Promise<{
          data: { id: string }[] | null
          error: { message: string } | null
        }>

      insertTags(allTags).then(result => {
        if (result.error) { console.error('tags save failed:', result.error.message); return }
        result.data?.forEach(row => recordTagEvent(row.id, userId, 'registered'))
      })
    }

    // 農園トップへ戻った際にルーム誘導チュートリアルが始まるようにステップを進める
    localStorage.setItem('whyme_tutorial_step', 'room_nav_arrow')

    setGrowthStage('sprout')
    setShowGrowthOverlay(true)
  }

  if (showGrowthOverlay) {
    const lightTags  = collectedTags.flatMap(q => q.positive)
    const shadowTags = collectedTags.flatMap(q => q.negative)
    return <TagConfirmScreen lightTags={lightTags} shadowTags={shadowTags} />
  }

  return (
    <QuestionCard
      key={currentIndex}
      questionNumber={currentIndex + 1}
      totalQuestions={QUESTIONS.length}
      questionText={QUESTIONS[currentIndex].text}
      hintTags={QUESTIONS[currentIndex].hintTags}
      exampleTags={QUESTIONS[currentIndex].exampleTags}
      onComplete={handleComplete}
    />
  )
}
