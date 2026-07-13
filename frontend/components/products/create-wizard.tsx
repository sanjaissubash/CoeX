"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api"
import { ChevronRight, ChevronLeft, Loader2 } from "lucide-react"
import { useAppStore } from "@/store/app"
import { Product } from "@/types"
import { PRODUCT_LIFECYCLES } from "@/lib/product-options"


interface WizardProps {
  onSuccess: () => void
}

export function CreateProductWizard({ onSuccess }: WizardProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { families, setFamilies, setProducts } = useAppStore()

  const [formData, setFormData] = useState({
    family_id: "",
    template_id: "",
    name: "",
    description: "",
    lifecycle: "IDEA",
    status: "ACTIVE",
    category: "",
    target_customer: "",
    priority: "medium",
    tags: "",
  })

  const [templates, setTemplates] = useState<any[]>([])
  const [showNewFamily, setShowNewFamily] = useState(false)
  const [newFamilyName, setNewFamilyName] = useState("")

  useEffect(() => {
    const loadFamilies = async () => {
      if (!families || families.length === 0) {
        try {
          const client = apiClient()
          const res = await client.get(`/families`)
          if (res.data.success) setFamilies(res.data.data)
        } catch (e) {
          console.warn("Could not load families:", e)
        }
      }
    }
    loadFamilies()
  }, [families, setFamilies])

  const handleNextStep = async () => {
    if (step === 1) {
      if (!formData.family_id && !showNewFamily) {
        setError("Please select or create a family")
        return
      }
      if (showNewFamily && !newFamilyName) {
        setError("Please enter a family name")
        return
      }

      if (showNewFamily && newFamilyName) {
        setLoading(true)
          try {
          const client = apiClient()
          const response = await client.post(`/families`, {
            name: newFamilyName,
          })
          if (response.data.success) {
            const newFamily = response.data.data
            setFamilies([...(families || []), newFamily])
            setFormData({ ...formData, family_id: newFamily.id })
            setShowNewFamily(false)
          }
        } catch (err: any) {
          console.error("Error creating family:", err)
          setError(err.response?.data?.details || "Failed to create family")
          setLoading(false)
          return
        } finally {
          setLoading(false)
        }
      }
    }

    if (step === 2) {
      setLoading(true)
      try {
        const client = apiClient()
        const response = await client.get(`/templates`)
        if (response.data.success) {
          setTemplates(response.data.data)
        }
      } catch (err: any) {
        console.error("Error loading templates:", err)
        setError("Failed to load templates")
        setLoading(false)
        return
      } finally {
        setLoading(false)
      }
    }

    if (step === 3) {
      if (!formData.name) {
        setError("Product name is required")
        return
      }
    }

    setError(null)
    setStep(step + 1)
  }

  const handlePrevStep = () => {
    setError(null)
    setStep(Math.max(1, step - 1))
  }

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = {
        family_id: formData.family_id,
        template_id: formData.template_id || null,
        name: formData.name,
        description: formData.description,
        lifecycle: formData.lifecycle,
        status: formData.status,
      }
      console.log("Creating product payload:", payload)
  const client = apiClient()
  const response = await client.post(`/products`, payload)
      console.log("Create product response:", response.data)
      if (response.data.success) {
        const product = response.data.data as Product
        setProducts([product, ...((useAppStore.getState().products) || [])])
        onSuccess()
      } else {
        setError(response.data.details || "Failed to create product")
      }
    } catch (err: any) {
      console.error("Error creating product:", err, err.response?.data)
      setError(err.response?.data?.details || err.message || "Failed to create product")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Step 1: Family Selection */}
      {step === 1 && (
        <div className="space-y-6 rounded-lg border border-border bg-card p-6">
          <div>
            <h2 className="text-xl font-bold">Step 1: Select Family</h2>
            <p className="text-sm text-muted-foreground">Choose or create a family to organize your product</p>
          </div>

          {!showNewFamily ? (
            <div className="space-y-3">
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {families.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-secondary/50 p-4 text-center text-muted-foreground">
                    No families yet
                  </div>
                ) : (
                  families.map((family) => (
                    <button
                      key={family.id}
                      onClick={() => setFormData({ ...formData, family_id: family.id })}
                      className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
                        formData.family_id === family.id
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-secondary"
                      }`}
                    >
                      <div className="font-medium">{family.name}</div>
                      <div className="text-sm text-muted-foreground">{family.product_count} products</div>
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={() => setShowNewFamily(true)}
                className="w-full rounded-lg border border-dashed border-border bg-secondary/50 py-3 hover:bg-secondary transition-colors"
              >
                + Create New Family
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Family name"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
              />
              <button
                onClick={() => setShowNewFamily(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Use existing family
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Template Selection */}
      {step === 2 && (
        <div className="space-y-6 rounded-lg border border-border bg-card p-6">
          <div>
            <h2 className="text-xl font-bold">Step 2: Select Template</h2>
            <p className="text-sm text-muted-foreground">Choose a template to jump-start your product setup</p>
          </div>

          <div className="grid gap-3">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => setFormData({ ...formData, template_id: template.id })}
                className={`rounded-lg border-2 p-4 text-left transition-colors ${
                  formData.template_id === template.id
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-secondary"
                }`}
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-sm text-muted-foreground">{template.description}</div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setFormData({ ...formData, template_id: "" })}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Skip template
          </button>
        </div>
      )}

      {/* Step 3: Basic Information */}
      {step === 3 && (
        <div className="space-y-6 rounded-lg border border-border bg-card p-6">
          <div>
            <h2 className="text-xl font-bold">Step 3: Basic Information</h2>
            <p className="text-sm text-muted-foreground">Tell us about your product</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Product Name *</label>
              <input
                type="text"
                placeholder="e.g., Developer Resume"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                placeholder="Describe your product..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 min-h-24"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <input
                  type="text"
                  placeholder="e.g., Tools"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Target Customer</label>
                <input
                  type="text"
                  placeholder="e.g., Developers"
                  value={formData.target_customer}
                  onChange={(e) => setFormData({ ...formData, target_customer: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Initial Stage</label>
                <select
                  value={formData.lifecycle}
                  onChange={(e) => setFormData({ ...formData, lifecycle: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2"
                >
                  {PRODUCT_LIFECYCLES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-6 rounded-lg border border-border bg-card p-6">
          <div>
            <h2 className="text-xl font-bold">Step 4: Review</h2>
            <p className="text-sm text-muted-foreground">Verify your product details before creating</p>
          </div>

          <div className="space-y-4 rounded-lg bg-secondary/50 p-4">
            <div>
              <div className="text-sm text-muted-foreground">Product Name</div>
              <div className="font-medium">{formData.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Description</div>
              <div className="text-sm">{formData.description || "—"}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Initial Stage</div>
                <div className="text-sm font-medium">{formData.lifecycle}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Priority</div>
                <div className="text-sm font-medium">{formData.priority}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between gap-3">
        <button
          onClick={handlePrevStep}
          disabled={step === 1 || loading}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 hover:bg-secondary disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex gap-2">
          {step < 4 ? (
            <button
              onClick={handleNextStep}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Product
            </button>
          )}
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full ${
              s <= step ? "bg-accent" : "bg-secondary"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
