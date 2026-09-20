import { useEffect, useState } from 'react'
import { FunnelChart, type FunnelLink, type FunnelNode } from '@/components/FunnelChart'
import { fetchJson } from '@/lib/api'

interface FunnelData {
  nodes: FunnelNode[]
  links: FunnelLink[]
}

export function VisualizeTab({ active }: { active: boolean }) {
  const [data, setData] = useState<FunnelData | null>(null)

  useEffect(() => {
    if (active) fetchJson<FunnelData>('/api/applications/funnel').then(setData)
  }, [active])

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Funnel Visualization</h2>
      {data && data.nodes.length === 0 && (
        <p className="text-sm italic text-muted-foreground">No application data yet &mdash; add some in the Tracker tab.</p>
      )}
      {data && data.nodes.length > 0 && <FunnelChart nodes={data.nodes} links={data.links} />}
    </div>
  )
}
