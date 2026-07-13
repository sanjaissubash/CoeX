"use client"

import { useEffect, useMemo, useState } from "react"
import type { Dispatch, ReactNode, SetStateAction } from "react"
import { CalendarDays, Copy, FileText, Plus, Trash2 } from "lucide-react"
import { apiClient } from "@/lib/api"
import { Modal } from "@/components/ui/Modal"
import { useToast } from "@/components/ui/Toaster"
import { ContextLeakChecker } from "@/components/projects/context-leak-checker"

type Task = {
  id: string
  title: string
  description?: string
  priority?: string
  status: string
  due_date?: string | null
}

const COLUMNS = [
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In Progress" },
  { id: "blocked", label: "Blocked" },
  { id: "completed", label: "Done" },
]

const PRIORITIES = ["low", "medium", "high", "urgent"]

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : ""
}

export function TasksSection({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<Task | null>(null)
  const [contextTask, setContextTask] = useState<Task | null>(null)
  const [contextOpen, setContextOpen] = useState(false)
  const [contextLoading, setContextLoading] = useState(false)
  const [contextText, setContextText] = useState("")
  const [copiedContext, setCopiedContext] = useState(false)
  const { push } = useToast()

  const [draft, setDraft] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "open",
    due_date: "",
  })
  const [editDraft, setEditDraft] = useState(draft)

  useEffect(() => {
    fetchTasks()
  }, [projectId])

  useEffect(() => {
    if (!selected) return
    setEditDraft({
      title: selected.title,
      description: selected.description || "",
      priority: selected.priority || "medium",
      status: selected.status,
      due_date: toDateInput(selected.due_date),
    })
  }, [selected])

  const grouped = useMemo(() => {
    return COLUMNS.reduce((acc, column) => {
      acc[column.id] = tasks.filter((task) => task.status === column.id || (column.id === "completed" && task.status === "done"))
      return acc
    }, {} as Record<string, Task[]>)
  }, [tasks])

  const fetchTasks = async () => {
    try {
      const response = await apiClient().get(`/projects/${projectId}/tasks`)
      if (response.data.success) setTasks(response.data.data)
    } catch (error) {
      console.error("Failed to fetch tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetDraft = () => {
    setDraft({ title: "", description: "", priority: "medium", status: "open", due_date: "" })
  }

  const handleCreateTask = async () => {
    if (!draft.title.trim()) return
    try {
      const response = await apiClient().post(`/projects/${projectId}/tasks`, {
        title: draft.title.trim(),
        description: draft.description.trim(),
        priority: draft.priority,
        status: draft.status,
        due_date: draft.due_date || null,
      })
      if (response.data.success) {
        setTasks([response.data.data, ...tasks])
        resetDraft()
        setShowAdd(false)
      }
    } catch (error) {
      console.error("Failed to create task:", error)
    }
  }

  const updateTask = async (taskId: string, patch: Partial<Task>) => {
    const response = await apiClient().patch(`/tasks/${taskId}`, patch)
    if (response.data.success) {
      setTasks((items) => items.map((task) => (task.id === taskId ? response.data.data : task)))
      setSelected((task) => (task?.id === taskId ? response.data.data : task))
      return response.data.data as Task
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await apiClient().delete(`/tasks/${taskId}`)
      if (response.data.success) {
        setTasks(tasks.filter((task) => task.id !== taskId))
        setSelected(null)
      }
    } catch (error) {
      console.error("Failed to delete task:", error)
    }
  }

  const saveSelectedTask = async () => {
    if (!selected || !editDraft.title.trim()) return
    await updateTask(selected.id, {
      title: editDraft.title.trim(),
      description: editDraft.description.trim(),
      priority: editDraft.priority,
      status: editDraft.status,
      due_date: editDraft.due_date || null,
    })
    setSelected(null)
  }

  const openTaskContext = async (task: Task) => {
    setContextTask(task)
    setContextOpen(true)
    setContextLoading(true)
    setCopiedContext(false)
    try {
      const response = await apiClient().get(`/tasks/${task.id}/context`)
      if (response.data.success) setContextText(response.data.data.compact_text)
      else setContextText("Failed to generate task context")
    } catch (error) {
      console.error("Failed to generate task context:", error)
      setContextText("Failed to generate task context")
    } finally {
      setContextLoading(false)
    }
  }

  const copyTaskContext = async () => {
    try {
      await navigator.clipboard.writeText(contextText)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = contextText
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    setCopiedContext(true)
    push({ title: "Copied", description: "Task context copied to clipboard" })
    window.setTimeout(() => setCopiedContext(false), 1800)
  }

  if (loading) return <div className="text-muted-foreground">Loading tasks...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="font-medium">Tasks ({tasks.length})</h4>
          <p className="text-sm text-muted-foreground">Plan, prioritize, and generate task-specific AI context.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-sm hover:bg-secondary">
          <Plus className="h-4 w-4" />
          Add Task
        </button>
      </div>

      <div className="grid gap-3 xl:grid-cols-4">
        {COLUMNS.map((column) => (
          <div key={column.id} className="min-h-72 rounded-lg border border-border bg-secondary/20 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">{column.label}</div>
              <span className="rounded bg-background px-2 py-0.5 text-xs text-muted-foreground">{grouped[column.id]?.length || 0}</span>
            </div>

            <div className="space-y-2">
              {(grouped[column.id] || []).map((task) => (
                <div key={task.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                  <button onClick={() => setSelected(task)} className="block w-full text-left">
                    <div className="font-medium">{task.title}</div>
                    {task.description && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</div>}
                  </button>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded border border-border px-2 py-0.5 capitalize">{task.priority || "medium"}</span>
                    {task.due_date && (
                      <span className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5">
                        <CalendarDays className="h-3 w-3" />
                        {toDateInput(task.due_date)}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <select
                      value={task.status}
                      onChange={(event) => updateTask(task.id, { status: event.target.value })}
                      className="rounded border border-border bg-background px-2 py-1 text-xs"
                    >
                      {COLUMNS.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      <button onClick={() => openTaskContext(task)} className="rounded border border-border p-1.5 hover:bg-secondary" title="Generate task context">
                        <FileText className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteTask(task.id)} className="rounded border border-border p-1.5 hover:bg-destructive/20" title="Delete task">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {(grouped[column.id] || []).length === 0 && (
                <div className="rounded border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No tasks</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add task">
        <TaskForm draft={draft} setDraft={setDraft} onSubmit={handleCreateTask} submitLabel="Create task" />
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Task details">
        {selected && (
          <TaskForm
            draft={editDraft}
            setDraft={setEditDraft}
            onSubmit={saveSelectedTask}
            submitLabel="Save task"
            extraAction={<button onClick={() => openTaskContext(selected)} className="inline-flex items-center gap-2 rounded border border-border px-3 py-2"><FileText className="h-4 w-4" /> Generate Context</button>}
          />
        )}
      </Modal>

      <Modal open={contextOpen} onClose={() => setContextOpen(false)} title="Task Context">
        <div className="space-y-3">
          {contextLoading ? (
            <div className="text-sm text-muted-foreground">Generating task context...</div>
          ) : (
            <>
              <textarea
                aria-label="Editable generated task context"
                value={contextText}
                onChange={(event) => setContextText(event.target.value)}
                className="min-h-[45vh] max-h-[55vh] w-full resize-y overflow-auto rounded border bg-background p-3 font-mono text-sm"
                placeholder="No context available"
              />
              <div className="flex flex-wrap justify-end gap-2">
                <ContextLeakChecker text={contextText} />
                <button onClick={copyTaskContext} className="inline-flex items-center gap-2 rounded bg-accent px-3 py-2 text-accent-foreground">
                  <Copy className="h-4 w-4" />
                  {copiedContext ? "Copied" : "Copy"}
                </button>
                <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(contextText || "")}`} download={`${contextTask?.title || "task"}-context.txt`} className="rounded border px-3 py-2">Export</a>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}

function TaskForm({
  draft,
  setDraft,
  onSubmit,
  submitLabel,
  extraAction,
}: {
  draft: { title: string; description: string; priority: string; status: string; due_date: string }
  setDraft: Dispatch<SetStateAction<{ title: string; description: string; priority: string; status: string; due_date: string }>>
  onSubmit: () => void
  submitLabel: string
  extraAction?: ReactNode
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Title</label>
        <input value={draft.title} onChange={(event) => setDraft((state) => ({ ...state, title: event.target.value }))} className="mt-1 w-full rounded border border-border bg-background px-3 py-2" />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <textarea value={draft.description} onChange={(event) => setDraft((state) => ({ ...state, description: event.target.value }))} className="mt-1 w-full rounded border border-border bg-background px-3 py-2" rows={4} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium">Status</label>
          <select value={draft.status} onChange={(event) => setDraft((state) => ({ ...state, status: event.target.value }))} className="mt-1 w-full rounded border border-border bg-background px-3 py-2">
            {COLUMNS.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Priority</label>
          <select value={draft.priority} onChange={(event) => setDraft((state) => ({ ...state, priority: event.target.value }))} className="mt-1 w-full rounded border border-border bg-background px-3 py-2">
            {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Due date</label>
          <input type="date" value={draft.due_date} onChange={(event) => setDraft((state) => ({ ...state, due_date: event.target.value }))} className="mt-1 w-full rounded border border-border bg-background px-3 py-2" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {extraAction}
        <button onClick={onSubmit} className="rounded bg-accent px-3 py-2 text-accent-foreground">{submitLabel}</button>
      </div>
    </div>
  )
}
