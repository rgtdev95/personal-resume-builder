import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2Icon } from 'lucide-react'
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

// Mirrors the old public/builder.js state machine: the tracker row is
// created only inside ensureApplication(), called from doGenerateResume()/
// generateCoverLetter() — never from extraction or the duplicate-check — so
// Cancel before Generate is always a pure client-side reset with nothing to
// clean up on the server. Extraction is no longer a separate manual step:
// Generate Resume runs extract -> duplicate-check -> generate as one flow.
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
  // What company/job title applicationIdRef is actually bound to. Extraction
  // can hand back different details than what created/loaded that binding
  // (you pasted a new posting without clicking Cancel first) — without this,
  // ensureApplication() would silently reuse the old application, so the
  // "new" generation would overwrite a previous job's resume with content
  // built from that old row's (stale) job_description instead of creating a
  // new tracker row for the posting you just pasted.
  const boundCompanyRef = useRef<string | null>(null)
  const boundJobTitleRef = useRef<string | null>(null)

  const [jobUrl, setJobUrl] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [compensation, setCompensation] = useState('')
  const [location, setLocation] = useState('')
  const [usedCoverLetter, setUsedCoverLetter] = useState(true)

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [selectedSourceIds, setSelectedSourceIds] = useState<number[]>([])
  const [resultMessage, setResultMessage] = useState<{ text: string; docId?: number } | null>(null)
  const [loading, setLoading] = useState(false)
  // Cover Letter generation is only offered once a resume exists for this
  // draft — either just generated, or already present on an application
  // loaded from the Tracker tab — not as a standing option up front.
  const [hasResume, setHasResume] = useState(false)

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
      boundCompanyRef.current = app.company
      boundJobTitleRef.current = app.job_title
      setJobUrl(app.job_url)
      setJobDescription(app.job_description)
      setJobTitle(app.job_title)
      setCompany(app.company)
      setCompensation(app.compensation)
      setLocation(app.location)
      setUsedCoverLetter(!!app.used_cover_letter)
      setHasResume(!!app.resume_id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadApplicationId])

  function reset() {
    applicationIdRef.current = null
    boundCompanyRef.current = null
    boundJobTitleRef.current = null
    setJobUrl('')
    setJobDescription('')
    setJobTitle('')
    setCompany('')
    setCompensation('')
    setLocation('')
    setUsedCoverLetter(true)
    setDuplicateWarning(null)
    setResultMessage(null)
    setHasResume(false)
    loadSources()
  }

  async function checkDuplicate(companyValue: string, jobTitleValue: string): Promise<boolean> {
    if (!companyValue.trim() || !jobTitleValue.trim()) {
      setDuplicateWarning(null)
      return false
    }
    const result = await fetchJson<DuplicateCheckResult>(
      `/api/applications/check-duplicate?company=${encodeURIComponent(companyValue)}&job_title=${encodeURIComponent(jobTitleValue)}`
    )
    if (result.duplicate && result.application && result.application.id !== applicationIdRef.current) {
      setDuplicateWarning(
        `You already have an application for ${jobTitleValue} at ${companyValue} ` +
          `(status: ${result.application.status}, applied ${result.application.applied_date}).`
      )
      return true
    }
    setDuplicateWarning(null)
    return false
  }

  async function ensureApplication(): Promise<number> {
    if (applicationIdRef.current) return applicationIdRef.current
    // Job title/company are just tracker labels, not something generation
    // needs — extraction can legitimately miss them (a posting with no
    // named company, an imperfect extraction), and that shouldn't block
    // generating the resume. Fall back to a placeholder and let the row be
    // edited in the Tracker tab afterward instead of erroring out here.
    const finalJobTitle = jobTitle.trim() || 'Untitled Position'
    const finalCompany = company.trim() || 'Unknown Company'
    const created = await fetchJson<Application>('/api/applications', {
      method: 'POST',
      body: JSON.stringify({
        job_title: finalJobTitle,
        company: finalCompany,
        compensation: compensation.trim(),
        job_url: jobUrl.trim(),
        location: location.trim(),
        job_description: jobDescription,
        used_cover_letter: usedCoverLetter,
      }),
    })
    applicationIdRef.current = created.id
    boundCompanyRef.current = created.company
    boundJobTitleRef.current = created.job_title
    setJobTitle(created.job_title)
    setCompany(created.company)
    return created.id
  }

  async function doGenerateResume() {
    setLoading(true)
    setResultMessage({ text: 'Generating resume... (calls the AI, may take up to a minute)' })
    try {
      const id = await ensureApplication()
      const doc = await fetchJson<{ id: number; structured_json: string }>('/api/documents/generate-resume', {
        method: 'POST',
        body: JSON.stringify({ application_id: id, source_ids: selectedSourceIds }),
      })
      const data = JSON.parse(doc.structured_json) as { match_score?: number }
      let text = "Resume generated and saved to your Tracker — you're all set to view it."
      if (typeof data.match_score === 'number') text += ` Match score: ${data.match_score}%.`
      setResultMessage({ text, docId: doc.id })
      setHasResume(true)
      onGenerated()
    } catch (err) {
      setResultMessage({ text: `Generation failed: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setLoading(false)
    }
  }

  async function generateResume() {
    if (!jobDescription.trim()) {
      setResultMessage({ text: 'Paste a job description first.' })
      return
    }
    setLoading(true)
    setResultMessage({ text: 'Extracting job details from the posting...' })
    try {
      const data = await fetchJson<ExtractResult>('/api/documents/extract', {
        method: 'POST',
        body: JSON.stringify({ job_description_text: jobDescription }),
      })
      // A different company/title than whatever applicationIdRef is bound to
      // means this is a new posting pasted over an old draft without
      // clicking Cancel — clear the stale binding so ensureApplication()
      // creates a fresh tracker row instead of overwriting the old one.
      if (
        applicationIdRef.current &&
        ((data.company || '') !== boundCompanyRef.current || (data.job_title || '') !== boundJobTitleRef.current)
      ) {
        applicationIdRef.current = null
        boundCompanyRef.current = null
        boundJobTitleRef.current = null
        setHasResume(false)
      }
      setCompany(data.company || '')
      setJobTitle(data.job_title || '')
      setCompensation(data.compensation || '')
      setLocation(data.location || '')
      const isDuplicate = await checkDuplicate(data.company || '', data.job_title || '')
      if (isDuplicate) {
        setLoading(false)
        setResultMessage(null)
        return
      }
      await doGenerateResume()
    } catch (err) {
      setLoading(false)
      setResultMessage({ text: `Extraction failed: ${err instanceof Error ? err.message : String(err)}` })
    }
  }

  async function generateCoverLetter() {
    setLoading(true)
    setResultMessage({ text: 'Generating cover letter... (calls the AI, may take up to a minute)' })
    try {
      const id = await ensureApplication()
      const doc = await fetchJson<{ id: number }>('/api/documents/generate-cover-letter', {
        method: 'POST',
        body: JSON.stringify({ application_id: id, source_ids: selectedSourceIds }),
      })
      setResultMessage({ text: "Cover letter generated and saved to your Tracker — you're all set to view it.", docId: doc.id })
      onGenerated()
    } catch (err) {
      setResultMessage({ text: `Generation failed: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setLoading(false)
    }
  }

  function toggleSource(id: number, checked: boolean) {
    setSelectedSourceIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resume Builder</CardTitle>
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
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDuplicateWarning(null)
                    doGenerateResume()
                  }}
                >
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
              placeholder="Paste the full job description here, then click Generate Resume below..."
            />
          </div>

          <fieldset className="grid gap-3 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">Job details (filled in automatically when you generate, edit if needed)</legend>
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

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={generateResume} disabled={loading}>
              {loading && <Loader2Icon className="animate-spin" />}
              Generate Resume
            </Button>
            {hasResume && (
              <Button type="button" variant="outline" onClick={generateCoverLetter} disabled={loading}>
                {loading && <Loader2Icon className="animate-spin" />}
                Generate Cover Letter
              </Button>
            )}
            <Button type="button" variant="outline" onClick={reset} disabled={loading}>
              Cancel
            </Button>
          </div>

          {resultMessage && (
            <p className="flex items-center gap-2 text-sm">
              {loading && <Loader2Icon className="size-4 shrink-0 animate-spin text-muted-foreground" />}
              <span>
                {resultMessage.text}{' '}
                {resultMessage.docId && (
                  <a className="text-primary underline" href={`/document.html?id=${resultMessage.docId}`} target="_blank" rel="noreferrer">
                    Open &amp; edit
                  </a>
                )}
              </span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
