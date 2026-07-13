"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Pencil, Save, ShieldAlert, Trash2 } from "lucide-react"
import { CUSTOM_KEYWORDS_STORAGE_KEY, normalizeLeakKeywords } from "@/lib/leak-keywords"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  // Leak Keywords state
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
    <div className="space-y-8 p-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Customize application and local preferences</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Theme Settings */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Theme</h2>
          <p className="text-sm text-muted-foreground mb-4">Choose the application layout style</p>
          <div className="flex gap-2">
            {['system', 'light', 'dark'].map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`rounded px-4 py-2 border transition-colors capitalize text-sm font-medium ${
                  theme === t
                    ? 'border-accent bg-accent/10 text-accent-foreground'
                    : 'border-border hover:bg-secondary text-muted-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Leak Keywords Settings */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Leak Keywords</h2>
            <p className="text-sm text-muted-foreground">Manage global words and phrases that should be flagged before exporting context</p>
          </div>

          <div className="flex items-start gap-3 rounded border border-border bg-secondary/30 p-3.5 text-xs text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-4 w-4 text-accent flex-shrink-0" />
            <div>
              Keywords are stored in this browser session. Clicking <strong>Verify leaks</strong> on the project view scans your files, tasks, and context blocks to flag accidental inclusions of these terms.
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  addKeyword()
                }
              }}
              className="min-w-64 flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
              placeholder="e.g. client name, internal project code..."
            />
            <button onClick={addKeyword} className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 transition-opacity">
              Add Keyword
            </button>
          </div>

          <div className="divide-y divide-border rounded border border-border mt-3 max-h-96 overflow-y-auto bg-background/20">
            {keywords.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">No custom leak keywords added yet.</div>
            ) : (
              keywords.map((keyword, index) => (
                <div key={`${keyword}-${index}`} className="flex flex-wrap items-center gap-2 p-3 text-sm">
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
                      className="min-w-64 flex-1 rounded border border-border bg-background px-3 py-1.5 text-sm"
                    />
                  ) : (
                    <div className="min-w-64 flex-1 font-medium">{keyword}</div>
                  )}

                  <div className="inline-flex items-center gap-2">
                    {editingIndex === index ? (
                      <button onClick={saveEdit} className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 hover:bg-secondary text-xs">
                        <Save className="h-3.5 w-3.5 text-accent" />
                        Save
                      </button>
                    ) : (
                      <button onClick={() => startEdit(index)} className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 hover:bg-secondary text-xs">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        Edit
                      </button>
                    )}
                    <button onClick={() => deleteKeyword(index)} className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 hover:bg-destructive/20 text-xs text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
