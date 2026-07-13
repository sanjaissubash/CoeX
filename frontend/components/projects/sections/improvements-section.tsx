"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api"
import { ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react"

export function ImprovementsSection({ projectId }: { projectId: string }) {
  const [blocks, setBlocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return <div className="text-muted-foreground text-sm">Loading security recommendations...</div>
  }

  // Parse lines to render security warning cards nicely in the UI
  const formatAuditText = (text: string) => {
    const lines = text.split("\n")
    return lines.map((line, i) => {
      if (line.startsWith("⚠️") || line.startsWith("🚨") || line.toLowerCase().includes("critical") || line.toLowerCase().includes("exposure")) {
        return (
          <div key={i} className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 my-2.5 text-sm text-red-200">
            <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="leading-normal">{line.replace(/^[⚠️🚨\s*-]+/, "")}</div>
          </div>
        )
      }
      if (line.startsWith("✅")) {
        return (
          <div key={i} className="flex items-start gap-2.5 rounded-lg border border-green-500/30 bg-green-500/10 p-3.5 my-2.5 text-sm text-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
            <div className="leading-normal">{line.replace(/^[✅\s*-]+/, "")}</div>
          </div>
        )
      }
      return <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{line}</p>
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
                {formatAuditText(block.content)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
