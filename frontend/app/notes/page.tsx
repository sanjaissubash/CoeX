"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api"
import { EditNoteModal } from "@/components/notes/EditNoteModal"
import { Edit2, Pin } from "lucide-react"

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [editing, setEditing] = useState<any | null>(null)

  useEffect(() => { fetchNotes() }, [])

  const fetchNotes = async () => {
    try {
      const client = apiClient()
      const res = await client.get('/notes')
      if (res.data.success) setNotes(res.data.data)
    } catch (err) {
      console.error('Failed to fetch notes', err)
    } finally { setLoading(false) }
  }

  const handleCreate = async () => {
    if (!title.trim()) return
    try {
      const client = apiClient()
      const res = await client.post('/notes', { note_type: 'global', title, content })
      if (res.data.success) setNotes([res.data.data, ...notes])
      setTitle(''); setContent('')
    } catch (err) {
      console.error('Failed to create note', err)
    }
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Notes</h1>
        <p className="text-muted-foreground">Global notes (not tied to a product)</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="space-y-3">
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" className="w-full rounded border px-3 py-2" />
          <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Content" className="w-full rounded border px-3 py-2" rows={4} />
          <div className="flex justify-end">
            <button onClick={handleCreate} className="rounded bg-accent px-3 py-2 text-accent-foreground">Create</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-2">
          {notes.map(n => (
              <div key={n.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{n.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">{n.content}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => setEditing(n)} className="p-1 hover:bg-secondary rounded"><Edit2 className="h-4 w-4 text-muted-foreground" /></button>
                    <button onClick={async () => {
                      try {
                        const client = apiClient()
                        const res = await client.put(`/notes/${n.id}`, { pinned: !n.pinned })
                        if (res.data.success) setNotes(notes.map(x => x.id === n.id ? res.data.data : x))
                      } catch (err) { console.error('Failed toggle pin', err) }
                    }} className="p-1 hover:bg-secondary rounded"><Pin className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
              </div>
              </div>
            ))}
        </div>
      )}

        <EditNoteModal open={!!editing} onClose={() => setEditing(null)} note={editing} onSaved={(n) => {
          setNotes(notes.map(x => x.id === n.id ? n : x))
          setEditing(null)
        }} />
    </div>
  )
}
