import { useEffect, useRef, useState } from 'react'
import { ArrowDownUp, ArrowUpRight, BriefcaseBusiness, Check, ExternalLink, FileText, MapPin, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fetchJson } from '@/lib/api'
import type { Application, StatusOption } from '@/lib/types'

type Draft = Pick<Application, 'job_title' | 'company' | 'compensation' | 'job_url' | 'location' | 'applied_date' | 'status'> & { id: number | null; used_cover_letter: boolean }
const blankDraft = (status: string): Draft => ({ id: null, job_title: '', company: '', compensation: '', job_url: '', location: '', applied_date: new Date().toISOString().slice(0, 10), status, used_cover_letter: false })
const interviewStatuses = ['interview', 'interview_2nd']
const offerStatuses = ['offer', 'offer_accepted']
const closedStatuses = ['rejected', 'no_response', 'interview_no_offer', 'interview_never_scheduled', 'interview_2nd_no_offer', 'offer_declined']
function statusTone(status: string) {
  if (offerStatuses.includes(status)) return 'positive'
  if (interviewStatuses.includes(status)) return 'interview'
  if (closedStatuses.includes(status)) return 'closed'
  return 'applied'
}
function readableDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value || 'Not set' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function TrackerTab({ onGenerateFor, refreshSignal }: { onGenerateFor: (id: number) => void; refreshSignal: number }) {
  const [applications, setApplications] = useState<Application[]>([])
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [group, setGroup] = useState('all')
  const [newestFirst, setNewestFirst] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const detailsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(blankDraft('applied'))

  function load() {
    fetchJson<Application[]>('/api/applications').then((data) => { setApplications(data); setLoadError('') }).catch((error: Error) => setLoadError(error.message)).finally(() => setLoading(false))
  }
  useEffect(() => { fetchJson<StatusOption[]>('/api/applications/statuses').then(setStatusOptions).catch((error: Error) => toast.error(error.message)) }, [])
  useEffect(load, [refreshSignal])

  function openAdd() { setDraft(blankDraft(statusOptions[0]?.value ?? 'applied')); setDialogOpen(true) }
  function openEdit(a: Application) { setSelectedId(null); setDraft({ ...a, used_cover_letter: !!a.used_cover_letter }); setDialogOpen(true) }
  function openDetails(id: number, trigger: HTMLButtonElement) { detailsTriggerRef.current = trigger; setSelectedId(id) }
  function generateFor(id: number) { detailsTriggerRef.current = null; setSelectedId(null); onGenerateFor(id) }
  async function saveDialog(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { id, ...payload } = draft
      await fetchJson(id ? `/api/applications/${id}` : '/api/applications', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) })
      setDialogOpen(false)
      toast.success(id ? 'Application updated.' : 'Application added.')
      load()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save application. Please try again.') }
    finally { setSaving(false) }
  }
  async function updateStatus(a: Application, status: string) {
    try {
      await fetchJson(`/api/applications/${a.id}`, { method: 'PUT', body: JSON.stringify({ ...a, status }) })
      setApplications((apps) => apps.map((x) => x.id === a.id ? { ...x, status } : x))
      toast.success('Status updated.')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update status.') }
  }
  async function remove(a: Application) {
    if (!confirm(`Delete the application for ${a.job_title} at ${a.company}? Its generated documents will also be deleted.`)) return
    try {
      await fetchJson(`/api/applications/${a.id}`, { method: 'DELETE' })
      if (selectedId === a.id) setSelectedId(null)
      load()
      toast.success('Application deleted.')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not delete application.') }
  }
  const statusLabel = (value: string) => statusOptions.find((s) => s.value === value)?.label ?? value
  const groups = [
    { value: 'all', label: 'All applications', count: applications.length },
    { value: 'applied', label: 'Applied', count: applications.filter((a) => a.status === 'applied').length },
    { value: 'interview', label: 'Interviewing', count: applications.filter((a) => interviewStatuses.includes(a.status)).length },
    { value: 'offer', label: 'Offers', count: applications.filter((a) => offerStatuses.includes(a.status)).length },
    { value: 'closed', label: 'Closed', count: applications.filter((a) => closedStatuses.includes(a.status)).length },
  ]
  const filteredApplications = applications.filter((a) =>
    (group === 'all' || (group === 'applied' ? a.status === 'applied' : group === 'interview' ? interviewStatuses.includes(a.status) : group === 'offer' ? offerStatuses.includes(a.status) : closedStatuses.includes(a.status))) &&
    (statusFilter === 'all' || a.status === statusFilter) &&
    [a.job_title, a.company, a.location].join(' ').toLowerCase().includes(query.trim().toLowerCase())
  ).sort((a, b) => (newestFirst ? -1 : 1) * (a.applied_date.localeCompare(b.applied_date) || a.id - b.id))
  const selected = applications.find((a) => a.id === selectedId)
  const clearFilters = () => { setQuery(''); setGroup('all'); setStatusFilter('all') }

  function documentLink(a: Application, kind: 'resume' | 'cover_letter') {
    const id = kind === 'resume' ? a.resume_id : a.cover_letter_id
    const label = kind === 'resume' ? 'Resume' : 'Cover letter'
    return id ? <a className="document-link" href={`/document.html?id=${id}`} target="_blank" rel="noreferrer"><FileText aria-hidden="true" />{label}<ArrowUpRight aria-hidden="true" /></a> : <button className="document-link document-missing" onClick={() => generateFor(a.id)}><Plus aria-hidden="true" />{label}</button>
  }

  return (
    <div className="tracker-layout">
      <div className="application-stage-tabs" aria-label="Filter applications by stage">
        {groups.map((item) => <button key={item.value} aria-pressed={group === item.value} onClick={() => { setGroup(item.value); setStatusFilter('all') }}>{item.label}<span>{loading ? '–' : item.count}</span></button>)}
      </div>
      <div className="tracker-toolbar">
        <div className="tracker-search"><Search aria-hidden="true" /><Input aria-label="Search applications" placeholder="Search company, role, or location…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger aria-label="Filter by exact status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
        <Button variant="outline" onClick={() => setNewestFirst((value) => !value)}><ArrowDownUp aria-hidden="true" />{newestFirst ? 'Newest first' : 'Oldest first'}</Button>
        <Button className="add-application" onClick={openAdd}><Plus aria-hidden="true" />Add application</Button>
      </div>
      <div className="application-workbench">
        <div className="tracker-surface">
          {loadError ? <div className="workspace-empty" role="alert"><h2>Applications couldn’t be loaded</h2><p>{loadError}</p><Button variant="outline" onClick={load}>Try again</Button></div> : loading ? <div className="table-loading" role="status"><span className="sr-only">Loading applications</span>{[0, 1, 2, 3].map((i) => <div key={i}><span /><span /><span /></div>)}</div> : applications.length === 0 ? (
            <div className="workspace-empty"><BriefcaseBusiness aria-hidden="true" /><h2>Make room for your next opportunity</h2><p>Add a role you’ve applied for. Your documents, application status, and job details will stay together here.</p><Button onClick={openAdd}><Plus aria-hidden="true" />Add your first application</Button></div>
          ) : <Table>
            <TableHeader><TableRow><TableHead>Opportunity</TableHead><TableHead>Status</TableHead><TableHead>Documents</TableHead><TableHead>Keyword match</TableHead><TableHead>Applied</TableHead><TableHead><span className="sr-only">View details</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredApplications.length === 0 && <TableRow><TableCell colSpan={6}><div className="workspace-empty compact"><Search aria-hidden="true" /><h2>No matching applications</h2><p>Try a different search or clear your filters.</p><Button variant="outline" onClick={clearFilters}>Clear filters</Button></div></TableCell></TableRow>}
              {filteredApplications.map((a) => <TableRow key={a.id} data-selected={selectedId === a.id}>
                <TableCell><div className="opportunity"><span className="company-monogram" aria-hidden="true">{a.company.trim().slice(0, 2).toUpperCase() || 'CO'}</span><div><button className="opportunity-title" aria-haspopup="dialog" onClick={(e) => openDetails(a.id, e.currentTarget)}>{a.job_title}</button><span>{a.company}{a.location && <><span className="text-separator">·</span>{a.location}</>}</span></div></div></TableCell>
                <TableCell><Select value={a.status} onValueChange={(v) => updateStatus(a, v)}><SelectTrigger size="sm" aria-label={`Status for ${a.job_title} at ${a.company}`} className={`status-select status-${statusTone(a.status)}`}><span className="status-dot" /><SelectValue>{statusLabel(a.status)}</SelectValue></SelectTrigger><SelectContent>{statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></TableCell>
                <TableCell><div className="document-links">{documentLink(a, 'resume')}{documentLink(a, 'cover_letter')}</div></TableCell>
                <TableCell>{typeof a.match_score === 'number' ? <span className={`match-score ${a.match_score >= 70 ? 'match-strong' : a.match_score >= 40 ? 'match-medium' : 'match-low'}`}><span />{a.match_score}%</span> : <span className="not-scored">Not scored</span>}</TableCell>
                <TableCell className="application-date">{readableDate(a.applied_date)}</TableCell>
                <TableCell><Button variant="ghost" size="icon" aria-haspopup="dialog" aria-label={`View ${a.job_title} at ${a.company}`} onClick={(e) => openDetails(a.id, e.currentTarget)}><ArrowUpRight aria-hidden="true" /></Button></TableCell>
              </TableRow>)}
            </TableBody>
          </Table>}
          <div className="tracker-footer" role="status"><span>{loading ? 'Loading your applications…' : `${filteredApplications.length} of ${applications.length} applications`}</span><span>Select a role to see its details</span></div>
        </div>
      </div>
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelectedId(null) }}>
        {selected && <DialogContent className="application-details" onCloseAutoFocus={(event) => { if (!dialogOpen && detailsTriggerRef.current?.isConnected) { event.preventDefault(); detailsTriggerRef.current.focus() } }}>
          <div className="detail-topline">Application details</div>
          <DialogTitle>{selected.job_title}</DialogTitle><DialogDescription className="detail-company">{selected.company}</DialogDescription>
          {selected.location && <p className="detail-location"><MapPin aria-hidden="true" />{selected.location}</p>}
          <dl className="detail-facts"><div><dt>Status</dt><dd><span className={`status-label status-${statusTone(selected.status)}`}><span className="status-dot" />{statusLabel(selected.status)}</span></dd></div><div><dt>Applied</dt><dd>{readableDate(selected.applied_date)}</dd></div><div><dt>Compensation</dt><dd>{selected.compensation || 'Not provided'}</dd></div><div><dt>Cover letter used</dt><dd>{selected.used_cover_letter ? <><Check aria-hidden="true" />Yes</> : 'No'}</dd></div></dl>
          {selected.job_url && <a className="detail-job-link" href={selected.job_url} target="_blank" rel="noreferrer">View job posting<ExternalLink aria-hidden="true" /></a>}
          <section className="detail-section"><h3>Your documents</h3><div className="detail-documents">{documentLink(selected, 'resume')}{documentLink(selected, 'cover_letter')}</div><Button className="w-full" onClick={() => generateFor(selected.id)}><FileText aria-hidden="true" />Tailor documents<ArrowUpRight aria-hidden="true" /></Button></section>
          {selected.job_description && <section className="detail-section"><h3>Job description</h3><p className="detail-description">{selected.job_description}</p></section>}
          <div className="detail-actions"><Button variant="outline" onClick={() => openEdit(selected)}>Edit application</Button><Button variant="ghost" size="icon" aria-label="Delete application" onClick={() => remove(selected)}><Trash2 aria-hidden="true" /></Button></div>
        </DialogContent>}
      </Dialog>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="application-dialog">
          <form onSubmit={saveDialog} className="flex flex-col gap-3">
            <DialogHeader>
              <DialogTitle>{draft.id ? 'Edit Application' : 'Add Application'}</DialogTitle><DialogDescription>Keep the role and its application details together.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-1.5">
              <Label htmlFor="tracker_job_title">Job Title</Label>
              <Input
                id="tracker_job_title"
                required
                value={draft.job_title}
                onChange={(e) => setDraft({ ...draft, job_title: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tracker_company">Company</Label>
              <Input
                id="tracker_company"
                required
                value={draft.company}
                onChange={(e) => setDraft({ ...draft, company: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tracker_compensation">Compensation</Label>
              <Input
                id="tracker_compensation"
                value={draft.compensation}
                onChange={(e) => setDraft({ ...draft, compensation: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tracker_job_url">Job URL</Label>
              <Input
                id="tracker_job_url"
                type="url"
                value={draft.job_url}
                onChange={(e) => setDraft({ ...draft, job_url: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tracker_location">Location</Label>
              <Input
                id="tracker_location"
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="tracker_used_cover_letter"
                checked={draft.used_cover_letter}
                onCheckedChange={(c) => setDraft({ ...draft, used_cover_letter: c === true })}
              />
              <Label htmlFor="tracker_used_cover_letter">Used a cover letter</Label>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tracker_applied_date">Date</Label>
              <Input
                id="tracker_applied_date"
                type="date"
                value={draft.applied_date}
                onChange={(e) => setDraft({ ...draft, applied_date: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tracker_status">Status</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                <SelectTrigger id="tracker_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save application'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
