// 脳・ニューロンネットワーク図のノード／リンク定義。
// 中心に自分（SelfNode）、周囲に人物（PersonNode）・思考＝タグ（ThoughtNode）を配置する。

export type SelfNode = {
  kind: 'self'
  id: string
  username: string
  avatarUrl: string | null
}

export type PersonNode = {
  kind: 'person'
  id: string
  username: string
  avatarUrl: string | null
  /** friend_messagesの件数から算出した関係の深さ（1〜3、深いほど大きい） */
  level: 1 | 2 | 3
}

export type ThoughtNode = {
  kind: 'thought'
  id: string
  text: string
  type: 'light' | 'shadow'
  growthPoint: number
  /** 同じテキスト・typeのタグを持つ全ユーザー数（匿名の集計のみ。個人を特定しない） */
  sharedCount: number
}

export type NetworkNode = SelfNode | PersonNode | ThoughtNode

export type NetworkLinkKind = 'self-person' | 'self-thought' | 'person-thought'

export type NetworkLink = {
  kind: NetworkLinkKind
  source: string // node.id
  target: string // node.id
}

export type NetworkData = {
  nodes: NetworkNode[]
  links: NetworkLink[]
}

// d3-forceがシミュレーション中に書き込む座標・速度を持つノード（NodeObject相当）
export type SimNode = NetworkNode & {
  x: number
  y: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}
