"use client"
import React, { useEffect, useState } from "react"
import { useAppStore } from "@/store/app"
import { apiClient } from "@/lib/api"

type Workspace = {
  id: string
  name: string
}

export default function WorkspaceSelector() {
  const current = useAppStore((s) => s.currentWorkspace)
  const setCurrent = useAppStore((s) => s.setCurrentWorkspace)
  const initializeWorkspace = useAppStore((s) => s.initializeWorkspace)

  const setFamilies = useAppStore((s) => s.setFamilies)
  const setProjects = useAppStore((s) => s.setProjects)

  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(current?.id || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    const client = apiClient()
    client.get(`/workspaces`).then((res) => {
      if (!mounted) return
      try {
        const j = res.data
        console.debug("WorkspaceSelector: fetched workspaces", j)
        if (j && j.success && Array.isArray(j.data)) {
          const normalized = j.data.map((w: any) => ({ id: String(w.id), name: w.name }))
          setWorkspaces(normalized)
          const storeId = current?.id
          if (storeId) setSelectedId(String(storeId))
          else if (normalized.length > 0) setSelectedId(normalized[0].id)
        }
      } catch (e) {
        setError("Failed to parse response")
      }
      setLoading(false)
    }).catch((e) => {
      if (!mounted) return
      setError(String(e))
      setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  async function switchWorkspace(id: string) {
    // If store initializer exists, prefer to call it so families/projects are refetched
    try {
      setLoading(true)
      // try to find locally
      const chosen = workspaces?.find((w) => String(w.id) === String(id))
      if (chosen) {
        console.debug("WorkspaceSelector: switching to", chosen)
        // reflect selection in the UI immediately
        setSelectedId(String(chosen.id))
  // do not persist workspace selection; app runs in single-global mode
        setCurrent(chosen as any)

        // fetch families and projects directly for immediate update
        const client = apiClient()
        const [familiesRes, projectsRes] = await Promise.all([
          client.get(`/families?workspace_id=${encodeURIComponent(String(chosen.id))}`),
          client.get(`/projects?workspace_id=${encodeURIComponent(String(chosen.id))}`),
        ])

        try {
          if (familiesRes.data && familiesRes.data.success) setFamilies(familiesRes.data.data)
        } catch (e) { /* ignore parse errors */ }

        try {
          if (projectsRes.data && projectsRes.data.success) setProjects(projectsRes.data.data)
        } catch (e) { /* ignore parse errors */ }
      } else {
        // fallback: call initializer which will pick up saved id
        await initializeWorkspace()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 text-left">
      <h3 className="text-lg font-medium">Workspace (developer)</h3>
      <p className="text-sm text-muted-foreground">Switch the active workspace for testing and debugging. This is a developer setting.</p>

      {loading && <div className="text-sm">Loading workspaces…</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}

      {!loading && workspaces && (
        <div className="flex items-center gap-4">
          <select
            value={selectedId || ""}
            onChange={(e) => switchWorkspace(e.target.value)}
            onBlur={(e) => setSelectedId(e.target.value)}
            className="rounded border px-3 py-2"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <button
            onClick={() => {
              // refresh current workspace data
              const id = selectedId || current?.id || workspaces[0]?.id || null
              if (id) switchWorkspace(String(id))
            }}
            className="rounded bg-primary px-3 py-2 text-white"
          >
            Refresh
          </button>
        </div>
      )}

      {!loading && !workspaces && !error && (
        <div className="text-sm text-muted-foreground">No workspaces available</div>
      )}
    </div>
  )
}
