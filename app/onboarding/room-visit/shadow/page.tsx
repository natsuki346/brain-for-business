'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RoomCardList from '@/app/room/RoomCardList'
import GrowthTransitionOverlay from '@/src/components/tree/GrowthTransitionOverlay'
import WhyModal from '@/src/components/onboarding/WhyModal'
import GardenDisplay from '@/app/home/garden-display'
import { useTutorialStep } from '@/src/components/tutorial/useTutorialStep'

export default function ShadowRoomVisitPage() {
  const router = useRouter()
  const { advanceStep } = useTutorialStep()
  const [showAnimation, setShowAnimation] = useState(false)
  const [showWhyModal, setShowWhyModal] = useState(false)
  const [showGardenPreview, setShowGardenPreview] = useState(false)

  const handleEnterMainApp = () => {
    advanceStep('room_chat_mi')
    router.push('/home')
  }

  return (
    <>
      <div
        style={{
          minHeight: '100svh', paddingTop: 48, paddingBottom: 120,
          paddingLeft: 24, paddingRight: 24,
          background: '#FFFFFF', maxWidth: 390, margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111111', margin: 0 }}>Negative</h1>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', marginBottom: 28, marginTop: 0 }}>
          タグを選んで入室してみよう
        </p>

        <RoomCardList type="shadow" />

        {/* 次へボタン */}
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 390,
          padding: '16px 24px 32px',
          background: 'linear-gradient(to bottom, transparent, #FFFFFF 40%)',
        }}>
          <button
            onClick={() => setShowAnimation(true)}
            style={{
              width: '100%', padding: '14px', borderRadius: 24, border: 'none',
              background: '#1A1A1A', color: '#FFFFFF',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            次へ
          </button>
        </div>
      </div>

      {/* ステップ12: 「繋がれたね！」チェックアニメーション */}
      {showAnimation && (
        <GrowthTransitionOverlay
          stage="bud"
          message={{ title: '繋がれたね！🤝' }}
          onNext={() => { setShowAnimation(false); setShowWhyModal(true) }}
        />
      )}

      {/* ステップ13: プロセスモーダル③「向き合い成長する・次ここ」 */}
      {showWhyModal && (
        <WhyModal
          currentStep={3}
          onStart={() => { setShowWhyModal(false); setShowGardenPreview(true) }}
        />
      )}

      {/* ステップ14: ガーデン（バブルログ）プレビュー */}
      {showGardenPreview && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 600,
          background: '#FFFFFF',
          display: 'flex', flexDirection: 'column',
          maxWidth: 390, margin: '0 auto',
        }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <GardenDisplay />
          </div>

          {/* ステップ15: メインアプリへ */}
          <div style={{
            flexShrink: 0, padding: '12px 24px 32px',
            background: 'linear-gradient(to bottom, transparent, #FFFFFF 30%)',
          }}>
            <button
              onClick={handleEnterMainApp}
              style={{
                width: '100%', padding: '14px', borderRadius: 24, border: 'none',
                background: '#1A1A1A', color: '#FFFFFF',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            >
              メインアプリへ
            </button>
          </div>
        </div>
      )}
    </>
  )
}
