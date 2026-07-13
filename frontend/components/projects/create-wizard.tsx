"use client"

import { useState, useEffect, useRef } from "react"
import { apiClient } from "@/lib/api"
import { ChevronRight, ChevronLeft, Loader2, UploadCloud, FileCode, Trash2, CheckCircle2 } from "lucide-react"
import { useAppStore } from "@/store/app"
import { Project } from "@/types"
import { PROJECT_LIFECYCLES } from "@/lib/project-options"

interface WizardProps {
  onSuccess: () => void
}

export function CreateProjectWizard({ onSuccess }: WizardProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { families, setFamilies, setProjects } = useAppStore()

  const [formData, setFormData] = useState({
    family_id: "",
    name: "",
    description: "",
    lifecycle: "PLANNING",
    status: "ACTIVE",
    category: "Infrastructure",
    target_customer: "",
    priority: "medium",
    cloud_provider: "AWS", // AWS, GCP, Azure, Custom
  })

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showNewFamily, setShowNewFamily] = useState(false)
  const [newFamilyName, setNewFamilyName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      // Cloud Selection & Upload (validation not strictly required, file can be skipped)
    }

    if (step === 3) {
      if (!formData.name) {
        setError("Project name is required")
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = {
        family_id: formData.family_id,
        name: formData.name,
        description: formData.description,
        lifecycle: formData.lifecycle,
        status: formData.status,
        cloud_provider: formData.cloud_provider,
      }
      
      const client = apiClient()
      const response = await client.post(`/projects/`, payload)
      
      if (response.data.success) {
        const project = response.data.data as Project
        
        // Check if there is an infrastructure file to upload
        if (selectedFile) {
          setUploadProgress("Uploading and parsing infrastructure file...")
          const fileData = new FormData()
          fileData.append("file", selectedFile)
          
          try {
            await client.post(`/projects/${project.id}/infra-upload`, fileData, {
              headers: { "Content-Type": "multipart/form-data" }
            })
          } catch (uploadErr: any) {
            console.error("Infrastructure upload/parsing failed:", uploadErr)
            // Show alert but still save project (non-blocking)
            alert("Infrastructure file upload or parsing encountered an error. The project was created but details might be empty.")
          }
        }

        setProjects([project, ...((useAppStore.getState().projects) || [])])
        onSuccess()
      } else {
        setError(response.data.details || "Failed to create project")
      }
    } catch (err: any) {
      console.error("Error creating project:", err, err.response?.data)
      setError(err.response?.data?.details || err.message || "Failed to create project")
    } finally {
      setLoading(false)
      setUploadProgress(null)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Step 1: Family Selection */}
      {step === 1 && (
        <div className="space-y-6 rounded-lg border border-border bg-card p-6">
          <div>
            <h2 className="text-xl font-bold font-sans">Step 1: Select Family</h2>
            <p className="text-sm text-muted-foreground">Choose or create a family to organize your project</p>
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
                      <div className="text-sm text-muted-foreground">{family.project_count} projects</div>
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

      {/* Step 2: Cloud Provider & Infrastructure File Upload */}
      {step === 2 && (
        <div className="space-y-6 rounded-lg border border-border bg-card p-6">
          <div>
            <h2 className="text-xl font-bold font-sans">Step 2: Infrastructure Configuration</h2>
            <p className="text-sm text-muted-foreground">Specify the cloud hosting provider and upload infrastructure state or architecture diagrams</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Cloud Provider</label>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {["AWS", "GCP", "Azure", "Custom"].map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => setFormData({ ...formData, cloud_provider: provider })}
                    className={`rounded-lg border-2 py-3 px-4 text-center font-medium transition-colors ${
                      formData.cloud_provider === provider
                        ? "border-accent bg-accent/10 text-foreground"
                        : "border-border hover:border-secondary text-muted-foreground"
                    }`}
                  >
                    {provider}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-sm font-medium mb-2">
                Infrastructure Architecture or State File (Optional)
              </label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 bg-secondary/5 hover:bg-secondary/10 cursor-pointer transition-colors"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".tfstate,.json,.drawio,.vsdx,.png,.jpg,.jpeg" 
                  className="hidden" 
                />
                
                {selectedFile ? (
                  <div className="text-center space-y-2">
                    <FileCode className="h-10 w-10 text-accent mx-auto" />
                    <div className="text-sm font-medium text-foreground">{selectedFile.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </div>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedFile(null)
                      }}
                      className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium pt-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <UploadCloud className="h-10 w-10 text-muted-foreground mx-auto" />
                    <div className="text-sm font-medium text-foreground">Click to upload configuration file</div>
                    <div className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Supports Terraform (.tfstate, .json), Diagrams (.png, .jpg), and Vector designs (.drawio, .vsdx)
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Basic Information */}
      {step === 3 && (
        <div className="space-y-6 rounded-lg border border-border bg-card p-6">
          <div>
            <h2 className="text-xl font-bold font-sans">Step 3: Basic Information</h2>
            <p className="text-sm text-muted-foreground">Tell us about your project</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project Name *</label>
              <input
                type="text"
                placeholder="e.g., Cloud Application Infrastructure"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                placeholder="Describe your project application or infrastructure details..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 min-h-24"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Initial Stage</label>
                <select
                  value={formData.lifecycle}
                  onChange={(e) => setFormData({ ...formData, lifecycle: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2"
                >
                  {PROJECT_LIFECYCLES.map((stage) => (
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
            <h2 className="text-xl font-bold font-sans">Step 4: Review</h2>
            <p className="text-sm text-muted-foreground">Verify your project details before creating</p>
          </div>

          <div className="space-y-4 rounded-lg bg-secondary/50 p-4">
            <div>
              <div className="text-sm text-muted-foreground">Project Name</div>
              <div className="font-medium">{formData.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Description</div>
              <div className="text-sm">{formData.description || "—"}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Cloud Provider</div>
                <div className="text-sm font-medium text-accent">{formData.cloud_provider}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Initial Stage</div>
                <div className="text-sm font-medium">{formData.lifecycle}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Priority</div>
                <div className="text-sm font-medium">{formData.priority}</div>
              </div>
            </div>
            {selectedFile && (
              <div className="border-t border-border pt-3 mt-1">
                <div className="text-sm text-muted-foreground">Attached Infrastructure File</div>
                <div className="text-sm font-medium inline-flex items-center gap-1.5 text-green-300">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {uploadProgress && (
        <div className="rounded-lg border border-accent bg-accent/10 p-3 text-sm text-accent-foreground inline-flex items-center gap-2 w-full justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          {uploadProgress}
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
              Create Project
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
