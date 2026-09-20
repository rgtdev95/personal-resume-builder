import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fetchJson } from '@/lib/api'
import type { Application, StatusOption } from '@/lib/types'

type Draft = {
  id: number | null
  job_title: string
  company: string
  compensation: string
  job_url: string
  location: string
  used_cover_letter: boolean
  applied_date: string
  status: string
}

function blankDraft(defaultStatus: string): Draft {
  return {
    id: null,
    job_title: '',
    company: '',
    compensation: '',
    job_url: '',
    location: '',
    used_cover_letter: false,
    applied_date: new Date().toISOString().slice(0, 10),
    status: defaultStatus,
  }
}

function draftFromApplication(a: Application): Draft {
  return {
    id: a.id,
    job_title: a.job_title,
    company: a.company,
    compensation: a.compensation,
    job_url: a.job_url,
    location: a.location,
    used_cover_letter: !!a.used_cover_letter,
    applied_date: a.applied_date,
    status: a.status,
  }
}

export function TrackerTab({
  onGenerateFor,
  refreshSignal,
}: {
  onGenerateFor: (id: number) => void
  refreshSignal: number
}) {
  const [applications, setApplications] = useState<Application[]>([])
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(blankDraft('applied'))

  function load() {
    fetchJson<Application[]>('/api/applications').then(setApplications)
  }

  useEffect(() => {
    fetchJson<StatusOption[]>('/api/applications/statuses').then(setStatusOptions)
  }, [])

  // Re-fetch on mount and whenever the Builder tab reports a document was
  // generated (which sets a row's resume_id/cover_letter_id) — Tracker has
  // no other way to know that happened, since generation doesn't go through
  // any handler owned by this component.
  useEffect(load, [refreshSignal])

  function openAdd() {
    setDraft(blankDraft(statusOptions[0]?.value ?? 'applied'))
    setDialogOpen(true)
  }

  function openEdit(a: Application) {
    setDraft(draftFromApplication(a))
    setDialogOpen(true)
  }

  async function saveDialog(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      job_title: draft.job_title,
      company: draft.company,
      compensation: draft.compensation,
      job_url: draft.job_url,
      location: draft.location,
      used_cover_letter: draft.used_cover_letter,
      applied_date: draft.applied_date,
      status: draft.status,
    }
    if (draft.id) {
      await fetchJson(`/api/applications/${draft.id}`, { method: 'PUT', body: JSON.stringify(payload) })
    } else {
      await fetchJson('/api/applications', { method: 'POST', body: JSON.stringify(payload) })
    }
    setDialogOpen(false)
    load()
  }

  async function updateStatus(a: Application, status: string) {
    setApplications((apps) => apps.map((x) => (x.id === a.id ? { ...x, status } : x)))
    await fetchJson(`/api/applications/${a.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...a, status }),
    })
  }

  async function remove(a: Application) {
    if (!confirm(`Delete the tracker entry for ${a.job_title} at ${a.company}? This also deletes its generated documents.`))
      return
    await fetchJson(`/api/applications/${a.id}`, { method: 'DELETE' })
    load()
  }

  const statusLabel = (value: string) => statusOptions.find((s) => s.value === value)?.label ?? value

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button onClick={openAdd}>+ Add Application Manually</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Compensation</TableHead>
            <TableHead>Job URL</TableHead>
            <TableHead>Resume</TableHead>
            <TableHead>Cover Letter</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="italic text-muted-foreground">
                No applications yet.
              </TableCell>
            </TableRow>
          )}
          {applications.map((a) => (
            <TableRow key={a.id}>
              <TableCell>{a.job_title}</TableCell>
              <TableCell>{a.company}</TableCell>
              <TableCell>{a.compensation}</TableCell>
              <TableCell>
                {a.job_url && (
                  <a href={a.job_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    link
                  </a>
                )}
              </TableCell>
              <TableCell>
                {a.resume_id ? (
                  <a href={`/document.html?id=${a.resume_id}`} target="_blank" className="text-primary underline">
                    view
                  </a>
                ) : (
                  <button type="button" className="text-primary underline" onClick={() => onGenerateFor(a.id)}>
                    generate
                  </button>
                )}
              </TableCell>
              <TableCell>
                {a.cover_letter_id ? (
                  <a href={`/document.html?id=${a.cover_letter_id}`} target="_blank" className="text-primary underline">
                    view
                  </a>
                ) : (
                  <button type="button" className="text-primary underline" onClick={() => onGenerateFor(a.id)}>
                    generate
                  </button>
                )}
              </TableCell>
              <TableCell>
                <Select value={a.status} onValueChange={(v) => updateStatus(a, v)}>
                  <SelectTrigger size="sm">
                    <SelectValue>
                      <Badge variant="secondary">{statusLabel(a.status)}</Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>{a.applied_date}</TableCell>
              <TableCell className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(a)}>
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => remove(a)}>
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={saveDialog} className="flex flex-col gap-3">
            <DialogHeader>
              <DialogTitle>{draft.id ? 'Edit Application' : 'Add Application'}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-1.5">
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                required
                value={draft.job_title}
                onChange={(e) => setDraft({ ...draft, job_title: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                required
                value={draft.company}
                onChange={(e) => setDraft({ ...draft, company: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="compensation">Compensation</Label>
              <Input
                id="compensation"
                value={draft.compensation}
                onChange={(e) => setDraft({ ...draft, compensation: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="job_url">Job URL</Label>
              <Input
                id="job_url"
                type="url"
                value={draft.job_url}
                onChange={(e) => setDraft({ ...draft, job_url: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="used_cover_letter"
                checked={draft.used_cover_letter}
                onCheckedChange={(c) => setDraft({ ...draft, used_cover_letter: c === true })}
              />
              <Label htmlFor="used_cover_letter">Used a cover letter</Label>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="applied_date">Date</Label>
              <Input
                id="applied_date"
                type="date"
                value={draft.applied_date}
                onChange={(e) => setDraft({ ...draft, applied_date: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                <SelectTrigger>
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
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
