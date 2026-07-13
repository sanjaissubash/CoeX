"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api"
import { Plus, Trash2, Edit2 } from "lucide-react"
import { useAppStore } from "@/store/app"
import { Family } from "@/types"


export default function FamiliesPage() {
  const { families, setFamilies } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [showNewFamilyForm, setShowNewFamilyForm] = useState(false)
  const [newFamilyName, setNewFamilyName] = useState("")

  useEffect(() => {
    const fetchFamilies = async () => {
      try {
        const client = apiClient()
        const response = await client.get(`/families`)
        if (response.data.success) {
          setFamilies(response.data.data)
        }
      } catch (error) {
        console.error("Failed to fetch families:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchFamilies()
  }, [setFamilies])

  const handleCreateFamily = async () => {
    if (!newFamilyName.trim()) return
    try {
      const client = apiClient()
      const response = await client.post(`/families`, {
        name: newFamilyName,
      })
      if (response.data.success) {
        setFamilies([...(families || []), response.data.data])
        setNewFamilyName("")
        setShowNewFamilyForm(false)
      }
    } catch (error) {
      console.error("Failed to create family:", error)
    }
  }

  const handleDeleteFamily = async (familyId: string) => {
    if (!confirm("Are you sure you want to delete this family?")) return
    try {
      const client = apiClient()
      const response = await client.delete(`/families/${familyId}`)
      if (response.data.success) {
        setFamilies((families || []).filter(f => f.id !== familyId))
      }
    } catch (error) {
      console.error("Failed to delete family:", error)
    }
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Families</h1>
          <p className="text-muted-foreground">Organize your products into families</p>
        </div>
        <button
          onClick={() => setShowNewFamilyForm(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-accent-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Family
        </button>
      </div>

      {/* New Family Form */}
      {showNewFamilyForm && (
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Family name"
              value={newFamilyName}
              onChange={(e) => setNewFamilyName(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2"
              autoFocus
            />
            <button
              onClick={handleCreateFamily}
              className="rounded-lg bg-accent px-4 py-2 text-accent-foreground hover:opacity-90"
            >
              Create
            </button>
            <button
              onClick={() => setShowNewFamilyForm(false)}
              className="rounded-lg border border-border px-4 py-2 hover:bg-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Families Grid */}
      {loading ? (
        <div className="text-center text-muted-foreground">Loading families...</div>
      ) : (families || []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <p className="text-muted-foreground mb-4">No families yet</p>
          <button
            onClick={() => setShowNewFamilyForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-accent-foreground hover:opacity-90"
          >
            Create your first family
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(families || []).map((family) => (
            <div key={family.id} className="rounded-lg border border-border bg-card p-6 hover:border-accent transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{family.name}</h3>
                  <p className="text-sm text-muted-foreground">{family.product_count} products</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const newName = prompt("Edit family name:", family.name)
                      if (!newName || newName.trim() === family.name) return
                      try {
                        const client = apiClient()
                        const resp = await client.patch(`/families/${family.id}`, { name: newName.trim() })
                        if (resp.data.success) {
                          setFamilies((families || []).map(f => (f.id === family.id ? resp.data.data : f)))
                        }
                      } catch (err) {
                        console.error('Failed to edit family:', err)
                      }
                    }}
                    className="p-2 hover:bg-secondary rounded transition-colors"
                  >
                    <Edit2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDeleteFamily(family.id)}
                    className="p-2 hover:bg-secondary rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              {family.description && (
                <p className="text-sm text-muted-foreground">{family.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
