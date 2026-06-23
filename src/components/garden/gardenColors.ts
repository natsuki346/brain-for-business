// 農園画面（実の部屋・根の部屋）共通の背景・サイズ定数
import { NEGATIVE, POSITIVE } from '@/src/styles/colors'

// 実の畑（地上・Positive）：白を基調にした淡い赤のフィールド
export const GRASS_FIELD_BG = `radial-gradient(ellipse at 50% 35%, #FFFFFF 0%, ${POSITIVE.pale} 65%, ${POSITIVE.soft} 100%)`

// 根の畑（地下・Negative）：白を基調にした淡い青のフィールド
export const SHADOW_FIELD_BG = `
  radial-gradient(ellipse at 30% 40%, ${NEGATIVE.pale} 0%, transparent 40%),
  radial-gradient(ellipse at 70% 60%, ${NEGATIVE.soft} 0%, transparent 35%),
  radial-gradient(ellipse at 50% 20%, ${NEGATIVE.pale} 0%, transparent 30%),
  #FFFFFF
`

export const DAISY_SIZE = 62
export const SEED_SIZE  = 70
