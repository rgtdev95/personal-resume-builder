import { useEffect, useMemo, useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react'
import { marked } from 'marked'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
    <Tabs defaultValue="edit">
      <TabsList>
        <TabsTrigger value="edit">Edit</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
      </TabsList>
      <TabsContent value="edit">
        <Textarea rows={rows} value={content} onChange={(e) => onChange(e.target.value)} placeholder="Paste raw detail here (Markdown supported)..." />
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
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
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
          <Button type="button" variant="destructive" size="sm" onClick={remove}>
            Delete
          </Button>
        </div>
        {!collapsed && (
          <>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
            <ContentEditor content={content} onChange={setContent} rows={10} />
            <Button type="button" size="sm" className="w-fit" disabled={saving} onClick={save}>
              Save
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function SourcesTab() {
  const [sources, setSources] = useState<Source[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')

  function load() {
    fetchJson<Source[]>('/api/sources').then(setSources)
  }

  useEffect(load, [])

  async function addSource(e: React.FormEvent) {
    e.preventDefault()
    await fetchJson('/api/sources', { method: 'POST', body: JSON.stringify({ title: newTitle, content: newContent }) })
    setNewTitle('')
    setNewContent('')
    load()
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium">Work History &mdash; Source of Truth</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Paste raw, detailed work history here (old resumes, bullet dumps, project write-ups). Add as many entries as
          you want &mdash; the AI reads all of it when tailoring a resume or cover letter.
        </p>
      </div>

      {sources.length === 0 && <p className="text-sm italic text-muted-foreground">No source entries yet.</p>}
      {sources.map((s) => (
        <SourceCard key={s.id} source={s} onChanged={load} />
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Add new entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addSource} className="flex flex-col gap-3">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title (e.g. 'Resume 2023' or 'Acme Corp role')"
            />
            <ContentEditor content={newContent} onChange={setNewContent} rows={8} />
            <Button type="submit" className="w-fit">
              Add Source
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
