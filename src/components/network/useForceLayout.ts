'use client'

import { useEffect, useRef, useState } from 'react'
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
} from 'd3-force'
import type { NetworkData, NetworkNode, SimNode } from './types'

type LinkDatum = SimulationLinkDatum<SimNode> & { kind: string }

// ノードの円の半径：自分は固定、人物は関係の深さ（level）、思考は成長度（growthPoint）で変える。
// 既存のガーデン画面のバブルサイズ計算と同じ「育つほど大きくなる」考え方を踏襲する。
export function radiusForNode(node: NetworkNode): number {
  if (node.kind === 'self') return 32
  if (node.kind === 'person') return 18 + node.level * 4 // 22 / 26 / 30
  const ratio = Math.min(Math.max(node.growthPoint, 0), 30) / 30
  return 14 + ratio * 14 // 14〜28
}

function linkDistance(link: { kind: string }): number {
  return link.kind === 'person-thought' ? 64 : 88
}

/**
 * d3-force（フォースシミュレーションのみ）でノードの座標を計算するフック。
 * 描画自体はReactコンポーネント（NetworkGraph）が円・SVGで行い、このフックは
 * tickごとに座標を反映した配列を返すだけ。自分のノードは中心にfx/fyで固定する。
 */
export function useForceLayout(data: NetworkData | null, width: number, height: number) {
  const [nodes, setNodes] = useState<SimNode[]>([])
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null)

  useEffect(() => {
    if (!data || width === 0 || height === 0) {
      setNodes([])
      return
    }

    const simNodes: SimNode[] = data.nodes.map(n => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * 60,
      y: height / 2 + (Math.random() - 0.5) * 60,
    }))

    const self = simNodes.find(n => n.kind === 'self')
    if (self) {
      self.fx = width / 2
      self.fy = height / 2
    }

    // d3-forceはリンクのsource/targetをid文字列からノード参照へ書き換えるため、
    // 呼び出し元のdata.linksを直接渡さず複製する
    const simLinks: LinkDatum[] = data.links.map(l => ({ ...l }))

    const simulation = forceSimulation(simNodes)
      .force(
        'link',
        forceLink<SimNode, LinkDatum>(simLinks)
          .id(d => d.id)
          .distance(linkDistance)
          .strength(0.55),
      )
      .force('charge', forceManyBody().strength(-80))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide<SimNode>(d => radiusForNode(d) + 8))
      .alphaDecay(0.045)

    simRef.current = simulation
    simulation.on('tick', () => setNodes([...simNodes]))

    return () => { simulation.stop() }
  }, [data, width, height])

  return nodes
}
