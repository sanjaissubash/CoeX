"use client"

import React, { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'

export default function PlanningPanel({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const client = apiClient()
      const res = await client.get(`/projects/${projectId}/tasks`)
      if (res.data && res.data.success) setTasks(res.data.data || [])
    } catch (e) {
      console.error('load tasks', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId])

  const create = async () => {
    if (!title) return
    try {
      const client = apiClient()
      const res = await client.post(`/projects/${projectId}/tasks`, { title })
      if (res.data && res.data.success) {
        setTitle('')
        setOpen(false)
        load()
      }
    } catch (e) {
      console.error('create task', e)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Planning</h3>
        <div>
          <button className="rounded border px-3 py-2" onClick={() => setOpen(true)}>New task</button>
        </div>
      </div>

      {loading ? <div>Loading tasks…</div> : (
        tasks.length === 0 ? (
          <div className="text-sm text-muted-foreground">No tasks yet. Create one.</div>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="p-2 rounded border bg-card">
                <div className="flex justify-between items-center">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-sm text-muted-foreground">{t.status}</div>
                </div>
              </li>
            ))}
          </ul>
        )
      )}

      {/* simple modal */}
      {open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-card rounded p-6 w-full max-w-md">
            <h4 className="font-medium mb-2">New task</h4>
            <input className="w-full border rounded px-3 py-2 mb-3" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded border px-3 py-1">Cancel</button>
              <button onClick={create} className="rounded border px-3 py-1 bg-accent text-white">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
