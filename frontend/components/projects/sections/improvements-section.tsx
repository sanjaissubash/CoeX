"use client"

import React, { useEffect, useState } from "react"
import { apiClient } from "@/lib/api"
import { useToast } from "@/components/ui/Toaster"
import { ShieldAlert, AlertTriangle, CheckCircle2, Check } from "lucide-react"

export function ImprovementsSection({ projectId }: { projectId: string }) {
  const { push } = useToast()
  const [blocks, setBlocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createdTaskIds, setCreatedTaskIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchBlocks()
  }, [projectId])

  const fetchBlocks = async () => {
    try {
      const client = apiClient()
      const response = await client.get(`/projects/${projectId}/context-blocks?block_type=improvements`)
      if (response.data.success) {
        setBlocks(response.data.data)
      }
    } catch (err) {
      console.error("Failed to fetch improvements:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async (itemKey: string, title: string, description: string) => {
    try {
      const client = apiClient()
      const res = await client.post(`/projects/${projectId}/tasks`, {
        title: title || "Security & Infrastructure Improvement",
        description,
        priority: "high",
        status: "open",
      })
      if (res.data && res.data.success) {
        push({ title: "Task Created", description: "Linked security improvement to planning checklist." })
        setCreatedTaskIds((prev: Record<string, boolean>) => ({ ...prev, [itemKey]: true }))
      }
    } catch (e) {
      console.error("Task creation failed", e)
      push({ title: "Failed to create task" })
    }
  }

  if (loading) {
    return <div className="text-muted-foreground text-sm">Loading security recommendations...</div>
  }

  // Parse lines to render security warning cards with per-item Create Task buttons
  const formatAuditText = (text: string, blockId: string) => {
    const lines = text.split("\n")
    return lines.map((line, i) => {
      const itemKey = `${blockId}-${i}`

      if (line.startsWith("⚠️") || line.startsWith("🚨") || line.toLowerCase().includes("critical") || line.toLowerCase().includes("exposure")) {
        const cleaned = line.replace(/^[⚠️🚨\s*-]+/, "").trim()
        return (
          <div key={itemKey} className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 my-2.5 text-sm text-red-200">
            <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="leading-normal flex-1">{cleaned}</div>
            {createdTaskIds[itemKey] ? (
              <span className="text-xs text-green-400 font-medium flex items-center gap-1 flex-shrink-0">
                <Check className="h-3 w-3" />
                Created
              </span>
            ) : (
              <button
                onClick={() => handleCreateTask(itemKey, cleaned, line)}
                className="flex-shrink-0 rounded border border-red-500/40 bg-red-500/10 px-2.5 py-1 hover:bg-red-500/20 text-xs font-medium text-red-300 transition-colors"
              >
                Create Task
              </button>
            )}
          </div>
        )
      }
      if (line.startsWith("✅")) {
        const cleaned = line.replace(/^[✅\s*-]+/, "").trim()
        return (
          <div key={itemKey} className="flex items-start gap-2.5 rounded-lg border border-green-500/30 bg-green-500/10 p-3.5 my-2.5 text-sm text-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
            <div className="leading-normal flex-1">{cleaned}</div>
            {createdTaskIds[itemKey] ? (
              <span className="text-xs text-green-400 font-medium flex items-center gap-1 flex-shrink-0">
                <Check className="h-3 w-3" />
                Created
              </span>
            ) : (
              <button
                onClick={() => handleCreateTask(itemKey, cleaned, line)}
                className="flex-shrink-0 rounded border border-green-500/40 bg-green-500/10 px-2.5 py-1 hover:bg-green-500/20 text-xs font-medium text-green-300 transition-colors"
              >
                Create Task
              </button>
            )}
          </div>
        )
      }
      return <p key={itemKey} className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{line}</p>
    })
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <ShieldAlert className="h-5 w-5 text-accent" />
        <h4 className="font-bold text-base">Security & Infrastructure Improvements</h4>
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-secondary/5 p-4 text-sm text-muted-foreground">
          No security audit details available. Upload a Terraform state file or diagram to inspect configurations.
        </div>
      ) : (
        <div className="space-y-4">
          {blocks.map((block) => (
            <div key={block.id} className="prose prose-sm dark:prose-invert max-w-none">
              <h5 className="text-sm font-semibold text-accent mb-2">{block.title}</h5>
              <div className="space-y-1">
                {formatAuditText(block.content, block.id)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
