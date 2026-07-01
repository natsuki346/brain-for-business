// Positive＝赤系、Negative＝青系。
// 表示色のみを集約する定義ファイル。DBのtype/stage等のenum値('light'/'shadow'等)は変更しない。
// 各コンポーネントはここから色を import して使い、hexのハードコードを避けること。

export const POSITIVE = {
  pale:     '#FFF0F0',
  soft:     '#FECACA',
  base:     '#EF4444',
  deep:     '#DC2626',
  text:     '#DC2626',
  textDeep: '#B91C1C',
} as const

export const NEGATIVE = {
  pale:     '#EFF6FF',
  soft:     '#BFDBFE',
  base:     '#3B82F6',
  deep:     '#2563EB',
  text:     '#2563EB',
  textDeep: '#1D4ED8',
} as const

// 成長段階（タネ→芽→蕾→満開）を型ごとの色相内で表現する4段階グラデーション
export const POSITIVE_STAGES = [POSITIVE.pale, POSITIVE.soft, POSITIVE.base, POSITIVE.deep] as const
export const NEGATIVE_STAGES = [NEGATIVE.pale, NEGATIVE.soft, NEGATIVE.base, NEGATIVE.deep] as const

export const APP_BACKGROUND = '#FFFFFF'

// hexカラーをrgba()文字列に変換する（box-shadowやopacity付き背景で使用）
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
