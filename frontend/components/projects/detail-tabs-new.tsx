"use client"

import React, { useEffect, useState } from "react"
import { apiClient } from "@/lib/api"
import { useToast } from "@/components/ui/Toaster"
import { ContextBlocksSection } from "@/components/projects/sections/context-blocks-section"
import { ArchitectureOverviewSection } from "@/components/projects/sections/architecture-overview"
import { ImprovementsSection } from "@/components/projects/sections/improvements-section"
import { DecisionsSection } from "@/components/projects/sections/decisions-section"
import { NotesSection } from "@/components/projects/sections/notes-section"
import { ResearchSection } from "@/components/projects/sections/research-section"
import { ComplianceSection } from "@/components/projects/sections/compliance-section"
import { TasksSection } from "@/components/projects/sections/tasks-section"

interface DetailTabsProps {
  projectId: string
}

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "planning", label: "Planning" },
  { id: "knowledge", label: "Knowledge" },
  { id: "assets", label: "Assets" },
  { id: "compliance", label: "Compliance" },
]

function OverviewPane({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ tasks: 0, notes: 0, decisions: 0, context_blocks: 0 })

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const client = apiClient()
        const [tasksRes, notesRes, decRes, ctxRes] = await Promise.all([
          client.get(`/projects/${projectId}/tasks`).catch(() => ({ data: { data: [] } })),
          client.get(`/notes?project_id=${projectId}`).catch(() => ({ data: { data: [] } })),
          client.get(`/projects/${projectId}/decisions`).catch(() => ({ data: { data: [] } })),
          client.get(`/projects/${projectId}/context-blocks`).catch(() => ({ data: { data: [] } })),
        ])

        if (!mounted) return

        setStats({
          tasks: tasksRes.data?.data?.length || 0,
          notes: notesRes.data?.data?.length || 0,
          decisions: decRes.data?.data?.length || 0,
          context_blocks: ctxRes.data?.data?.length || 0,
        })
      } catch (e) {
        console.error("Overview load failed", e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [projectId])

  if (loading) return <div className="p-6">Loading overview…</div>

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-bold">Overview</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-secondary/5 p-4 text-center">
          <div className="text-sm text-muted-foreground">Tasks</div>
          <div className="text-xl font-semibold">{stats.tasks}</div>
        </div>
        <div className="rounded-lg border border-border bg-secondary/5 p-4 text-center">
          <div className="text-sm text-muted-foreground">Notes</div>
          <div className="text-xl font-semibold">{stats.notes}</div>
        </div>
        <div className="rounded-lg border border-border bg-secondary/5 p-4 text-center">
          <div className="text-sm text-muted-foreground">Decisions</div>
          <div className="text-xl font-semibold">{stats.decisions}</div>
        </div>
        <div className="rounded-lg border border-border bg-secondary/5 p-4 text-center">
          <div className="text-sm text-muted-foreground">Context Blocks</div>
          <div className="text-xl font-semibold">{stats.context_blocks}</div>
        </div>
      </div>

      <div>
        <h4 className="font-medium">Quick links</h4>
        <div className="text-sm text-muted-foreground">Recent items and shortcuts will appear here.</div>
      </div>
    </div>
  )
}

export function ProjectDetailTabs({ projectId }: DetailTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("overview")

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id ? "border-accent text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card">
        {activeTab === "overview" && <OverviewPane projectId={projectId} />}

        {activeTab === "planning" && (
          <div className="p-6">
            <TasksSection projectId={projectId} />
          </div>
        )}

        {activeTab === "knowledge" && (
          <div className="space-y-6 p-6">
            <h3 className="text-lg font-bold">Knowledge</h3>
            <ContextBlocksSection projectId={projectId} />
            <ArchitectureOverviewSection projectId={projectId} />
            <ImprovementsSection projectId={projectId} />
            <NotesSection projectId={projectId} />
            <ResearchSection projectId={projectId} />
            <DecisionsSection projectId={projectId} />
          </div>
        ) }

        {activeTab === "assets" && (
          <AssetsPanel projectId={projectId} />
        )}



        {activeTab === "compliance" && (
          <ComplianceSection projectId={projectId} />
        )}
      </div>
    </div>
  )
}

