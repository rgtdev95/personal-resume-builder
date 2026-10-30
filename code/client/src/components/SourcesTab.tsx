import { useEffect, useMemo, useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon, FileText, Plus, Trash2 } from 'lucide-react'
import { marked } from 'marked'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { fetchJson } from '@/lib/api'
import type { Source } from '@/lib/types'

// Pasted-in content is always the user's own (single-user, localhost app),
// so this skips HTML sanitization — there's no untrusted-author threat
// model here to sanitize against.
function MarkdownPreview({ text }: { text: string }) {
  const html = useMemo(() => marked.parse(text || '*Nothing to preview yet.*', { async: false }) as string, [text])
  return <div className="markdown-preview rounded-md border p-3 text-sm" dangerouslySetInnerHTML={{ __html: html }} />
}

// Shared by the "Add new entry" form and each SourceCard's editor — an
// Edit/Preview toggle over one Textarea instead of two separately-managed
// panes.
function ContentEditor({ content, onChange, rows }: { content: string; onChange: (v: string) => void; rows: number }) {
  return (
    <Tabs defaultValue="edit" className="work-history-editor">
      <TabsList>
        <TabsTrigger value="edit">Edit</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
      </TabsList>
      <TabsContent value="edit">
        <Textarea aria-label="Work history content" rows={rows} value={content} onChange={(e) => onChange(e.target.value)} placeholder="Paste raw detail here (Markdown supported)..." />
      </TabsContent>
      <TabsContent value="preview">
        <MarkdownPreview text={content} />
      </TabsContent>
    </Tabs>
  )
}

// Entries can be long (a whole pasted resume) — collapsed by default so the
// tab stays scannable; expand only the ones you need to read or edit.
function SourceCard({ source, onChanged }: { source: Source; onChanged: () => void }) {
  const [collapsed, setCollapsed] = useState(true)
  const [title, setTitle] = useState(source.title)
  const [content, setContent] = useState(source.content)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await fetchJson(`/api/sources/${source.id}`, { method: 'PUT', body: JSON.stringify({ title, content }) })
      toast.success('Saved.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!confirm('Delete this source entry? This cannot be undone.')) return
    await fetchJson(`/api/sources/${source.id}`, { method: 'DELETE' })
    onChanged()
  }

  return (
    <Card className="source-entry">
      <CardContent className="flex flex-col gap-3">
        <div className="source-entry-header flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex flex-1 items-center gap-2 text-left"
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate font-medium">{title || 'Untitled'}</span>
            {collapsed && (
              <span className="shrink-0 text-xs text-muted-foreground">{content.length.toLocaleString()} chars</span>
            )}
          </button>
          <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${title || 'untitled entry'}`} onClick={remove}>
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
        {!collapsed && (
          <div className="source-entry-body">
            <Input aria-label="Entry title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
            <ContentEditor content={content} onChange={setContent} rows={10} />
            <Button type="button" size="sm" className="w-fit" disabled={saving} onClick={save}>
              Save
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function SourcesTab() {
  const [sources, setSources] = useState<Source[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [adding, setAdding] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  function load() {
    fetchJson<Source[]>('/api/sources').then(setSources)
  }

  useEffect(load, [])

  async function addSource(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    try {
      await fetchJson('/api/sources', { method: 'POST', body: JSON.stringify({ title: newTitle, content: newContent }) })
      setNewTitle('')
      setNewContent('')
      setAddOpen(false)
      load()
      toast.success('Work history added.')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not add work history.') }
    finally { setAdding(false) }
  }

  return (
    <div className="sources-layout">
      <div className="sources-toolbar">
        <p className="sources-introduction">Keep the full story here: past resumes, role responsibilities, project write-ups, and achievements. Choose the relevant entries when tailoring each resume.</p>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button type="button"><Plus aria-hidden="true" />Add work history</Button></DialogTrigger>
          <DialogContent className="sources-add">
            <DialogHeader><DialogTitle>Add work history</DialogTitle><DialogDescription>Add a role, project, or other experience to your library.</DialogDescription></DialogHeader>
            <form onSubmit={addSource} className="flex flex-col gap-3">
              <Label htmlFor="source-title">Entry title</Label>
              <Input id="source-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title (e.g. 'Resume 2023' or 'Acme Corp role')" />
              <ContentEditor content={newContent} onChange={setNewContent} rows={8} />
              <Button type="submit" className="w-fit" disabled={adding}><Plus aria-hidden="true" />{adding ? 'Adding...' : 'Add to work history'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="sources-list">
      <div className="sources-list-heading">Your experience library<span>{sources.length} {sources.length === 1 ? 'entry' : 'entries'}</span></div>
      {sources.length === 0 && <div className="tracker-surface workspace-empty"><FileText aria-hidden="true" /><h2>Give your resume a foundation</h2><p>Add your work experience using the button above. Detailed responsibilities and achievements make for better tailored documents.</p></div>}
      {sources.map((s) => (
        <SourceCard key={s.id} source={s} onChanged={load} />
      ))}

      </div>
    </div>
  )
}
