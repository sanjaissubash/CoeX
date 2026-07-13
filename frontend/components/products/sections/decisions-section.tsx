"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api"
import { Trash2 } from "lucide-react"


export function DecisionsSection({ productId }: { productId: string }) {
  const [decisions, setDecisions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => { fetchDecisions() }, [productId])

  const fetchDecisions = async () => {
    try {
      const client = apiClient()
      const response = await client.get(`/products/${productId}/decisions`)
      if (response.data.success) setDecisions(response.data.data)
    } catch (err) {
      console.error("Failed to fetch decisions:", err)
    } finally { setLoading(false) }
  }

  const handleAdd = async () => {
    if (!title.trim()) return
    try {
      const client = apiClient()
      const response = await client.post(`/decisions`, {
        product_id: productId,
        title,
        description,
      })
      if (response.data.success) setDecisions([response.data.data, ...decisions])
      setTitle(""); setDescription(""); setShowAdd(false)
    } catch (err) {
      console.error("Failed to add decision:", err)
    }
  }

  const handleDeleteDecision = async (id: string) => {
    try {
      const client = apiClient()
      const response = await client.delete(`/decisions/${id}`)
      if (response.data.success) setDecisions(decisions.filter(d => d.id !== id))
    } catch (err) {
      console.error("Failed to delete decision:", err)
    }
  }

  if (loading) return <div className="text-muted-foreground text-sm">Loading decisions...</div>

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Decisions ({decisions.length})</h4>
        <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-accent hover:underline">{showAdd ? "Cancel" : "+ Add Decision"}</button>
      </div>

      {showAdd && (
        <div className="space-y-2">
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" className="w-full rounded border px-3 py-2"/>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description" className="w-full rounded border px-3 py-2"/>
          <div className="flex justify-end">
            <button onClick={handleAdd} className="rounded bg-accent px-3 py-2 text-accent-foreground">Add</button>
          </div>
        </div>
      )}

      {decisions.length === 0 ? (
        <div className="text-xs text-muted-foreground">No decisions recorded yet</div>
      ) : (
        <div className="space-y-2">
          {decisions.map((decision) => (
            <div key={decision.id} className="rounded-lg border border-border p-2 hover:bg-secondary/50">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-sm font-medium">{decision.title}</div>
                  <div className="text-xs text-muted-foreground">{decision.description}</div>
                </div>
                <button
                  onClick={() => handleDeleteDecision(decision.id)}
                  className="flex-shrink-0 p-1 hover:bg-destructive/20 rounded"
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