function AssetsPanel({ projectId }: { projectId: string }) {
  const [assets, setAssets] = useState<Array<any>>([])
  const [folders, setFolders] = useState<Array<any>>([])
  const [currentFolder, setCurrentFolder] = useState<number | null>(null)
  const [newFolderName, setNewFolderName] = useState("")
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const { push } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const client = apiClient()
      const [resAssets, resFolders] = await Promise.all([
        client.get(`/projects/${projectId}/assets`).catch(() => ({ data: { data: [] } })),
        client.get(`/projects/${projectId}/asset-folders`).catch(() => ({ data: { data: [] } })),
      ])
      if (resAssets.data && resAssets.data.success) setAssets(resAssets.data.data || [])
      if (resFolders.data && resFolders.data.success) setFolders(resFolders.data.data || [])
    } catch (e) {
      console.error('Failed to load assets', e)
      push({ title: 'Failed to load assets' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [projectId])

  const onFile = async (f: File | null) => {
    if (!f) return
    setUploading(true)
    try {
      const client = apiClient()
      const form = new FormData()
      form.append('file', f)
      if (currentFolder) form.append('folder_id', String(currentFolder))
      const res = await client.post(`/projects/${projectId}/assets`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (res.data && res.data.success) {
        push({ title: 'Uploaded', description: res.data.data?.name })
        load()
      } else {
        push({ title: 'Upload failed' })
      }
    } catch (e) {
      console.error('Upload error', e)
      push({ title: 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  const onFolder = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const client = apiClient()
      const form = new FormData()
      Array.from(files).forEach((file) => {
        form.append('files', file)
        form.append('relative_paths', (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name)
      })
      if (currentFolder) form.append('folder_id', String(currentFolder))
      const res = await client.post(`/projects/${projectId}/assets/folder`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (res.data && res.data.success) {
        push({ title: 'Folder uploaded', description: `${res.data.data?.asset_count || files.length} files added` })
        load()
      } else {
        push({ title: 'Folder upload failed' })
      }
    } catch (e) {
      console.error('Folder upload error', e)
      push({ title: 'Folder upload failed' })
    } finally {
      setUploading(false)
    }
  }

  const createFolder = async () => {
    if (!newFolderName) return push({ title: 'Folder name required' })
    try {
      const client = apiClient()
      const res = await client.post(`/projects/${projectId}/asset-folders`, { name: newFolderName, parent_id: null })
      if (res.data && res.data.success) {
        push({ title: 'Folder created' })
        setNewFolderName("")
        load()
      } else {
        push({ title: 'Failed to create folder' })
      }
    } catch (e) {
      console.error('Create folder error', e)
      push({ title: 'Failed to create folder' })
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-bold">Assets</h3>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="rounded border px-3 py-2 cursor-pointer">
            <input type="file" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            {uploading ? 'Uploading...' : 'Upload file'}
          </label>
          <label className="rounded border px-3 py-2 cursor-pointer">
            <input
              type="file"
              className="hidden"
              multiple
              {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
              onChange={(e) => onFolder(e.target.files)}
            />
            Upload folder
          </label>
          <button onClick={load} className="rounded border px-3 py-2">Reload</button>
        </div>

        <div className="flex items-center gap-2">
          <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="New folder" className="rounded border px-3 py-2" />
          <button onClick={createFolder} className="rounded border px-3 py-2">Create folder</button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="w-1/4">
          <h4 className="font-medium">Folders</h4>
          <ul className="mt-2 space-y-2">
            <li key="root" className={`p-2 rounded border ${currentFolder===null? 'bg-accent/10':''}`} onClick={() => setCurrentFolder(null)}>Root</li>
            {folders.map((f: any) => (
              <li key={f.id} className={`p-2 rounded border ${currentFolder===f.id? 'bg-accent/10':''}`} onClick={() => setCurrentFolder(f.id)}>{f.path}</li>
            ))}
          </ul>
        </div>

        <div className="flex-1">
          <h4 className="font-medium">Files</h4>

          {loading ? (
        <div className="text-sm text-muted-foreground">Loading assets…</div>
            ) : assets.length === 0 ? (
              <div className="text-sm text-muted-foreground">No assets uploaded yet.</div>
            ) : (
              // gallery grid: thumbnails for images, text preview for text files,
              // and a fallback row for others.
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {assets
                  .filter((a) => (currentFolder ? a.file_path.includes((folders.find((f) => f.id === currentFolder) || {}).path) : true))
                  .map((a: any) => {
                    const apiBase = (typeof window !== 'undefined' ? localStorage.getItem('projectos_api_url') || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8082/api' : '')
                    const downloadUrl = `${apiBase}/projects/${projectId}/assets/download/${a.id}`
                    const inlineUrl = `${downloadUrl}?inline=1`
                    const isImage = a.file_type?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(a.name)
                    const isText = a.file_type?.startsWith('text/') || /\.(txt|md|csv|json|log|xml)$/i.test(a.name)

                    return (
                      <div key={a.id} className="rounded border p-3 pb-6 bg-card flex flex-col justify-between min-h-[300px] relative overflow-hidden">
                        <div className="h-40 mb-2 flex items-center justify-center overflow-hidden bg-muted/10 relative z-0">
                          {isImage ? (
                            // show image thumbnail using the inline endpoint
                            // limit size via CSS and keep image beneath footer
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={inlineUrl} alt={a.name} className="h-full w-full object-contain relative z-0" />
                          ) : isText ? (
                            <iframe src={inlineUrl} title={a.name} className="w-full h-full border-0 relative z-0 pointer-events-auto" />
                          ) : (
                            <div className="text-sm text-muted-foreground">No preview available</div>
                          )}
                        </div>
                        <div className="mt-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate" title={a.name}>{a.name}</div>
                            <div className="text-sm text-muted-foreground">{Math.round((a.size_bytes || 0) / 1024)} KB</div>
                          </div>
                        </div>

                        {/* Footer in normal flow so buttons are always visible */}
                        <div className="mt-3 flex justify-end relative z-30">
                          <div className="flex gap-2 items-center bg-card/80 backdrop-blur-sm rounded px-2 py-1">
                            <button
                              onClick={(e) => { e.preventDefault(); window.open(inlineUrl, '_blank') }}
                              className="inline-flex items-center justify-center text-sm rounded border px-3 py-1 bg-card"
                              title="Open preview"
                              aria-label={`Open ${a.name}`}
                            >
                              Open
                            </button>

                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="inline-flex items-center justify-center text-sm rounded border px-3 py-1 bg-card"
                              title="Download file"
                              aria-label={`Download ${a.name}`}
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
