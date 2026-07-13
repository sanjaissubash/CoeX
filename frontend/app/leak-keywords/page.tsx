"use client"

import { useEffect, useState } from "react"
import { Pencil, Save, ShieldAlert, Trash2 } from "lucide-react"
import { CUSTOM_KEYWORDS_STORAGE_KEY, normalizeLeakKeywords } from "@/lib/leak-keywords"

export default function LeakKeywordsPage() {
  const [keywords, setKeywords] = useState<string[]>([])
  const [draft, setDraft] = useState("")
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState("")

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CUSTOM_KEYWORDS_STORAGE_KEY)
      if (stored) setKeywords(normalizeLeakKeywords(JSON.parse(stored)))
    } catch {
      setKeywords([])
    }
  }, [])

  const saveKeywords = (items: string[]) => {
    const normalized = normalizeLeakKeywords(items)
    setKeywords(normalized)
    window.localStorage.setItem(CUSTOM_KEYWORDS_STORAGE_KEY, JSON.stringify(normalized))
  }

  const addKeyword = () => {
    const value = draft.trim()
    if (!value) return
    const exists = keywords.some((keyword) => keyword.toLowerCase() === value.toLowerCase())
    if (!exists) saveKeywords([...keywords, value])
    setDraft("")
  }

  const startEdit = (index: number) => {
    setEditingIndex(index)
    setEditDraft(keywords[index])
  }

  const saveEdit = () => {
    if (editingIndex === null) return
    const value = editDraft.trim()
    if (!value) return
    const next = keywords.map((keyword, index) => (index === editingIndex ? value : keyword))
    saveKeywords(next)
    setEditingIndex(null)
    setEditDraft("")
  }

  const deleteKeyword = (index: number) => {
    saveKeywords(keywords.filter((_, itemIndex) => itemIndex !== index))
    if (editingIndex === index) {
      setEditingIndex(null)
      setEditDraft("")
    }
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Leak Keywords</h1>
        <p className="text-muted-foreground">Manage global words and phrases that should be flagged before sharing generated context.</p>
      </div>

      <div className="max-w-3xl space-y-4 rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-3 rounded border border-border bg-secondary/30 p-3 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div className="text-muted-foreground">
            These keywords are stored in this browser and are checked by the Verify leaks button for full product and task context.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                addKeyword()
              }
            }}
            className="min-w-64 flex-1 rounded border border-border bg-background px-3 py-2"
            placeholder="Client name, internal code, private term..."
          />
          <button onClick={addKeyword} className="rounded bg-accent px-3 py-2 text-accent-foreground">
            Add Keyword
          </button>
        </div>

        <div className="divide-y divide-border rounded border border-border">
          {keywords.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No custom leak keywords yet.</div>
          ) : (
            keywords.map((keyword, index) => (
              <div key={`${keyword}-${index}`} className="flex flex-wrap items-center gap-2 p-3">
                {editingIndex === index ? (
                  <input
                    value={editDraft}
                    onChange={(event) => setEditDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        saveEdit()
                      }
                      if (event.key === "Escape") {
                        setEditingIndex(null)
                        setEditDraft("")
                      }
                    }}
                    className="min-w-64 flex-1 rounded border border-border bg-background px-3 py-2"
                  />
                ) : (
                  <div className="min-w-64 flex-1 font-medium">{keyword}</div>
                )}

                {editingIndex === index ? (
                  <button onClick={saveEdit} className="inline-flex items-center gap-2 rounded border border-border px-3 py-2 hover:bg-secondary">
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                ) : (
                  <button onClick={() => startEdit(index)} className="inline-flex items-center gap-2 rounded border border-border px-3 py-2 hover:bg-secondary">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                )}
                <button onClick={() => deleteKeyword(index)} className="inline-flex items-center gap-2 rounded border border-border px-3 py-2 hover:bg-destructive/20">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
