"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api"
import { Plus, Trash2, Copy, Check } from "lucide-react"


export function ContextBlocksSection({ projectId }: { projectId: string }) {
  const [blocks, setBlocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({})

  useEffect(() => { fetchContextBlocks() }, [projectId])

  const fetchContextBlocks = async () => {
    try {
      const client = apiClient()
      // Only fetch user-created general blocks (block_type=general)
      const response = await client.get(`/projects/${projectId}/context-blocks?block_type=general`)
      if (response.data.success) setBlocks(response.data.data)
    } catch (err) {
      console.error("Failed to fetch context blocks:", err)
    } finally { setLoading(false) }
  }

  const handleAdd = async () => {
    if (!title.trim()) return
    try {
      const client = apiClient()
      const response = await client.post(`/context-blocks`, {
        project_id: projectId,
        title,
        content,
        block_type: "general",
      })
      if (response.data.success) setBlocks([response.data.data, ...blocks])
      setTitle(""); setContent(""); setShowAdd(false)
    } catch (err) {
      console.error("Failed to add block:", err)
    }
  }

  const handleDeleteBlock = async (id: string) => {
    try {
      const client = apiClient()
      const response = await client.delete(`/context-blocks/${id}`)
      if (response.data.success) setBlocks(blocks.filter(b => b.id !== id))
    } catch (err) {
      console.error("Failed to delete block:", err)
    }
  }

  const handleCopy = async (id: string, text: string) => {
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
    setCopiedStates(prev => ({ ...prev, [id]: true }))
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [id]: false }))
    }, 2000)
  }

  if (loading) return <div className="text-muted-foreground text-sm">Loading context blocks...</div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Context Blocks (AI-Ready Knowledge) ({blocks.length})</h4>
        <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-accent hover:underline">{showAdd ? "Cancel" : "+ Add Block"}</button>
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

      {blocks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-accent/5 p-3 text-xs text-muted-foreground">
          Add context blocks to store high-value project knowledge for AI systems
        </div>
      ) : (
        <div className="space-y-2">
          {blocks.map((block) => (
            <div key={block.id} className="rounded-lg border border-border p-3 hover:bg-secondary/50">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-sm font-medium">{block.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{block.content}</div>
                </div>
                <div className="inline-flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleCopy(block.id, block.content)}
                    aria-label="Copy to clipboard"
                    className="p-1 hover:bg-secondary rounded transition-colors"
                  >
                    {copiedStates[block.id] ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteBlock(block.id)}
                    aria-label="Delete block"
                    className="p-1 hover:bg-destructive/20 rounded transition-colors"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
