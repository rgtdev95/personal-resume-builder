import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { SankeyChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([SankeyChart, TooltipComponent, CanvasRenderer])

export interface FunnelNode {
  name: string
}

export interface FunnelLink {
  source: string
  target: string
  value: number
}

export function FunnelChart({ nodes, links }: { nodes: FunnelNode[]; links: FunnelLink[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const chart = echarts.init(containerRef.current)
    chartRef.current = chart

    const resize = () => chart.resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption({
      tooltip: {
        trigger: 'item',
        formatter: (params: { dataType?: string; data: { source?: string; target?: string; value?: number }; name: string }) =>
          params.dataType === 'edge'
            ? `${params.data.source} &rarr; ${params.data.target}: ${params.data.value}`
            : params.name,
      },
      series: [
        {
          type: 'sankey',
          data: nodes,
          links,
          emphasis: { focus: 'adjacency' },
          lineStyle: { color: 'gradient', curveness: 0.5 },
          label: { color: '#222' },
        },
      ],
    })
    chartRef.current?.resize()
  }, [nodes, links])

  return <div ref={containerRef} className="h-[640px] w-full rounded-lg bg-card" />
}
