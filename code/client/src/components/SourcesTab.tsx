import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { fetchJson } from '@/lib/api'
import type { Source } from '@/lib/types'

function SourceCard({ source, onChanged }: { source: Source; onChanged: () => void }) {
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
        <div className="flex gap-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="flex-1" />
          <Button type="button" variant="destructive" onClick={remove}>
            Delete
          </Button>
        </div>
        <Textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
        <Button type="button" size="sm" className="w-fit" disabled={saving} onClick={save}>
          Save
        </Button>
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
            <Textarea
              rows={8}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Paste raw detail here..."
            />
            <Button type="submit" className="w-fit">
              Add Source
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
