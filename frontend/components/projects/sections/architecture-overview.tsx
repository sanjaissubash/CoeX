"use client"

import { useEffect, useState, useRef } from "react"
import { apiClient } from "@/lib/api"
import { useToast } from "@/components/ui/Toaster"
import { Server, UploadCloud, FileCode } from "lucide-react"

export function ArchitectureOverviewSection({ projectId }: { projectId: string }) {
  const { push } = useToast()
  
  const [blocks, setBlocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Update Config states
  const [showUpload, setShowUpload] = useState(false)
  const [project, setProject] = useState<any | null>(null)
  const [cloudProvider, setCloudProvider] = useState("AWS")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchBlocks()
    fetchProject()
  }, [projectId])

  const fetchBlocks = async () => {
    try {
      const client = apiClient()
      const response = await client.get(`/projects/${projectId}/context-blocks?block_type=architecture`)
      if (response.data.success) {
        setBlocks(response.data.data)
      }
    } catch (err) {
      console.error("Failed to fetch architecture overview:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchProject = async () => {
    try {
      const client = apiClient()
      const res = await client.get(`/projects/${projectId}`)
      if (res.data.success) {
        setProject(res.data.data)
        setCloudProvider(res.data.data?.ai_metadata?.cloud_provider || "AWS")
      }
    } catch (err) {
      console.error("Failed to fetch project detail:", err)
    }
  }

  const handleUploadConfig = async () => {
    setUploading(true)
    setUploadProgress("Saving cloud provider configuration...")
    try {
      const client = apiClient()
      
      // Update cloud provider context in project model PATCH
      const updatedMetadata = {
        ...(project?.ai_metadata || {}),
        cloud_provider: cloudProvider
      }
      
      await client.patch(`/projects/${projectId}`, {
        ai_metadata: updatedMetadata
      })
      
      // If a file is selected, upload and run parsing E2E
      if (selectedFile) {
        setUploadProgress("Uploading and parsing infrastructure configuration...")
        const formData = new FormData()
        formData.append("file", selectedFile)
        
        await client.post(`/projects/${projectId}/infra-upload`, formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        })
      }
      
      push({ 
        title: "Configuration updated successfully",
        description: "Your cloud architecture overview is being updated..."
      })
      
      setShowUpload(false)
      setSelectedFile(null)
      setUploadProgress(null)
      
      // Refresh architecture blocks locally
      fetchBlocks()
      fetchProject()
      
      // Fully reload client state after 800ms so improvements and other tabs sync
      setTimeout(() => {
        window.location.reload()
      }, 800)

    } catch (err: any) {
      console.error("Failed to update project infrastructure configuration:", err)
      push({ title: "Failed to update configuration" })
      setUploadProgress(null)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return <div className="text-muted-foreground text-sm">Loading architecture overview...</div>
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6">
      
      {/* Card Header with action toggle */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-accent" />
          <h4 className="font-bold text-base">Architecture Overview</h4>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
            showUpload 
              ? "border-border hover:bg-secondary text-muted-foreground"
              : "border-accent/20 bg-accent/5 text-accent hover:bg-accent/10"
          }`}
        >
          {showUpload ? "Cancel" : "Update Config"}
        </button>
      </div>

      {/* Expandable Uploader interface */}
      {showUpload && (
        <div className="space-y-4 rounded-lg border border-border bg-secondary/5 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Cloud Provider
              </label>
              <div className="grid grid-cols-4 gap-2">
                {["AWS", "GCP", "Azure", "Custom"].map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => setCloudProvider(provider)}
                    className={`rounded-lg border py-2 px-3 text-xs text-center font-semibold transition-colors ${
                      cloudProvider === provider
                        ? "border-accent bg-accent/10 text-foreground"
                        : "border-border hover:border-secondary text-muted-foreground bg-background"
                    }`}
                  >
                    {provider}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Infrastructure Architecture or State File
              </label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-5 bg-background hover:bg-secondary/5 cursor-pointer transition-colors"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept=".tfstate,.json,.drawio,.vsdx,.png,.jpg,.jpeg" 
                  className="hidden" 
                />
                
                {selectedFile ? (
                  <div className="text-center space-y-1.5 text-xs">
                    <FileCode className="h-8 w-8 text-accent mx-auto" />
                    <div className="font-semibold text-foreground">{selectedFile.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-1 text-xs text-muted-foreground">
                    <UploadCloud className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                    <div className="font-medium text-foreground">Click to upload state file or diagram</div>
                    <div className="text-[10px] max-w-sm mx-auto">
                      Supports Terraform (.tfstate, .json), Diagrams (.png, .jpg), and Vector designs (.drawio, .vsdx)
                    </div>
                  </div>
                )}
              </div>
            </div>

            {uploadProgress && (
              <div className="text-xs text-accent animate-pulse font-medium">{uploadProgress}</div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <button
                onClick={() => setShowUpload(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadConfig}
                disabled={uploading}
                className="px-4 py-1.5 bg-accent text-accent-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {uploading ? "Updating..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overview content */}
      {blocks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-secondary/5 p-4 text-sm text-muted-foreground">
          No architecture overview available. Upload a Terraform state file or Draw.io/Vsdx diagram to parse details.
        </div>
      ) : (
        <div className="space-y-4">
          {blocks.map((block) => (
            <div key={block.id} className="prose prose-sm dark:prose-invert max-w-none">
              <h5 className="text-sm font-semibold text-accent mb-2">{block.title}</h5>
              <div 
                className="text-sm text-foreground space-y-2 whitespace-pre-wrap leading-relaxed font-sans"
              >
                {block.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
