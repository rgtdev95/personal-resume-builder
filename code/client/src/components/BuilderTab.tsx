import { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { fetchJson } from '@/lib/api'
import type { Application, DuplicateCheckResult, Source } from '@/lib/types'

interface ExtractResult {
  company: string
  job_title: string
  compensation: string
  location: string
}

// Mirrors the old public/builder.js state machine 1:1: the tracker row is
// created only inside ensureApplication(), called from generate() — never
// from extract() or the duplicate-check — so Cancel before Generate is
// always a pure client-side reset with nothing to clean up on the server.
export function BuilderTab({
  loadApplicationId,
  onGenerated,
  onViewExisting,
}: {
  loadApplicationId: number | null
  onGenerated: () => void
  onViewExisting: () => void
}) {
  const applicationIdRef = useRef<number | null>(null)

  const [jobUrl, setJobUrl] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [compensation, setCompensation] = useState('')
  const [location, setLocation] = useState('')
  const [usedCoverLetter, setUsedCoverLetter] = useState(true)

  const [extractStatus, setExtractStatus] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [selectedSourceIds, setSelectedSourceIds] = useState<number[]>([])
  const [resultMessage, setResultMessage] = useState<{ text: string; docId?: number; label?: string } | null>(null)

  function loadSources() {
    fetchJson<Source[]>('/api/sources').then((all) => {
      setSources(all)
      setSelectedSourceIds(all.map((s) => s.id))
    })
  }

  useEffect(loadSources, [])

  useEffect(() => {
    if (loadApplicationId == null) return
    reset()
    fetchJson<Application>(`/api/applications/${loadApplicationId}`).then((app) => {
      applicationIdRef.current = app.id
      setJobUrl(app.job_url)
      setJobDescription(app.job_description)
      setJobTitle(app.job_title)
      setCompany(app.company)
      setCompensation(app.compensation)
      setLocation(app.location)
      setUsedCoverLetter(!!app.used_cover_letter)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadApplicationId])

  function reset() {
    applicationIdRef.current = null
    setJobUrl('')
    setJobDescription('')
    setJobTitle('')
    setCompany('')
    setCompensation('')
    setLocation('')
    setUsedCoverLetter(true)
    setExtractStatus('')
    setDuplicateWarning(null)
    setResultMessage(null)
    loadSources()
  }

  async function checkDuplicate(companyValue: string, jobTitleValue: string) {
    if (!companyValue.trim() || !jobTitleValue.trim()) {
      setDuplicateWarning(null)
      return
    }
    const result = await fetchJson<DuplicateCheckResult>(
      `/api/applications/check-duplicate?company=${encodeURIComponent(companyValue)}&job_title=${encodeURIComponent(jobTitleValue)}`
    )
    if (result.duplicate && result.application && result.application.id !== applicationIdRef.current) {
      setDuplicateWarning(
        `You already have an application for ${jobTitleValue} at ${companyValue} ` +
          `(status: ${result.application.status}, applied ${result.application.applied_date}).`
      )
    } else {
      setDuplicateWarning(null)
    }
  }

  async function extract() {
    if (!jobDescription.trim()) {
      setExtractStatus('Paste a job description first.')
      return
    }
    setExtractStatus('Extracting... (calls the AI, may take a few seconds)')
    try {
      const data = await fetchJson<ExtractResult>('/api/documents/extract', {
        method: 'POST',
        body: JSON.stringify({ job_description_text: jobDescription }),
      })
      setCompany(data.company || '')
      setJobTitle(data.job_title || '')
      setCompensation(data.compensation || '')
      setLocation(data.location || '')
      setExtractStatus('Extracted — review the fields below before generating.')
      await checkDuplicate(data.company || '', data.job_title || '')
    } catch (err) {
      setExtractStatus(`Extraction failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async function ensureApplication(): Promise<number> {
    if (applicationIdRef.current) return applicationIdRef.current
    if (!jobTitle.trim() || !company.trim()) {
      throw new Error('Job title and company are required (use Extract, or fill them in manually).')
    }
    const created = await fetchJson<Application>('/api/applications', {
      method: 'POST',
      body: JSON.stringify({
        job_title: jobTitle.trim(),
        company: company.trim(),
        compensation: compensation.trim(),
        job_url: jobUrl.trim(),
        location: location.trim(),
        job_description: jobDescription,
        used_cover_letter: usedCoverLetter,
      }),
    })
    applicationIdRef.current = created.id
    return created.id
  }

  async function generate(kind: 'resume' | 'cover_letter') {
    const label = kind === 'resume' ? 'Resume' : 'Cover letter'
    setResultMessage({ text: `Generating ${label.toLowerCase()}... (calls the AI, may take up to a minute)` })
    try {
      const id = await ensureApplication()
      const path = kind === 'resume' ? 'generate-resume' : 'generate-cover-letter'
      const doc = await fetchJson<{ id: number }>(`/api/documents/${path}`, {
        method: 'POST',
        body: JSON.stringify({ application_id: id, source_ids: selectedSourceIds }),
      })
      setResultMessage({ text: `${label} generated.`, docId: doc.id, label })
      onGenerated()
    } catch (err) {
      setResultMessage({ text: `Generation failed: ${err instanceof Error ? err.message : String(err)}` })
    }
  }

  function toggleSource(id: number, checked: boolean) {
    setSelectedSourceIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resume &amp; Cover Letter Builder</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {duplicateWarning && (
          <Alert>
            <AlertTriangle />
            <AlertDescription className="flex flex-col gap-2">
              <span>{duplicateWarning}</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    reset()
                    onViewExisting()
                  }}
                >
                  View Existing
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setDuplicateWarning(null)}>
                  Proceed Anyway
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid max-w-xl gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="job_url">Job URL</Label>
            <Input id="job_url" type="url" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="job_description">Job Description</Label>
            <Textarea
              id="job_description"
              rows={10}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here..."
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={extract}>
              Extract Details
            </Button>
            <span className="text-sm text-muted-foreground">{extractStatus}</span>
          </div>

          <fieldset className="grid gap-3 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">Extracted details (edit if needed)</legend>
            <div className="grid gap-1.5">
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                onBlur={() => checkDuplicate(company, jobTitle)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                onBlur={() => checkDuplicate(company, jobTitle)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="compensation">Compensation</Label>
              <Input id="compensation" value={compensation} onChange={(e) => setCompensation(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </fieldset>

          <div className="flex items-center gap-2">
            <Checkbox
              id="used_cover_letter"
              checked={usedCoverLetter}
              onCheckedChange={(c) => setUsedCoverLetter(c === true)}
            />
            <Label htmlFor="used_cover_letter">Include a cover letter for this application</Label>
          </div>

          <fieldset className="grid gap-2 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">Include which source-of-truth entries?</legend>
            {sources.length === 0 && (
              <p className="text-sm italic text-muted-foreground">
                No source entries yet &mdash; add some in the Work History tab first.
              </p>
            )}
            {sources.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedSourceIds.includes(s.id)}
                  onCheckedChange={(c) => toggleSource(s.id, c === true)}
                />
                {s.title || `Source #${s.id}`}
              </label>
            ))}
          </fieldset>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => generate('resume')}>
              Generate Resume
            </Button>
            <Button type="button" onClick={() => generate('cover_letter')}>
              Generate Cover Letter
            </Button>
            <Button type="button" variant="outline" onClick={reset}>
              Cancel
            </Button>
          </div>

          {resultMessage && (
            <p className="text-sm">
              {resultMessage.text}{' '}
              {resultMessage.docId && (
                <a className="text-primary underline" href={`/document.html?id=${resultMessage.docId}`} target="_blank" rel="noreferrer">
                  Open &amp; edit
                </a>
              )}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
