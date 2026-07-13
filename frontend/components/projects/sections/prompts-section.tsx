"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api"
import { Copy, Trash2 } from "lucide-react"


export function PromptsSection({ projectId }: { projectId: string }) {
  const [prompts, setPrompts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState("")
  const [promptText, setPromptText] = useState("")

  useEffect(() => { fetchPrompts() }, [projectId])

  const fetchPrompts = async () => {
    try {
      const client = apiClient()
      const response = await client.get(`/prompts?project_id=${projectId}`)
      if (response.data.success) setPrompts(response.data.data)
    } catch (err) {
      console.error("Failed to fetch prompts:", err)
    } finally { setLoading(false) }
  }

  const handleAdd = async () => {
    if (!name.trim() || !promptText.trim()) return
    try {
      const client = apiClient()
      const response = await client.post(`/prompts`, {
        project_id: projectId,
        name,
        prompt_text: promptText,
      })
      if (response.data.success) setPrompts([response.data.data, ...prompts])
      setName(""); setPromptText(""); setShowAdd(false)
    } catch (err) {
      console.error("Failed to add prompt:", err)
    }
  }

  const handleDeletePrompt = async (id: string) => {
    try {
      const client = apiClient()
      const response = await client.delete(`/prompts/${id}`)
      if (response.data.success) setPrompts(prompts.filter(p => p.id !== id))
    } catch (err) {
      console.error("Failed to delete prompt:", err)
    }
  }

  if (loading) return <div className="text-muted-foreground text-sm">Loading prompts...</div>

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Prompts ({prompts.length})</h4>
        <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-accent hover:underline">{showAdd ? "Cancel" : "+ Add Prompt"}</button>
      </div>

      {showAdd && (
        <div className="space-y-2">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Title" className="w-full rounded border px-3 py-2"/>
          <textarea value={promptText} onChange={e=>setPromptText(e.target.value)} placeholder="Prompt" className="w-full rounded border px-3 py-2"/>
          <div className="flex justify-end">
            <button onClick={handleAdd} className="rounded bg-accent px-3 py-2 text-accent-foreground">Add</button>
          </div>
        </div>
      )}

      {prompts.length === 0 ? (
        <div className="text-xs text-muted-foreground">No prompts yet</div>
      ) : (
        <div className="space-y-2">
          {prompts.map((prompt) => (
            <div key={prompt.id} className="flex items-center gap-2 rounded-lg border border-border p-2 hover:bg-secondary/50">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{prompt.name}</div>
                <div className="text-xs text-muted-foreground">{prompt.category} • Used {prompt.usage_count}x</div>
              </div>
              <button className="p-1 hover:bg-accent/20 rounded" title="Copy prompt">
                <Copy className="h-3 w-3 text-muted-foreground" />
              </button>
              <button
                onClick={() => handleDeletePrompt(prompt.id)}
                className="flex-shrink-0 p-1 hover:bg-destructive/20 rounded"
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
