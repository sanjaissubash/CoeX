"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { apiClient } from "@/lib/api"
import { Pin, Trash2, Edit2 } from "lucide-react"
import { EditNoteModal } from "@/components/notes/EditNoteModal"

export function NotesSection({ projectId }: { projectId: string }) {
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [editing, setEditing] = useState<any | null>(null)

  useEffect(() => { fetchNotes() }, [projectId])

  const fetchNotes = async () => {
    try {
      const client = apiClient()
      const response = await client.get(`/notes?project_id=${projectId}`)
      if (response.data.success) setNotes(response.data.data)
    } catch (err) {
      console.error("Failed to fetch notes:", err)
    } finally { setLoading(false) }
  }

  const handleAdd = async () => {
    if (!title.trim()) return
    try {
      const client = apiClient()
      const response = await client.post(`/notes`, {
        project_id: projectId,
        note_type: "project",
        title,
        content,
      })
      if (response.data.success) setNotes([response.data.data, ...notes])
      setTitle(""); setContent(""); setShowAdd(false)
    } catch (err) {
      console.error("Failed to add note:", err)
    }
  }

  const handleDeleteNote = async (id: string) => {
    try {
      const client = apiClient()
      const response = await client.delete(`/notes/${id}`)
      if (response.data.success) setNotes(notes.filter(n => n.id !== id))
    } catch (err) {
      console.error("Failed to delete note:", err)
    }
  }

  if (loading) return <div className="text-muted-foreground text-sm">Loading notes...</div>

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Notes ({notes.length})</h4>
        <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-accent hover:underline">{showAdd ? "Cancel" : "+ Add Note"}</button>
      </div>

      {showAdd && (
        <div className="space-y-2">
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" className="w-full rounded border px-3 py-2"/>
          <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Content" className="w-full rounded border px-3 py-2"/>
          <div className="flex justify-end">
            <button onClick={handleAdd} className="rounded bg-accent px-3 py-2 text-accent-foreground">Add</button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="text-xs text-muted-foreground">No notes yet</div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-border p-2 hover:bg-secondary/50">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">{note.title}</div>
                    {note.pinned && <Pin className="h-3 w-3 text-accent" />}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{note.content}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => setEditing(note)} className="p-1 hover:bg-secondary rounded"><Edit2 className="h-3 w-3 text-muted-foreground" /></button>
                  <button onClick={async () => {
                    try {
                      const client = apiClient()
                      const res = await client.put(`/notes/${note.id}`, { pinned: !note.pinned })
                      if (res.data.success) setNotes(notes.map(n => n.id === note.id ? res.data.data : n))
                    } catch (err) { console.error('Failed to toggle pin', err) }
                  }} className="p-1 hover:bg-secondary rounded">
                    <Pin className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-1 hover:bg-destructive/20 rounded"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </button>
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
