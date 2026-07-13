"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api"
import { Trash2 } from "lucide-react"


export function SessionsSection({ productId }: { productId: string }) {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [goal, setGoal] = useState("")
  const [summary, setSummary] = useState("")

  useEffect(() => { fetchSessions() }, [productId])

  const fetchSessions = async () => {
    try {
      const client = apiClient()
      const response = await client.get(`/products/${productId}/sessions`)
      if (response.data.success) setSessions(response.data.data)
    } catch (err) {
      console.error("Failed to fetch sessions:", err)
    } finally { setLoading(false) }
  }

  const handleAdd = async () => {
    if (!goal.trim()) return
    try {
      const client = apiClient()
      const response = await client.post(`/sessions`, {
        product_id: productId,
        ai_tool: "manual",
        goal,
        summary,
      })
      if (response.data.success) setSessions([response.data.data, ...sessions])
      setGoal(""); setSummary(""); setShowAdd(false)
    } catch (err) {
      console.error("Failed to add session:", err)
    }
  }

  const handleDeleteSession = async (id: string) => {
    try {
      const client = apiClient()
      const response = await client.delete(`/sessions/${id}`)
      if (response.data.success) setSessions(sessions.filter(s => s.id !== id))
    } catch (err) {
      console.error("Failed to delete session:", err)
    }
  }

  if (loading) return <div className="text-muted-foreground text-sm">Loading sessions...</div>

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">AI Sessions ({sessions.length})</h4>
        <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-accent hover:underline">{showAdd ? "Cancel" : "+ Add Session"}</button>
      </div>

      {showAdd && (
        <div className="space-y-2">
          <input value={goal} onChange={e=>setGoal(e.target.value)} placeholder="Session goal" className="w-full rounded border px-3 py-2"/>
          <textarea value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Summary (optional)" className="w-full rounded border px-3 py-2"/>
          <div className="flex justify-end">
            <button onClick={handleAdd} className="rounded bg-accent px-3 py-2 text-accent-foreground">Add</button>
          </div>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-xs text-muted-foreground">No sessions yet</div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-start gap-2 rounded-lg border border-border p-2 hover:bg-secondary/50">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-accent">{session.ai_tool}</div>
                <div className="text-sm font-medium">{session.goal}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{session.summary}</div>
              </div>
              <button
                onClick={() => handleDeleteSession(session.id)}
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
