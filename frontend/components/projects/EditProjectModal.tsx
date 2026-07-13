"use client"

import React, { useState } from "react"
import { apiClient } from "@/lib/api"
import { useToast } from "@/components/ui/Toaster"
import { Modal } from "@/components/ui/Modal"
import { Project } from "@/types"
import { PROJECT_LIFECYCLES, PROJECT_STATUSES } from "@/lib/project-options"


export function EditProjectModal({
  open,
  onClose,
  project,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  project: Project
  onSaved: (p: Project) => void
}) {
  const [name, setName] = useState(project.name || "")
  const [description, setDescription] = useState(project.description || "")
  const [lifecycle, setLifecycle] = useState(project.lifecycle || "IDEA")
  const [status, setStatus] = useState(project.status || "ACTIVE")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { push } = useToast()

  // whenever project prop changes, sync local state
  React.useEffect(() => {
    setName(project.name || "")
    setDescription(project.description || "")
    setLifecycle(project.lifecycle || "IDEA")
    setStatus(project.status || "ACTIVE")
  }, [project])

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const client = apiClient()
      const resp = await client.patch(`/projects/${project.id}`, {
        name: name.trim(),
        description: description.trim(),
        lifecycle,
        status,
      })
      if (resp.data.success) {
        onSaved(resp.data.data)
        onClose()
        push({ title: 'Project saved', description: resp.data.data.name || 'Saved' })
      } else {
        setError(resp.data.error || "Failed to save")
      }
    } catch (e) {
      console.error(e)
      setError("Failed to save")
      push({ title: 'Save failed', description: 'Could not save project' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit project">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border border-border px-3 py-2 mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded border border-border px-3 py-2 mt-1" rows={4} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Lifecycle</label>
            <select value={lifecycle} onChange={(e) => setLifecycle(e.target.value)} className="w-full rounded border border-border bg-background px-3 py-2 mt-1">
              {PROJECT_LIFECYCLES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded border border-border bg-background px-3 py-2 mt-1">
              {PROJECT_STATUSES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded border px-3 py-2">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="rounded bg-accent px-3 py-2 text-accent-foreground">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
