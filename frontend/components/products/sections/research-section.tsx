"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api"
import { Plus, Trash2, ExternalLink } from "lucide-react"


export function ResearchSection({ productId }: { productId: string }) {
  const [research, setResearch] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("general")
  const [url, setUrl] = useState("")

  useEffect(() => { fetchResearch() }, [productId])

  const fetchResearch = async () => {
    try {
      const client = apiClient()
      const response = await client.get(`/products/${productId}/research`)
      if (response.data.success) setResearch(response.data.data)
    } catch (err) {
      console.error("Failed to fetch research:", err)
    } finally { setLoading(false) }
  }

  const handleAdd = async () => {
    if (!title.trim()) return
    try {
      const client = apiClient()
      const response = await client.post(`/research`, {
        product_id: productId,
        title,
        category,
        url,
        content: "",
      })
      if (response.data.success) setResearch([response.data.data, ...research])
      setTitle(""); setUrl(""); setShowAdd(false)
    } catch (err) {
      console.error("Failed to add research:", err)
    }
  }

  const handleDeleteResearch = async (id: string) => {
    try {
      const client = apiClient()
      const response = await client.delete(`/research/${id}`)
      if (response.data.success) setResearch(research.filter(r => r.id !== id))
    } catch (err) {
      console.error("Failed to delete research:", err)
    }
  }

  if (loading) return <div className="text-muted-foreground text-sm">Loading research...</div>

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Research ({research.length})</h4>
        <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-accent hover:underline">
          {showAdd ? "Cancel" : "+ Add Research"}
        </button>
      </div>

      {showAdd && (
        <div className="space-y-2">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full rounded border px-3 py-2"/>
          <div className="flex gap-2">
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL (optional)" className="flex-1 rounded border px-3 py-2"/>
            <select value={category} onChange={e => setCategory(e.target.value)} className="rounded border px-3 py-2">
              <option value="general">General</option>
              <option value="competitor">Competitor</option>
              <option value="market">Market</option>
            </select>
            <button onClick={handleAdd} className="rounded bg-accent px-3 py-2 text-accent-foreground">Add</button>
          </div>
        </div>
      )}

      {research.length === 0 ? (
        <div className="text-xs text-muted-foreground">No research yet</div>
      ) : (
        <div className="space-y-2">
          {research.map((item) => (
            <div key={item.id} className="flex items-start gap-2 rounded-lg border border-border p-2 hover:bg-secondary/50">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.category}</div>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> Link
                  </a>
                )}
              </div>
              <button
                onClick={() => handleDeleteResearch(item.id)}
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
