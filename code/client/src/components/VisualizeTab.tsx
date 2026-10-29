import { useEffect, useState } from 'react'
import { ChartNoAxesCombined } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FunnelChart, type FunnelLink, type FunnelNode } from '@/components/FunnelChart'
import { fetchJson } from '@/lib/api'

interface FunnelData { nodes: FunnelNode[]; links: FunnelLink[] }
export function VisualizeTab({ active }: { active: boolean }) {
  const [data, setData] = useState<FunnelData | null>(null)
  const [error, setError] = useState('')
  function load() {
    fetchJson<FunnelData>('/api/applications/funnel').then((result) => { setData(result); setError('') }).catch((err: Error) => setError(err.message))
  }
  useEffect(() => { if (active) load() }, [active])
  return (
    <div className="insights-surface">
      <div className="section-heading"><div><h2>Your application journey</h2><p>From submitted applications to interviews and offers.</p></div><ChartNoAxesCombined aria-hidden="true" /></div>
      {error ? <div className="workspace-empty" role="alert"><h2>Insights couldn’t be loaded</h2><p>{error}</p><Button variant="outline" onClick={load}>Try again</Button></div> : !data ? <div className="workspace-empty" role="status"><p>Loading application insights...</p></div> : data.nodes.length === 0 ? <div className="workspace-empty"><ChartNoAxesCombined aria-hidden="true" /><h2>Your progress will take shape here</h2><p>Add applications and update their statuses to see how opportunities move through your hiring funnel.</p></div> : <div className="insights-chart"><FunnelChart nodes={data.nodes} links={data.links} /></div>}
      <p className="insights-note">The funnel groups applications by cover letter usage and hiring stage. Update statuses in Applications to keep this view current.</p>
      {data && data.links.length > 0 && <details className="insights-data"><summary>View funnel data as a table</summary><div className="overflow-x-auto"><table><caption className="sr-only">Application counts between hiring stages</caption><thead><tr><th scope="col">From stage</th><th scope="col">To stage</th><th scope="col">Applications</th></tr></thead><tbody>{data.links.map((link) => <tr key={`${link.source}-${link.target}`}><th scope="row">{link.source}</th><td>{link.target}</td><td>{link.value}</td></tr>)}</tbody></table></div></details>}
    </div>
  )
}
