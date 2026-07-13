"use client"

import React, { useState } from "react"
import { apiClient } from "@/lib/api"
import { Modal } from "@/components/ui/Modal"

export function EditNoteModal({
  open,
  onClose,
  note,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  note: any
  onSaved: (n: any) => void
}) {
  const [title, setTitle] = useState(note?.title || "")
  const [content, setContent] = useState(note?.content || "")
  const [pinned, setPinned] = useState<boolean>(!!note?.pinned)
  const [loading, setLoading] = useState(false)

  React.useEffect(() => {
    setTitle(note?.title || "")
    setContent(note?.content || "")
    setPinned(!!note?.pinned)
  }, [note])

  const handleSave = async () => {
    if (!note) return
    setLoading(true)
    try {
      const client = apiClient()
      const res = await client.put(`/notes/${note.id}`, { title: title.trim(), content: content.trim(), pinned })
      if (res.data.success) {
        onSaved(res.data.data)
        onClose()
      }
    } catch (err) {
      console.error('Failed to save note', err)
      alert('Failed to save note')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title="Edit note">
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Title</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full rounded border border-border px-3 py-2 mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium">Content</label>
          <textarea value={content} onChange={e=>setContent(e.target.value)} className="w-full rounded border border-border px-3 py-2 mt-1" rows={6} />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2"><input type="checkbox" checked={pinned} onChange={e=>setPinned(e.target.checked)} /> <span className="text-sm">Pinned</span></label>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded border px-3 py-2">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="rounded bg-accent px-3 py-2 text-accent-foreground">{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  )
}
