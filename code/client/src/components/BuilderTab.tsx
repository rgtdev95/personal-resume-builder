import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowUpRight, Check, FileText, Loader2Icon, RotateCcw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

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
  active,
  loadApplicationId,
  loadRequest,
  onGenerated,
  onViewExisting,
}: {
  active: boolean
  loadApplicationId: number | null
  loadRequest: number
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

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const knownSourceIdsRef = useRef(new Set<number>())
  const [selectedSourceIds, setSelectedSourceIds] = useState<number[]>([])
  const [resultMessage, setResultMessage] = useState<{ text: string; docId?: number } | null>(null)
  const [loading, setLoading] = useState(false)
  // Cover Letter generation is only offered once a resume exists for this
  // draft — either just generated, or already present on an application
  // loaded from the Tracker tab — not as a standing option up front.
  const [hasResume, setHasResume] = useState(false)

  function loadSources(resetSelection = false) {
    fetchJson<Source[]>('/api/sources').then((all) => {
      const previousIds = knownSourceIdsRef.current
      setSources(all)
      setSelectedSourceIds((selected) => all.filter((source) => resetSelection || selected.includes(source.id) || !previousIds.has(source.id)).map((source) => source.id))
      knownSourceIdsRef.current = new Set(all.map((source) => source.id))
    }).catch((error: Error) => setResultMessage({ text: `Could not load work history: ${error.message}. Return to this section to try again.` }))
  }

  useEffect(() => { if (active) loadSources() }, [active])

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
      setHasResume(!!app.resume_id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadApplicationId, loadRequest])

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
    setDuplicateWarning(null)
    setResultMessage(null)
    setHasResume(false)
    loadSources(true)
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

  async function ensureApplication(details?: ExtractResult): Promise<number> {
    if (applicationIdRef.current) return applicationIdRef.current
    // Job title/company are just tracker labels, not something generation
    // needs — extraction can legitimately miss them (a posting with no
    // named company, an imperfect extraction), and that shouldn't block
    // generating the resume. Fall back to a placeholder and let the row be
    // edited in the Tracker tab afterward instead of erroring out here.
    const finalJobTitle = (details?.job_title ?? jobTitle).trim() || 'Untitled Position'
    const finalCompany = (details?.company ?? company).trim() || 'Unknown Company'
    const created = await fetchJson<Application>('/api/applications', {
      method: 'POST',
      body: JSON.stringify({
        job_title: finalJobTitle,
        company: finalCompany,
        compensation: (details?.compensation ?? compensation).trim(),
        job_url: jobUrl.trim(),
        location: (details?.location ?? location).trim(),
        job_description: jobDescription,
      }),
    })
    applicationIdRef.current = created.id
    boundCompanyRef.current = created.company
    boundJobTitleRef.current = created.job_title
    setJobTitle(created.job_title)
    setCompany(created.company)
    return created.id
  }

  async function doGenerateResume(details?: ExtractResult) {
    setLoading(true)
    setResultMessage({ text: 'Generating resume... (calls the AI, may take up to a minute)' })
    try {
      const id = await ensureApplication(details)
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
      await doGenerateResume(data)
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
    <div className="resume-studio">
      {duplicateWarning && <Alert className="studio-warning"><AlertTriangle /><AlertDescription><p>{duplicateWarning}</p><div className="flex flex-wrap gap-2 mt-3"><Button type="button" variant="outline" onClick={() => { reset(); onViewExisting() }}>View existing application</Button><Button type="button" variant="outline" onClick={() => { setDuplicateWarning(null); doGenerateResume() }}>Proceed anyway</Button></div></AlertDescription></Alert>}
      <section className="studio-posting">
        <div className="section-heading"><div><h2>The opportunity</h2><p>Start with the role you have in mind.</p></div><FileText aria-hidden="true" /></div>
        <div className="studio-fields">
          <div className="field-group"><Label htmlFor="job_url">Job posting URL <span className="optional-label">Optional</span></Label><Input id="job_url" type="url" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} placeholder="https://company.com/careers/role" /></div>
          <div className="field-group posting-description"><Label htmlFor="job_description">Job description</Label><Textarea id="job_description" rows={16} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the full job description here. Include the responsibilities, requirements, and anything else the employer is looking for." /><div className="field-footer"><span>Job details are extracted when you generate.</span><span>{jobDescription.length.toLocaleString()} characters</span></div></div>
        </div>
      </section>
      <div className="studio-side">
      <div className="studio-context">
        <section className="studio-section">
          <div className="section-heading"><div><h2>Job details</h2><p>Filled automatically. You can edit them here.</p></div></div>
          <div className="job-details-grid">
            <div className="field-group"><Label htmlFor="job_title">Job title</Label><Input id="job_title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} onBlur={() => checkDuplicate(company, jobTitle)} placeholder="e.g. Software Engineer" /></div>
            <div className="field-group"><Label htmlFor="company">Company</Label><Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} onBlur={() => checkDuplicate(company, jobTitle)} placeholder="Company name" /></div>
            <div className="field-group"><Label htmlFor="compensation">Compensation</Label><Input id="compensation" value={compensation} onChange={(e) => setCompensation(e.target.value)} placeholder="Salary or range" /></div>
            <div className="field-group"><Label htmlFor="location">Location</Label><Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or remote" /></div>
          </div>
        </section>
        <section className="studio-section">
          <div className="section-heading"><div><h2>Your experience</h2><p>Choose the work history to draw from.</p></div><span className="selection-count">{selectedSourceIds.length} selected</span></div>
          <div className="source-checklist">
            {sources.length === 0 && <div className="inline-empty"><p>No work history yet. Add your experience before tailoring a resume.</p><span>Open Work history from the sidebar to get started.</span></div>}
            {sources.map((source) => <label key={source.id} className="source-choice"><Checkbox checked={selectedSourceIds.includes(source.id)} onCheckedChange={(checked) => toggleSource(source.id, checked === true)} /><FileText aria-hidden="true" /><span>{source.title || `Source #${source.id}`}</span></label>)}
          </div>
        </section>
      </div>
      <div className="studio-actionbar"><div className="studio-action-note"><FileText aria-hidden="true" /><span>Tailored to this role<span>Your generated documents are saved to Applications.</span></span></div><div className="flex flex-wrap gap-2"><Button type="button" variant="ghost" onClick={reset} disabled={loading}><RotateCcw aria-hidden="true" />Clear draft</Button>{hasResume && <Button type="button" variant="outline" onClick={generateCoverLetter} disabled={loading}>{loading && <Loader2Icon className="animate-spin" />}Generate cover letter</Button>}<Button type="button" onClick={generateResume} disabled={loading}>{loading ? <Loader2Icon className="animate-spin" /> : <FileText aria-hidden="true" />}{loading ? 'Working on your documents…' : 'Generate resume'}{!loading && <ArrowUpRight aria-hidden="true" />}</Button></div></div>
      {resultMessage && <div className={`generation-result ${resultMessage.docId ? 'is-complete' : ''}`} role="status">{loading ? <Loader2Icon className="size-4 animate-spin" /> : resultMessage.docId ? <Check className="size-4" /> : null}<span>{resultMessage.text}</span>{resultMessage.docId && <a href={`/document.html?id=${resultMessage.docId}`} target="_blank" rel="noreferrer">Open &amp; edit<ArrowUpRight aria-hidden="true" /></a>}</div>}
      </div>
    </div>
  )
}
