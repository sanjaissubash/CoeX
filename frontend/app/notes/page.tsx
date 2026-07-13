"use client"

import { useEffect, useState, useRef } from "react"
import { apiClient } from "@/lib/api"
import { useToast } from "@/components/ui/Toaster"
import { ContextLeakChecker } from "@/components/projects/context-leak-checker"
import { 
  Pin, 
  Plus, 
  Trash2, 
  Search, 
  Copy, 
  Check, 
  Save, 
  Sparkles, 
  Folder, 
  FileText,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen
} from "lucide-react"

export default function NotesPage() {
  const { push } = useToast()
  
  // App States
  const [projects, setProjects] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [promptType, setPromptType] = useState<string>("Standard Prompt")
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  
  // Collapsible Workspace states
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  
  // Task selection states
  const [tasks, setTasks] = useState<any[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string>("")
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("")
  
  // Active Note State
  const [activeNote, setActiveNote] = useState<any | null>(null)
  const [noteTitle, setNoteTitle] = useState("Untitled Note")
  const [noteContent, setNoteContent] = useState("")
  const [linkProjectId, setLinkProjectId] = useState<string>("")
  const [saveStatus, setSaveStatus] = useState<"saved" | "editing" | "saving">("saved")
  
  // Generated Prompt State
  const [generatedPrompt, setGeneratedPrompt] = useState("")
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  // Gutter ref
  const editorRef = useRef<HTMLTextAreaElement>(null)
  
  // Load Projects and Notes
  useEffect(() => {
    const loadData = async () => {
      try {
        const client = apiClient()
        const [projRes, notesRes] = await Promise.all([
          client.get("/projects"),
          client.get("/notes?all=true")
        ])
        
        if (projRes.data.success) {
          setProjects(projRes.data.data)
          if (projRes.data.data.length > 0) {
            setSelectedProjectId(projRes.data.data[0].id)
          }
        }
        
        if (notesRes.data.success) {
          const list = notesRes.data.data
          setNotes(list)
          
          if (list.length > 0) {
            selectNote(list[0])
          } else {
            setActiveNote(null)
            setNoteTitle("")
            setNoteContent("")
            setLinkProjectId("")
          }
        }
      } catch (err) {
        console.error("Failed to load notes workspace data:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Load project tasks dynamically
  useEffect(() => {
    const fetchTasks = async () => {
      if (!selectedProjectId) {
        setTasks([])
        setSelectedTaskId("")
        return
      }
      try {
        const client = apiClient()
        const res = await client.get(`/projects/${selectedProjectId}/tasks`)
        if (res.data.success) {
          setTasks(res.data.data)
          setSelectedTaskId("")
        }
      } catch (err) {
        console.error("Failed to load project tasks:", err)
        setTasks([])
        setSelectedTaskId("")
      }
    }
    fetchTasks()
  }, [selectedProjectId])

  const selectNote = (note: any) => {
    setActiveNote(note)
    setNoteTitle(note.title)
    setNoteContent(note.content)
    setLinkProjectId(note.project_id || "")
    setSaveStatus("saved")
  }

  // Create a new blank note in database (default global)
  const handleCreateBlank = async () => {
    try {
      const client = apiClient()
      const res = await client.post("/notes", {
        title: "Untitled Note",
        content: "",
        note_type: "general",
        pinned: true,
        project_id: null
      })
      if (res.data.success) {
        const newNote = res.data.data
        setNotes(prev => [newNote, ...prev])
        selectNote(newNote)
        push({ title: "New note created" })
      }
    } catch (err) {
      console.error("Failed to create new note:", err)
      push({ title: "Failed to create note" })
    }
  }

  // Save changes to backend
  const handleSaveActiveNote = async () => {
    if (!activeNote) return
    setSaveStatus("saving")
    try {
      const client = apiClient()
      const res = await client.put(`/notes/${activeNote.id}`, {
        title: noteTitle,
        content: noteContent,
        pinned: activeNote.pinned,
        project_id: activeNote.project_id // Keep current project link
      })
      if (res.data.success) {
        const updated = res.data.data
        setNotes(prev => prev.map(n => n.id === updated.id ? updated : n))
        setActiveNote(updated)
        setSaveStatus("saved")
        push({ title: "Saved successfully" })
      }
    } catch (err) {
      console.error("Save failed:", err)
      setSaveStatus("editing")
      push({ title: "Save failed" })
    }
  }

  // Explicitly link active note to project
  const handleLinkToProject = async () => {
    if (!activeNote) return
    try {
      const client = apiClient()
      const res = await client.put(`/notes/${activeNote.id}`, {
        title: noteTitle,
        content: noteContent,
        pinned: activeNote.pinned,
        project_id: linkProjectId || null
      })
      if (res.data.success) {
        const updated = res.data.data
        setNotes(prev => prev.map(n => n.id === updated.id ? updated : n))
        setActiveNote(updated)
        push({ 
          title: "Linked to Project", 
          description: linkProjectId 
            ? `Linked with ${projects.find(p => p.id === linkProjectId)?.name}`
            : "Set note as global (no project link)"
        })
      }
    } catch (err) {
      console.error("Project link update failed:", err)
      push({ title: "Failed to link project" })
    }
  }

  // Toggle Pinned
  const handleTogglePin = async () => {
    if (!activeNote) return
    const nextPinned = !activeNote.pinned
    try {
      const client = apiClient()
      const res = await client.put(`/notes/${activeNote.id}`, {
        title: noteTitle,
        content: noteContent,
        pinned: nextPinned,
        project_id: activeNote.project_id
      })
      if (res.data.success) {
        const updated = res.data.data
        setNotes(prev => prev.map(n => n.id === updated.id ? updated : n))
        setActiveNote(updated)
        push({ title: nextPinned ? "Note Pinned" : "Note Unpinned" })
      }
    } catch (err) {
      console.error("Pin toggle failed:", err)
    }
  }

  // Delete note (E2E synchronizing database deletion)
  const handleDeleteNote = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return
    try {
      const client = apiClient()
      const res = await client.delete(`/notes/${id}`)
      if (res.data.success) {
        setNotes(prev => prev.filter(n => n.id !== id))
        push({ title: "Note deleted" })
        
        if (activeNote && activeNote.id === id) {
          const remaining = notes.filter(n => n.id !== id)
          if (remaining.length > 0) {
            selectNote(remaining[0])
          } else {
            setActiveNote(null)
            setNoteTitle("")
            setNoteContent("")
            setLinkProjectId("")
          }
        }
      }
    } catch (err) {
      console.error("Delete note failed:", err)
    }
  }

  // Prompt Generator Logic
  const handleGeneratePrompt = async () => {
    if (!selectedProjectId) {
      alert("Please select a project context first.")
      return
    }
    setGenerating(true)
    try {
      const client = apiClient()
      const [projRes, blocksRes] = await Promise.all([
        client.get(`/projects/${selectedProjectId}`),
        client.get(`/projects/${selectedProjectId}/context-blocks`)
      ])
      
      if (projRes.data.success && blocksRes.data.success) {
        const project = projRes.data.data
        const blocks = blocksRes.data.data
        
        const archBlocks = blocks.filter((b: any) => b.block_type === "architecture")
        const impBlocks = blocks.filter((b: any) => b.block_type === "improvements")
        const generalBlocks = blocks.filter((b: any) => b.block_type === "general" || !b.block_type)
        
        const architectureText = archBlocks.map((b: any) => b.content).join("\n\n")
        const improvementsText = impBlocks.map((b: any) => b.content).join("\n\n")
        const generalText = generalBlocks.map((b: any) => b.content).join("\n\n")
        const cloudProvider = project.ai_metadata?.cloud_provider || "AWS"
        
        // Find selected task context
        const activeTask = tasks.find(t => t.id === selectedTaskId)
        const taskDetailsText = activeTask ? `
---
ACTIVE TASK DETAILS:
- Title: ${activeTask.title}
- Description: ${activeTask.description || "No description provided."}
- Priority: ${activeTask.priority}
- Status: ${activeTask.status}
` : ""

        let promptText = ""
        
        if (promptType === "Standard Prompt") {
          promptText = `You are an expert software engineer and cloud developer assisting me with the following cloud project:
          
Project Name: ${project.name}
Description: ${project.description || "No description provided."}
Cloud Provider: ${cloudProvider}
${taskDetailsText}
---
PROJECT ARCHITECTURE REFERENCE:
${architectureText || "No parsed architecture layout available yet."}

---
SECURITY RECOMMENDATIONS & AUDITS:
${improvementsText || "No infrastructure warnings or vulnerability reports available."}

---
ADDITIONAL CONTEXT KNOWLEDGE:
${generalText || "No supplementary context blocks recorded."}

---
TASK INSTRUCTION:
Please execute the following instruction based on the project context above:
${noteContent || "(No input text entered)"}
`
        } else if (promptType === "Instructional") {
          promptText = `[SYSTEM INSTRUCTIONS]
Apply these constraints when executing instructions for the "${project.name}" deployment:
1. Adhere to ${cloudProvider} infrastructure security configurations.
2. Flag any insecure ports or components.
3. Keep logic clean and structured.
${taskDetailsText}
Project Description:
${project.description || "No description provided."}

User Instruction:
${noteContent || "(No input text entered)"}
`
        } else if (promptType === "Rephrase Reply") {
          promptText = `Rephrase this message to be clear, professional, and contextually aware of our ${cloudProvider} deployment for "${project.name}":
${taskDetailsText}
Message:
"${noteContent || "(No input text entered)"}"

Provide the rephrased output directly without system preambles.
`
        }
        
        setGeneratedPrompt(promptText)
        push({ title: "Prompt Generated!" })
      }
    } catch (err) {
      console.error("Failed to generate prompt:", err)
      push({ title: "Failed to generate prompt" })
    } finally {
      setGenerating(false)
    }
  }

  // Copy compiled prompt
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = generatedPrompt
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 2000)
    push({ title: "Copied to clipboard" })
  }

  // Filter notes by search query & sort by pinned status (pinned first)
  const filteredNotes = notes
    .filter(n => {
      return n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
             n.content.toLowerCase().includes(searchQuery.toLowerCase())
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    })

  // Calculate lines for gutter
  const lineCount = Math.max(1, noteContent.split("\n").length)
  const charCount = noteContent.length

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      
      {/* Top Header Row */}
      <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <input 
            value={noteTitle} 
            disabled={!activeNote}
            onChange={(e) => {
              setNoteTitle(e.target.value)
              setSaveStatus("editing")
            }}
            placeholder={activeNote ? "Untitled Note" : "No note selected"} 
            className="bg-transparent border-b border-transparent hover:border-border focus:border-accent text-base font-semibold outline-none px-1 py-0.5 min-w-[200px] disabled:opacity-55"
          />
          {activeNote && (
            <span className={`text-xs px-2 py-0.5 rounded ${
              saveStatus === "saved" 
                ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                : saveStatus === "saving"
                ? "bg-accent/10 text-accent border border-accent/20 animate-pulse"
                : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
            }`}>
              {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving..." : "Unsaved changes"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Link to Project Dropdown controls */}
          <div className="flex items-center gap-2 border border-border rounded-lg px-2.5 py-1 bg-secondary/10">
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1 font-medium">
              <LinkIcon className="h-3.5 w-3.5 text-accent" />
              Save to Project:
            </span>
            <select
              value={linkProjectId}
              disabled={!activeNote}
              onChange={(e) => setLinkProjectId(e.target.value)}
              className="bg-background border border-border rounded px-2 py-0.5 text-xs outline-none min-w-[140px] disabled:opacity-50"
            >
              <option value="">No Project (Global)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={handleLinkToProject}
              disabled={!activeNote}
              className="px-2 py-0.5 bg-accent text-accent-foreground rounded text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Link
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleTogglePin}
              disabled={!activeNote}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${
                activeNote?.pinned
                  ? "bg-accent/10 border-accent/30 text-accent"
                  : "border-border hover:bg-secondary text-muted-foreground"
              }`}
            >
              <Pin className="h-3.5 w-3.5" />
              {activeNote?.pinned ? "Pinned" : "Pin"}
            </button>
            
            <button 
              onClick={handleSaveActiveNote}
              disabled={!activeNote || saveStatus === "saved" || saveStatus === "saving"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Save Note
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Workspace Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Sidebar (Notes list) */}
        <div 
          className={`border-r border-border bg-card flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${
            leftCollapsed ? "w-0 border-r-0 overflow-hidden" : "w-72"
          }`}
        >
          {/* Header Row with Collapse toggle */}
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">All Notes</span>
            <button
              onClick={() => setLeftCollapsed(true)}
              className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Collapse Notes List"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Search bar & Create action */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="w-full pl-8 pr-3 py-1.5 rounded-md border border-border bg-background text-xs outline-none focus:border-accent"
              />
            </div>
            <button
              onClick={handleCreateBlank}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-medium hover:bg-secondary/50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add New Note
            </button>
          </div>

          {/* List content panel */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No notes found.
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => selectNote(note)}
                  className={`group relative rounded-lg border p-3 text-left cursor-pointer transition-colors ${
                    activeNote?.id === note.id
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-secondary"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 max-w-[180px]">
                      {note.pinned && <Pin className="h-3 w-3 text-accent flex-shrink-0" />}
                      <span className="font-semibold text-xs truncate">{note.title}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteNote(note.id)
                        }}
                        className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2 mt-1 whitespace-pre-wrap">
                    {note.content || "Empty content..."}
                  </div>
                  {note.project_id && (
                    <div className="mt-2 text-[9px] text-accent font-semibold inline-flex items-center gap-1">
                      <Folder className="h-2.5 w-2.5" />
                      {projects.find(p => p.id === note.project_id)?.name || "Linked Project"}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center Panel (Code-style Editor) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background relative">
          
          {/* Floating Expand Left Sidebar Handle */}
          {leftCollapsed && (
            <button
              onClick={() => setLeftCollapsed(false)}
              className="absolute left-3 top-3.5 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground shadow-lg transition-transform animate-in slide-in-from-left-2 duration-200"
            >
              <PanelLeftOpen className="h-4 w-4 text-accent" />
              Show List
            </button>
          )}

          {/* Floating Expand Right Sidebar Handle */}
          {rightCollapsed && (
            <button
              onClick={() => setRightCollapsed(false)}
              className="absolute right-3 top-3.5 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground shadow-lg transition-transform animate-in slide-in-from-right-2 duration-200"
            >
              <PanelRightOpen className="h-4 w-4 text-accent" />
              Show Compiler
            </button>
          )}

          {activeNote ? (
            <div className="flex flex-1 overflow-hidden font-mono text-sm leading-relaxed p-4 select-text pt-14">
              {/* Gutter */}
              <div className="text-muted-foreground/40 text-right pr-4 pl-1 select-none border-r border-border min-w-[3rem] text-xs">
                {Array.from({ length: lineCount }).map((_, i) => (
                  <div key={i} className="h-6">{i + 1}</div>
                ))}
              </div>
              
              {/* Main Textarea */}
              <textarea
                ref={editorRef}
                value={noteContent}
                onChange={(e) => {
                  setNoteContent(e.target.value)
                  setSaveStatus("editing")
                }}
                placeholder="Start drafting your instruction, code template, or prompt requirements here..."
                className="flex-1 bg-transparent border-0 outline-none resize-none px-4 overflow-y-auto leading-6 h-full text-foreground/90 caret-accent font-mono text-sm"
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-2">
              <FileText className="h-12 w-12 text-muted-foreground/30" />
              <div className="text-sm font-medium">No note selected</div>
              <p className="text-xs text-muted-foreground/75 max-w-xs">
                Click a note in the sidebar or click <strong>+ Add New Note</strong> to start drafting.
              </p>
            </div>
          )}

          {/* Code Status Bar */}
          <div className="h-7 border-t border-border bg-card px-4 flex items-center justify-between text-xs text-muted-foreground select-none font-mono flex-shrink-0">
            <div>
              {activeNote ? (
                <>Ln {lineCount}, Col 1 | {charCount} characters | {noteContent.split(/\s+/).filter(Boolean).length} words</>
              ) : (
                "Ln 0, Col 0 | 0 characters"
              )}
            </div>
            <div className="flex items-center gap-4">
              <span>Plain Text</span>
              <span>100%</span>
              <span>Soft Wrap: On</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar (Prompt Compiler Engine) */}
        <div 
          className={`border-l border-border bg-card flex flex-col flex-shrink-0 p-4 space-y-4 overflow-y-auto transition-all duration-300 ease-in-out ${
            rightCollapsed ? "w-0 p-0 border-l-0 overflow-hidden" : "w-80"
          }`}
        >
          {/* Header Row with Collapse toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <h3 className="font-bold text-sm text-foreground">Generate Prompt</h3>
            </div>
            <button
              onClick={() => setRightCollapsed(true)}
              className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Collapse Prompt Compiler"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground leading-normal">
            Merge the active document text directly with your selected cloud project environment specifications.
          </p>

          {/* Project drop selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-muted-foreground">Project Context</label>
            <div className="relative">
              <Folder className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value)
                }}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs outline-none"
              >
                <option value="">No Project Context</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Task drop selection */}
          {selectedProjectId && (
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <label className="block text-xs font-semibold text-muted-foreground">Task Context (Optional)</label>
              <div className="relative">
                <FileText className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs outline-none"
                >
                  <option value="">No Task Linked</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>{t.title} ({t.status})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Prompt type template wrapper drop selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-muted-foreground">Prompt Type</label>
            <select
              value={promptType}
              onChange={(e) => setPromptType(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs outline-none"
            >
              <option value="Standard Prompt">Standard Prompt</option>
              <option value="Instructional">Instructional System</option>
              <option value="Rephrase Reply">Rephrase Reply</option>
            </select>
            <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
              {promptType === "Standard Prompt" && "Best for general AI code/architecture synthesis tasks."}
              {promptType === "Instructional" && "Configures system instructions and rules."}
              {promptType === "Rephrase Reply" && "Tailors email, slack, or PR description drafts."}
            </p>
          </div>

          {/* Action Generator trigger */}
          <button
            onClick={handleGeneratePrompt}
            disabled={generating || !selectedProjectId}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition-colors"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-white" />
            )}
            Generate Prompt
          </button>

          {/* Output Preview pane */}
          <div className="flex-grow flex flex-col space-y-1.5 min-h-[180px]">
            <label className="block text-xs font-semibold text-muted-foreground">Generated Prompt Preview</label>
            <textarea
              readOnly
              value={generatedPrompt}
              placeholder="Compiled AI-ready prompt preview outputs will display here..."
              className="flex-grow w-full rounded-lg border border-border bg-background/50 p-3 text-xs leading-normal font-sans resize-none outline-none select-text"
            />
          </div>

          {/* Action Clipboard trigger */}
          <button
            onClick={handleCopyPrompt}
            disabled={!generatedPrompt}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-50 text-xs font-semibold transition-colors animate-in fade-in duration-200 flex-shrink-0"
          >
            {copiedPrompt ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                Copied Prompt!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                Copy to Clipboard
              </>
            )}
          </button>

          {/* Context Leak Checker Safety check */}
          {generatedPrompt && (
            <div className="pt-3 border-t border-border mt-3 space-y-2 animate-in fade-in duration-300 flex-shrink-0">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Safety Leak Check</div>
              <ContextLeakChecker text={generatedPrompt} />
            </div>
          )}
        </div>

      </div>

    </div>
  )
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg 
      className={`animate-spin ${className}`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
