// 「脳・ニューロン」メタファーの配色パレット。
// Positive（旧Daisy／lightタグ）= 暖色・赤系、Negative（旧Seed／shadowタグ）= 寒色・青系に統一する。
// 表示色のみを集約する定義ファイル。DBのtype/stage等のenum値('light'/'shadow'等)は変更しない。
// 各コンポーネントはここから色を import して使い、hexのハードコードを避けること。

export const POSITIVE = {
  pale:     '#FCE4E4', // タグピル・バブル背景など最も薄い赤
  soft:     '#F3B6B6', // 葉・トラック色などやや薄い赤
  base:     '#E0585F', // 花びら・メインアクセント
  deep:     '#B83A3A', // 花芯・茎など濃い赤
  text:     '#8B2424', // ピル文字・選択中タブ文字
  textDeep: '#6B1A1A', // 見出しなど、より濃い文字色
} as const

export const NEGATIVE = {
  pale:     '#DCEAF7',
  soft:     '#A9CCEA',
  base:     '#4F8FC0',
  deep:     '#2C5F88',
  text:     '#1F4E73',
  textDeep: '#163A56',
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
