"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { apiClient } from "@/lib/api"
import { useToast } from "@/components/ui/Toaster"
import { Edit2, Archive, Share2 } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { EditProjectModal } from "@/components/projects/EditProjectModal"
import { ContextLeakChecker } from "@/components/projects/context-leak-checker"
import { Project } from "@/types"
import { ProjectDetailTabs } from "@/components/projects/detail-tabs-new"


export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [ctxOpen, setCtxOpen] = useState(false)
  const [ctxLoading, setCtxLoading] = useState(false)
  const [ctxMode, setCtxMode] = useState("standard")
  const [ctxText, setCtxText] = useState<string | null>(null)
  const [ctxCopied, setCtxCopied] = useState(false)
  const router = useRouter()
  const { push } = useToast()
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    fetchProject()
  }, [projectId])

  const fetchProject = async () => {
    try {
      const client = apiClient()
      const response = await client.get(`/projects/${projectId}`)
      if (response.data.success) {
        setProject(response.data.data)
      }
    } catch (error) {
      console.error("Failed to fetch project:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyGeneratedContext = async () => {
    const text = ctxText || ""
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    setCtxCopied(true)
    push({ title: "Copied", description: "Project context copied to clipboard" })
    window.setTimeout(() => setCtxCopied(false), 1800)
  }

  const fetchProjectContext = async (mode: string) => {
    setCtxLoading(true)
    try {
      const client = apiClient()
      const res = await client.get(`/projects/${projectId}/context?mode=${mode}`)
      if (res.data && res.data.success) setCtxText(res.data.data.compact_text)
      else setCtxText('Failed to generate context')
    } catch (e) {
      setCtxText('Failed to generate context')
    } finally {
      setCtxLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Project not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">{project.description}</p>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">Stage: {project.lifecycle}</span>
            <span className="text-muted-foreground">Status: {project.status}</span>
            {project.status === 'ARCHIVED' && (
              <span className="ml-2 inline-block rounded-full bg-destructive/20 text-destructive px-2 py-0.5 text-xs">Archived</span>
            )}
            <span className="text-muted-foreground">
              Health: {Number.isFinite(Number(project.health_score)) ? Number(project.health_score).toFixed(0) + '%' : '—'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 hover:bg-secondary"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </button>
          <button onClick={() => {
            setCtxOpen(true)
            setCtxMode("standard")
            fetchProjectContext("standard")
          }} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 hover:bg-secondary">
            <Share2 className="h-4 w-4" />
            Generate Context
          </button>
          <button
            onClick={async () => {
              if (!confirm('Are you sure you want to archive this project?')) return
              setArchiveLoading(true)
              try {
                const client = apiClient()
                const resp = await client.patch(`/projects/${projectId}`, { status: 'ARCHIVED' })
                if (resp.data.success) {
                  // show undo toast with restore action
                  push({
                    title: 'Project archived',
                    description: `${project.name} archived`,
                    action: { label: 'Restore', onClick: async () => {
                      try {
                        const r = await client.patch(`/projects/${projectId}`, { status: 'ACTIVE' })
                        if (r.data.success) {
                          router.push(`/projects/${projectId}`)
                        }
                      } catch (e) {
                        console.error('Failed to restore project', e)
                      }
                    } }
                  })
                  // navigate back to projects list
                  router.push('/projects')
                }
              } catch (err) {
                console.error('Failed to archive project:', err)
                push({ title: 'Archive failed', description: 'Could not archive project' })
              } finally {
                setArchiveLoading(false)
              }
            }}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 hover:bg-secondary"
            disabled={archiveLoading}
          >
            <Archive className="h-4 w-4" />
            {archiveLoading ? 'Archiving...' : 'Archive'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <ProjectDetailTabs projectId={projectId} />

      <EditProjectModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        project={project}
        onSaved={(p) => setProject(p)}
      />

      <Modal open={ctxOpen} onClose={() => setCtxOpen(false)} title="Generated Context">
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Generation Mode</label>
            <select 
              value={ctxMode} 
              onChange={(e) => {
                setCtxMode(e.target.value)
                fetchProjectContext(e.target.value)
              }} 
              className="rounded border border-border bg-background px-2 py-1 text-sm"
              disabled={ctxLoading}
            >
              <option value="standard">Standard (Default)</option>
              <option value="draft_internal">Draft Internal Update</option>
              <option value="draft_client">Draft Client Update</option>
              <option value="readonly_checks">Readonly Checks</option>
              <option value="troubleshoot">Troubleshoot Issue</option>
              <option value="setup_manual">Config Setup (Manual)</option>
              <option value="setup_iac">Config Setup (IaC / Code)</option>
            </select>
          </div>
          {ctxLoading ? (
            <div className="text-sm text-muted-foreground">Generating context...</div>
          ) : (
            <>
              <textarea
                aria-label="Editable generated project context"
                value={ctxText || ''}
                onChange={(event) => setCtxText(event.target.value)}
                className="min-h-[45vh] max-h-[55vh] w-full resize-y overflow-auto rounded border bg-background p-3 font-mono text-sm"
                placeholder="No context available"
              />
              <div className="flex flex-wrap gap-2 justify-end">
                <ContextLeakChecker text={ctxText || ""} />
                <button onClick={copyGeneratedContext} className="rounded bg-accent px-3 py-2 text-accent-foreground">{ctxCopied ? 'Copied' : 'Copy'}</button>
                <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(ctxText || '')}`} download={`${project?.name || 'project'}-context.txt`} className="rounded border px-3 py-2">Export</a>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
