"use client"

import React, { useEffect, useState } from "react"
import { apiClient } from "@/lib/api"
import { useToast } from "@/components/ui/Toaster"
import {
  ScrollText,
  Plus,
  Trash2,
  Send,
  Download,
  Sparkles,
  Cpu,
  ClipboardCheck,
  Database,
  X,
  Folder,
  Cloud,
  Copy,
  ChevronDown,
  ChevronUp,
  FileText,
  CalendarRange,
  Radar,
  Power,
  PowerOff,
  Clock,
  RefreshCw,
  CheckSquare,
  Square,
  Bot,
  User,
  ListChecks,
  Pencil,
} from "lucide-react"

interface CloudTrailSectionProps {
  projectId: string
}

const EXAMPLE_QUESTIONS = [
  "What are the recent security group changes?",
  "What did anoop do this week?",
  "Show me anything risky or suspicious",
  "Were any S3 buckets made public?",
]

function riskClasses(risk: string) {
  switch ((risk || "").toUpperCase()) {
    case "CRITICAL":
      return "text-red-500 border-red-500 bg-red-500/10"
    case "HIGH":
      return "text-orange-500 border-orange-500 bg-orange-500/10"
    case "MEDIUM":
      return "text-yellow-500 border-yellow-500 bg-yellow-500/10"
    case "LOW":
      return "text-blue-400 border-blue-400 bg-blue-400/10"
    default:
      return "text-muted-foreground border-border bg-secondary/5"
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export function CloudTrailSection({ projectId }: CloudTrailSectionProps) {
  const { push } = useToast()
  const [sources, setSources] = useState<any[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState<string>("")
  const [loadingSources, setLoadingSources] = useState<boolean>(true)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [copiedTextType, setCopiedTextType] = useState<string>("")
  const [showGuide, setShowGuide] = useState<boolean>(false)

  // Add-source form
  const [srcSourceType, setSrcSourceType] = useState<"local_folder" | "s3">("local_folder")
  const [srcName, setSrcName] = useState<string>("")
  const [srcLocation, setSrcLocation] = useState<string>("")
  const [srcAccountId, setSrcAccountId] = useState<string>("")
  const [srcRegions, setSrcRegions] = useState<string>("us-east-1")
  const [srcConnectionMethod, setSrcConnectionMethod] = useState<string>("local_role")
  const [srcRoleArn, setSrcRoleArn] = useState<string>("")
  const [srcExternalId, setSrcExternalId] = useState<string>("")

  // Date range (applies to both source types; required in spirit for S3 — it's what
  // bounds the S3 fetch to specific day-prefixes instead of scanning the bucket)
  const [dateFrom, setDateFrom] = useState<string>(daysAgoISO(6))
  const [dateTo, setDateTo] = useState<string>(todayISO())

  // Query state
  const [question, setQuestion] = useState<string>("")
  const [asking, setAsking] = useState<boolean>(false)
  const [result, setResult] = useState<any>(null)
  const [creatingTaskFor, setCreatingTaskFor] = useState<string>("")

  // Watch rules (automatic task creation)
  const [watchRules, setWatchRules] = useState<any[]>([])
  const [loadingRules, setLoadingRules] = useState<boolean>(false)
  const [isRuleModalOpen, setIsRuleModalOpen] = useState<boolean>(false)
  const [editingRuleId, setEditingRuleId] = useState<string>("")  // "" = creating a new rule
  const [checkingRuleId, setCheckingRuleId] = useState<string>("")
  const [ruleName, setRuleName] = useState<string>("")
  const [ruleResourceId, setRuleResourceId] = useState<string>("")
  const [ruleEventNames, setRuleEventNames] = useState<string>("")
  const [ruleKeywords, setRuleKeywords] = useState<string>("")
  const [ruleRiskyOnly, setRuleRiskyOnly] = useState<boolean>(false)
  const [rulePriorityOverride, setRulePriorityOverride] = useState<string>("")
  const [ruleCheckInterval, setRuleCheckInterval] = useState<number>(300)

  // CloudTrail Tasks (tasks created from this feature, kept separate from Planning)
  const [ctTasks, setCtTasks] = useState<any[]>([])
  const [loadingCtTasks, setLoadingCtTasks] = useState<boolean>(false)
  const [ctStatusFilter, setCtStatusFilter] = useState<string>("")
  const [ctOriginFilter, setCtOriginFilter] = useState<string>("")
  const [updatingCtTaskId, setUpdatingCtTaskId] = useState<string>("")

  useEffect(() => {
    loadSources()
  }, [projectId])

  useEffect(() => {
    if (selectedSourceId) {
      loadWatchRules()
      loadCloudTrailTasks()
    } else {
      setWatchRules([])
      setCtTasks([])
    }
  }, [selectedSourceId])

  useEffect(() => {
    if (selectedSourceId) loadCloudTrailTasks()
  }, [ctStatusFilter, ctOriginFilter])

  const loadSources = async () => {
    setLoadingSources(true)
    try {
      const client = apiClient()
      const res = await client.get(`/projects/${projectId}/cloudtrail/sources`)
      if (res.data?.success) {
        setSources(res.data.data || [])
        if (res.data.data.length > 0 && !selectedSourceId) {
          setSelectedSourceId(res.data.data[0].id)
        }
      }
    } catch (e) {
      console.error("Failed to load CloudTrail sources", e)
      push({ title: "Failed to load sources" })
    } finally {
      setLoadingSources(false)
    }
  }

  const handleLoadDemo = async () => {
    try {
      const client = apiClient()
      const res = await client.post(`/projects/${projectId}/cloudtrail/sources/load-demo`)
      if (res.data?.success) {
        push({ title: "Demo dataset loaded", description: "7 days of sample CloudTrail logs are ready." })
        setSelectedSourceId(res.data.data.id)
        loadSources()
      }
    } catch (e) {
      console.error("Failed to load demo", e)
      push({ title: "Demo dataset not available on server" })
    }
  }

  const resetSourceForm = () => {
    setSrcSourceType("local_folder")
    setSrcName("")
    setSrcLocation("")
    setSrcAccountId("")
    setSrcRegions("us-east-1")
    setSrcConnectionMethod("local_role")
    setSrcRoleArn("")
    setSrcExternalId(
      typeof window !== "undefined" && window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15)
    )
    setShowGuide(false)
  }

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!srcName || !srcLocation) {
      return push({ title: "Validation Error", description: "Name and location are required" })
    }
    if (srcSourceType === "s3" && !srcAccountId) {
      return push({ title: "Validation Error", description: "AWS account ID is required for an S3 source" })
    }
    try {
      const client = apiClient()
      const res = await client.post(`/projects/${projectId}/cloudtrail/sources`, {
        name: srcName,
        location: srcLocation,
        source_type: srcSourceType,
        account_id: srcSourceType === "s3" ? srcAccountId : undefined,
        regions: srcSourceType === "s3" ? srcRegions : undefined,
        connection_method: srcSourceType === "s3" ? srcConnectionMethod : undefined,
        role_arn: srcSourceType === "s3" && srcConnectionMethod === "cross_account_role" ? srcRoleArn : undefined,
        external_id: srcSourceType === "s3" && srcConnectionMethod === "cross_account_role" ? srcExternalId : undefined,
      })
      if (res.data?.success) {
        push({ title: "Source added" })
        setIsModalOpen(false)
        resetSourceForm()
        setSelectedSourceId(res.data.data.id)
        loadSources()
      }
    } catch (e: any) {
      console.error("Failed to add source", e)
      push({ title: "Failed to add source", description: e?.response?.data?.error })
    }
  }

  const handleDeleteSource = async (sid: string) => {
    if (!confirm("Remove this CloudTrail source?")) return
    try {
      const client = apiClient()
      const res = await client.delete(`/projects/${projectId}/cloudtrail/sources/${sid}`)
      if (res.data?.success) {
        push({ title: "Source removed" })
        if (selectedSourceId === sid) {
          setSelectedSourceId("")
          setResult(null)
        }
        loadSources()
      }
    } catch (e) {
      console.error("Failed to remove source", e)
      push({ title: "Failed to remove source" })
    }
  }

  const loadWatchRules = async () => {
    if (!selectedSourceId) return
    setLoadingRules(true)
    try {
      const client = apiClient()
      const res = await client.get(`/projects/${projectId}/cloudtrail/sources/${selectedSourceId}/watch-rules`)
      if (res.data?.success) setWatchRules(res.data.data || [])
    } catch (e) {
      console.error("Failed to load watch rules", e)
    } finally {
      setLoadingRules(false)
    }
  }

  const resetRuleForm = () => {
    setEditingRuleId("")
    setRuleName("")
    setRuleResourceId("")
    setRuleEventNames("")
    setRuleKeywords("")
    setRuleRiskyOnly(false)
    setRulePriorityOverride("")
    setRuleCheckInterval(300)
  }

  const openEditRule = (rule: any) => {
    setEditingRuleId(rule.id)
    setRuleName(rule.name || "")
    setRuleResourceId(rule.resource_id || "")
    setRuleEventNames(rule.event_names || "")
    setRuleKeywords(rule.keywords || "")
    setRuleRiskyOnly(!!rule.risky_only)
    setRulePriorityOverride(rule.priority_override || "")
    setRuleCheckInterval(rule.check_interval_seconds || 300)
    setIsRuleModalOpen(true)
  }

  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ruleName.trim()) {
      return push({ title: "Validation Error", description: "Rule name is required" })
    }
    if (!ruleResourceId.trim() && !ruleEventNames.trim() && !ruleKeywords.trim() && !ruleRiskyOnly) {
      return push({ title: "Validation Error", description: "Specify at least one match criterion" })
    }
    const payload = {
      name: ruleName.trim(),
      resource_id: ruleResourceId.trim() || undefined,
      event_names: ruleEventNames.trim() || undefined,
      keywords: ruleKeywords.trim() || undefined,
      risky_only: ruleRiskyOnly,
      priority_override: rulePriorityOverride || undefined,
      check_interval_seconds: ruleCheckInterval,
    }
    try {
      const client = apiClient()
      const res = editingRuleId
        ? await client.put(`/projects/${projectId}/cloudtrail/sources/${selectedSourceId}/watch-rules/${editingRuleId}`, payload)
        : await client.post(`/projects/${projectId}/cloudtrail/sources/${selectedSourceId}/watch-rules`, payload)
      if (res.data?.success) {
        push({
          title: editingRuleId ? "Watch rule updated" : "Watch rule created",
          description: "It will be checked automatically, or run it now.",
        })
        setIsRuleModalOpen(false)
        resetRuleForm()
        loadWatchRules()
      }
    } catch (e: any) {
      console.error("Failed to save watch rule", e)
      push({ title: editingRuleId ? "Failed to update rule" : "Failed to create rule", description: e?.response?.data?.error })
    }
  }

  const handleToggleRule = async (rule: any) => {
    try {
      const client = apiClient()
      const res = await client.put(
        `/projects/${projectId}/cloudtrail/sources/${selectedSourceId}/watch-rules/${rule.id}`,
        { enabled: !rule.enabled }
      )
      if (res.data?.success) loadWatchRules()
    } catch (e) {
      console.error("Failed to toggle rule", e)
      push({ title: "Failed to update rule" })
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Delete this watch rule? It will stop creating tasks automatically.")) return
    try {
      const client = apiClient()
      const res = await client.delete(`/projects/${projectId}/cloudtrail/sources/${selectedSourceId}/watch-rules/${ruleId}`)
      if (res.data?.success) loadWatchRules()
    } catch (e) {
      console.error("Failed to delete rule", e)
      push({ title: "Failed to delete rule" })
    }
  }

  const handleCheckRuleNow = async (ruleId: string) => {
    setCheckingRuleId(ruleId)
    try {
      const client = apiClient()
      const res = await client.post(
        `/projects/${projectId}/cloudtrail/sources/${selectedSourceId}/watch-rules/${ruleId}/check-now`
      )
      if (res.data?.success) {
        const n = res.data.data.summary.new_tasks
        push({
          title: n > 0 ? `${n} new task${n === 1 ? "" : "s"} created` : "No new matches",
          description: n > 0 ? "Added to CloudTrail Tasks below." : "Nothing new since the last check.",
        })
        loadWatchRules()
        loadCloudTrailTasks()
      }
    } catch (e: any) {
      console.error("Check now failed", e)
      push({ title: "Check failed", description: e?.response?.data?.error })
    } finally {
      setCheckingRuleId("")
    }
  }

  const formatInterval = (seconds: number) => {
    if (!seconds || seconds < 60) return "1 min"
    if (seconds < 3600) return `${Math.round(seconds / 60)} min`
    if (seconds < 86400) return `${Math.round(seconds / 3600)} hr`
    return `${Math.round(seconds / 86400)} day${seconds >= 172800 ? "s" : ""}`
  }

  const ruleCriteriaSummary = (rule: any) => {
    const parts: string[] = []
    if (rule.resource_id) parts.push(`resource: ${rule.resource_id}`)
    if (rule.event_names) parts.push(`events: ${rule.event_names}`)
    if (rule.keywords) parts.push(`keywords: ${rule.keywords}`)
    if (rule.risky_only) parts.push("risky only")
    return parts.join(" · ")
  }

  const loadCloudTrailTasks = async () => {
    if (!selectedSourceId) return
    setLoadingCtTasks(true)
    try {
      const client = apiClient()
      let url = `/projects/${projectId}/cloudtrail/tasks?source_id=${selectedSourceId}`
      if (ctStatusFilter) url += `&status=${ctStatusFilter}`
      if (ctOriginFilter) url += `&origin=${ctOriginFilter}`
      const res = await client.get(url)
      if (res.data?.success) setCtTasks(res.data.data || [])
    } catch (e) {
      console.error("Failed to load CloudTrail tasks", e)
    } finally {
      setLoadingCtTasks(false)
    }
  }

  const toggleCtTaskDone = async (link: any) => {
    const isDone = link.task.status === "completed"
    setUpdatingCtTaskId(link.task.id)
    try {
      const client = apiClient()
      const res = await client.put(`/tasks/${link.task.id}`, { status: isDone ? "open" : "completed" })
      if (res.data?.success) loadCloudTrailTasks()
    } catch (e) {
      console.error("Failed to update task", e)
      push({ title: "Failed to update task" })
    } finally {
      setUpdatingCtTaskId("")
    }
  }

  const deleteCtTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return
    try {
      const client = apiClient()
      const res = await client.delete(`/tasks/${taskId}`)
      if (res.data?.success) loadCloudTrailTasks()
    } catch (e) {
      console.error("Failed to delete task", e)
      push({ title: "Failed to delete task" })
    }
  }

  const applyPreset = (days: number) => {
    setDateFrom(daysAgoISO(days - 1))
    setDateTo(todayISO())
  }

  const ask = async (q?: string) => {
    const query = (q ?? question).trim()
    if (!query) return push({ title: "Enter a question first" })
    if (!selectedSourceId) return push({ title: "Select a log source first" })
    if (dateFrom && dateTo && dateFrom > dateTo) {
      return push({ title: "Invalid date range", description: "'From' must be before 'To'" })
    }
    if (q) setQuestion(q)

    setAsking(true)
    setResult(null)
    try {
      const client = apiClient()
      const res = await client.post(
        `/projects/${projectId}/cloudtrail/sources/${selectedSourceId}/ask`,
        { question: query, date_from: dateFrom || undefined, date_to: dateTo || undefined }
      )
      if (res.data?.success) {
        setResult(res.data.data)
      } else {
        push({ title: "No answer", description: res.data?.error || "Could not analyze logs" })
      }
    } catch (e: any) {
      console.error("Ask failed", e)
      push({ title: "Query failed", description: e?.response?.data?.error || "Could not analyze logs" })
    } finally {
      setAsking(false)
    }
  }

  const downloadCsv = () => {
    if (!result?.csv) return
    const blob = new Blob([result.csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "cloudtrail_events.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const createTask = async (event: any) => {
    setCreatingTaskFor(event.event_id)
    try {
      const client = apiClient()
      const res = await client.post(`/projects/${projectId}/cloudtrail/create-task`, {
        event,
        source_id: selectedSourceId,
        note: `What was the purpose of this change? (${event.event_name} by ${event.username})`,
      })
      if (res.data?.success) {
        push({ title: "Task created", description: "Added to CloudTrail Tasks below." })
        loadCloudTrailTasks()
      }
    } catch (e) {
      console.error("Create task failed", e)
      push({ title: "Failed to create task" })
    } finally {
      setCreatingTaskFor("")
    }
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopiedTextType(type)
    setTimeout(() => setCopiedTextType(""), 2000)
  }

  const events: any[] = result?.events || []
  const activeSource = sources.find((s: any) => s.id === selectedSourceId)

  const s3ReadPolicyJson = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::${srcLocation.replace(/^s3:\/\//, "").split("/")[0] || "your-cloudtrail-bucket"}"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::${srcLocation.replace(/^s3:\/\//, "").split("/")[0] || "your-cloudtrail-bucket"}/*"
    }
  ]
}`

  const s3TrustPolicyJson = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::${srcAccountId || "123456789012"}:role/CoeX-EC2-Instance-Profile" },
      "Action": "sts:AssumeRole",
      "Condition": { "StringEquals": { "sts:ExternalId": "${srcExternalId || "coex-cloudtrail-external-id"}" } }
    }
  ]
}`

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-accent" />
            CloudTrail Review
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Ask plain-English questions about your CloudTrail activity for a chosen date range. A local
            AI (Ollama) explains what changed; export the raw events as CSV or turn any change into a
            review task.
          </p>
        </div>
        {sources.length > 0 && (
          <button
            onClick={() => {
              resetSourceForm()
              setIsModalOpen(true)
            }}
            className="rounded border border-accent text-accent px-4 py-2 hover:bg-accent/10 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Source
          </button>
        )}
      </div>

      {/* Sources / empty state */}
      {loadingSources ? (
        <div className="text-center py-6 text-sm text-muted-foreground">Loading sources…</div>
      ) : sources.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center flex flex-col items-center justify-center">
          <ScrollText className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h4 className="text-lg font-semibold">No CloudTrail source connected</h4>
          <p className="text-sm text-muted-foreground max-w-md mt-2 mb-6">
            Connect the project to your trail's S3 bucket (read-only) to fetch real logs for any date
            range, point at a folder of CloudTrail JSON on this server, or load the bundled 7-day
            sample dataset to try the workflow instantly.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={handleLoadDemo}
              className="rounded bg-accent text-accent-foreground px-4 py-2 hover:bg-accent/90 transition-colors font-medium flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Load 7-day sample
            </button>
            <button
              onClick={() => {
                resetSourceForm()
                setIsModalOpen(true)
              }}
              className="rounded border border-border px-4 py-2 hover:bg-secondary/5 transition-colors font-medium"
            >
              Connect a source
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 items-center border-b border-border pb-4">
          <span className="text-sm text-muted-foreground font-medium">Log Source:</span>
          {sources.map((s: any) => (
            <div
              key={s.id}
              className={`flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border text-sm transition-colors cursor-pointer ${
                selectedSourceId === s.id
                  ? "bg-accent/15 border-accent text-foreground"
                  : "bg-secondary/5 border-border text-muted-foreground hover:bg-secondary/10"
              }`}
              onClick={() => {
                setSelectedSourceId(s.id)
                setResult(null)
              }}
            >
              {s.source_type === "s3" ? <Cloud className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />}
              <span>{s.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteSource(s.id)
                }}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Remove source"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Query panel */}
      {selectedSourceId && (
        <div className="space-y-5">
          <div className="bg-secondary/5 p-4 rounded-lg border border-border space-y-3">
            {/* Date range row */}
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <CalendarRange className="h-3.5 w-3.5" />
                Date range{activeSource?.source_type === "s3" ? " (bounds what's fetched from S3)" : ""}:
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                max={dateTo}
                className="rounded border border-border bg-background px-2 py-1 text-xs"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom}
                max={todayISO()}
                className="rounded border border-border bg-background px-2 py-1 text-xs"
              />
              <div className="flex gap-1 ml-1">
                {[
                  { label: "7d", days: 7 },
                  { label: "14d", days: 14 },
                  { label: "30d", days: 30 },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p.days)}
                    className="text-[11px] rounded border border-border px-2 py-1 hover:bg-secondary/10 transition-colors"
                  >
                    Last {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask()}
                placeholder="Ask about your CloudTrail logs…"
                className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                onClick={() => ask()}
                disabled={asking}
                className="rounded bg-accent text-accent-foreground px-4 py-2 text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                {asking ? "Analyzing…" : "Ask"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  disabled={asking}
                  className="text-xs rounded-full border border-border bg-background px-3 py-1 text-muted-foreground hover:text-foreground hover:border-accent/60 transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {asking && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {activeSource?.source_type === "s3"
                ? "Fetching CloudTrail objects from S3 for the selected date range…"
                : "Scanning CloudTrail events…"}
            </div>
          )}

          {result && !asking && (
            <div className="space-y-5">
              {/* Answer / summary */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    Analysis
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        result.ai_used
                          ? "border-accent/50 text-accent bg-accent/5"
                          : "border-border text-muted-foreground bg-secondary/5"
                      }`}
                      title={result.ai_used ? "Answered by local Ollama model" : "Ollama not reachable — used the built-in rule-based analyzer"}
                    >
                      <Cpu className="h-3 w-3" />
                      {result.ai_used ? `AI: ${result.ai_model}` : "Rule-based fallback"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {result.date_from} → {result.date_to}
                      {result.date_range_defaulted && " (defaulted)"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {result.match_count} / {result.total_scanned} events
                    </span>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed bg-background/40 p-3 rounded border border-border/40">
                  {result.summary}
                </pre>
              </div>

              {/* Matched events table */}
              {events.length > 0 && (
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-border">
                    <span className="text-sm font-semibold">Matched Events ({events.length})</span>
                    <button
                      onClick={downloadCsv}
                      className="rounded border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary/5 transition-colors flex items-center gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/5 text-muted-foreground text-xs uppercase tracking-wider">
                        <tr>
                          <th className="text-left font-medium px-3 py-2">Risk</th>
                          <th className="text-left font-medium px-3 py-2">Time (UTC)</th>
                          <th className="text-left font-medium px-3 py-2">Action</th>
                          <th className="text-left font-medium px-3 py-2">User</th>
                          <th className="text-left font-medium px-3 py-2">Resource</th>
                          <th className="text-left font-medium px-3 py-2">Region</th>
                          <th className="text-right font-medium px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.map((ev: any) => (
                          <tr key={ev.event_id} className="border-t border-border/60 hover:bg-secondary/5">
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${riskClasses(ev.risk)}`}
                                title={ev.risk_reason}
                              >
                                {ev.risk}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                              {(ev.event_time || "").slice(0, 16).replace("T", " ")}
                            </td>
                            <td className="px-3 py-2 font-medium">
                              {ev.event_name}
                              {ev.error_code && (
                                <span className="ml-1 text-[10px] text-red-400">({ev.error_code})</span>
                              )}
                            </td>
                            <td className="px-3 py-2">{ev.username}</td>
                            <td className="px-3 py-2 font-mono text-xs">{ev.resource}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{ev.aws_region}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => createTask(ev)}
                                disabled={creatingTaskFor === ev.event_id}
                                className="rounded border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-secondary/5 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                                title="Create a review task from this event"
                              >
                                <ClipboardCheck className="h-3.5 w-3.5" />
                                {creatingTaskFor === ev.event_id ? "…" : "Task"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Automatic Watch Rules */}
      {selectedSourceId && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="font-semibold flex items-center gap-2">
                <Radar className="h-4 w-4 text-accent" />
                Automatic Watch Rules
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Define a rule once — matching events automatically become a task. Checked in the
                background every ~60s, or run "Check Now" any time.
              </p>
            </div>
            <button
              onClick={() => {
                resetRuleForm()
                setIsRuleModalOpen(true)
              }}
              className="rounded border border-accent text-accent px-3 py-1.5 text-sm hover:bg-accent/10 transition-colors flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Rule
            </button>
          </div>

          {loadingRules ? (
            <div className="text-sm text-muted-foreground text-center py-4">Loading rules…</div>
          ) : watchRules.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded">
              No watch rules yet — e.g. "any change on sg-0a1b2c3d" or "any risky activity".
            </div>
          ) : (
            <div className="space-y-2">
              {watchRules.map((rule: any) => (
                <div
                  key={rule.id}
                  className={`flex items-center gap-3 p-3 rounded border ${
                    rule.enabled ? "border-border bg-background" : "border-border/50 bg-secondary/5 opacity-60"
                  }`}
                >
                  <button
                    onClick={() => handleToggleRule(rule)}
                    title={rule.enabled ? "Enabled — click to pause" : "Paused — click to enable"}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    {rule.enabled ? <Power className="h-4 w-4 text-green-500" /> : <PowerOff className="h-4 w-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{rule.name}</div>
                    <div className="text-xs text-muted-foreground truncate font-mono">
                      {ruleCriteriaSummary(rule) || "—"}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {rule.last_checked_at
                        ? `Last checked ${new Date(rule.last_checked_at).toLocaleString()} — ${rule.last_match_count} new`
                        : "Not checked yet"}
                      <span className="mx-1">·</span>
                      every {formatInterval(rule.check_interval_seconds)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCheckRuleNow(rule.id)}
                    disabled={checkingRuleId === rule.id || !rule.enabled}
                    title={rule.enabled ? "Check now" : "Enable the rule to check it"}
                    className="rounded border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-secondary/5 transition-colors disabled:opacity-50 inline-flex items-center gap-1 shrink-0"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${checkingRuleId === rule.id ? "animate-spin" : ""}`} />
                    Check Now
                  </button>
                  <button
                    onClick={() => openEditRule(rule)}
                    className="p-1.5 rounded hover:bg-secondary/10 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="Edit rule"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    title="Delete rule"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CloudTrail Tasks — kept separate from the project's general Planning tasks */}
      {selectedSourceId && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-3 p-4 border-b border-border">
            <div>
              <h4 className="font-semibold flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-accent" />
                CloudTrail Tasks
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Tasks created from this source — manually or by a watch rule — separate from the
                project's general Planning tasks so they're easy to triage.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={ctStatusFilter}
                onChange={(e) => setCtStatusFilter(e.target.value)}
                className="rounded border border-border bg-background px-2 py-1 text-xs"
              >
                <option value="">All statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
              <select
                value={ctOriginFilter}
                onChange={(e) => setCtOriginFilter(e.target.value)}
                className="rounded border border-border bg-background px-2 py-1 text-xs"
              >
                <option value="">All origins</option>
                <option value="manual">Manual</option>
                <option value="auto">Auto (watch rule)</option>
              </select>
            </div>
          </div>

          {loadingCtTasks ? (
            <div className="text-sm text-muted-foreground text-center py-6">Loading tasks…</div>
          ) : ctTasks.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              No CloudTrail tasks yet. Create one from a matched event above, or add a watch rule.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {ctTasks.map((link: any) => {
                const task = link.task
                const isDone = task.status === "completed"
                return (
                  <div key={link.id} className="flex items-start gap-3 p-3 hover:bg-secondary/5">
                    <button
                      onClick={() => toggleCtTaskDone(link)}
                      disabled={updatingCtTaskId === task.id}
                      className="mt-0.5 text-muted-foreground hover:text-foreground disabled:opacity-50 shrink-0"
                      title={isDone ? "Mark as open" : "Mark as done"}
                    >
                      {isDone ? <CheckSquare className="h-4 w-4 text-green-500" /> : <Square className="h-4 w-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm truncate ${isDone ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${riskClasses(
                          task.priority === "critical" ? "CRITICAL" : task.priority === "high" ? "HIGH" :
                          task.priority === "medium" ? "MEDIUM" : "LOW"
                        )}`}>
                          {task.priority}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          {link.origin === "auto" ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                          {link.origin === "auto" ? `Auto: ${link.rule_name || "rule deleted"}` : "Manual"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(link.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCtTask(task.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      title="Delete task"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Add source modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-lg shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h4 className="text-lg font-bold flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-accent" />
                Connect CloudTrail Source
              </h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-secondary/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSource} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Source type toggle */}
              <div className="space-y-2">
                <label className="text-sm font-medium block">Source Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer select-none transition-colors ${
                    srcSourceType === "local_folder"
                      ? "border-accent bg-accent/5 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-secondary/2"
                  }`}>
                    <input
                      type="radio"
                      name="srcSourceType"
                      checked={srcSourceType === "local_folder"}
                      onChange={() => setSrcSourceType("local_folder")}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-semibold block text-sm flex items-center gap-1.5">
                        <Folder className="h-4 w-4" />
                        Local Folder
                      </span>
                      <span className="text-xs text-muted-foreground block mt-1 leading-normal">
                        Read CloudTrail JSON files already on this server (demo data, or a synced export).
                      </span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer select-none transition-colors ${
                    srcSourceType === "s3"
                      ? "border-accent bg-accent/5 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-secondary/2"
                  }`}>
                    <input
                      type="radio"
                      name="srcSourceType"
                      checked={srcSourceType === "s3"}
                      onChange={() => setSrcSourceType("s3")}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-semibold block text-sm flex items-center gap-1.5">
                        <Cloud className="h-4 w-4" />
                        S3 Bucket (Read-Only)
                      </span>
                      <span className="text-xs text-muted-foreground block mt-1 leading-normal">
                        Fetch real CloudTrail logs from the trail's S3 bucket for a chosen date range —
                        never a full-bucket scan.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Source Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Production account logs"
                    value={srcName}
                    onChange={(e) => setSrcName(e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {srcSourceType === "s3" ? "Bucket (s3://bucket[/prefix])" : "Log Folder Path (on server)"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={srcSourceType === "s3" ? "s3://my-cloudtrail-bucket" : "storage/cloudtrail/demo"}
                    value={srcLocation}
                    onChange={(e) => setSrcLocation(e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>

              {srcSourceType === "local_folder" ? (
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Folder containing CloudTrail JSON (or .json.gz) files. The real S3 export layout
                  (AWSLogs/…/CloudTrail/…) is read recursively.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">AWS Account ID</label>
                      <input
                        type="text"
                        required
                        maxLength={12}
                        placeholder="12-digit account ID"
                        value={srcAccountId}
                        onChange={(e) => setSrcAccountId(e.target.value)}
                        className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Trail Regions (comma-separated)</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. us-east-1,us-west-2"
                        value={srcRegions}
                        onChange={(e) => setSrcRegions(e.target.value)}
                        className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium block">Connection Mode</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
                      <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer select-none transition-colors ${
                        srcConnectionMethod === "local_role"
                          ? "border-accent bg-accent/5 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-secondary/2"
                      }`}>
                        <input
                          type="radio"
                          name="srcConnectionMethod"
                          checked={srcConnectionMethod === "local_role"}
                          onChange={() => setSrcConnectionMethod("local_role")}
                          className="mt-1"
                        />
                        <div>
                          <span className="font-semibold block text-sm">This Server's Role</span>
                          <span className="text-xs text-muted-foreground block mt-1 leading-normal">
                            Use the EC2 Instance Profile role already attached to this server.
                          </span>
                        </div>
                      </label>
                      <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer select-none transition-colors ${
                        srcConnectionMethod === "cross_account_role"
                          ? "border-accent bg-accent/5 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-secondary/2"
                      }`}>
                        <input
                          type="radio"
                          name="srcConnectionMethod"
                          checked={srcConnectionMethod === "cross_account_role"}
                          onChange={() => setSrcConnectionMethod("cross_account_role")}
                          className="mt-1"
                        />
                        <div>
                          <span className="font-semibold block text-sm">Cross-Account Role</span>
                          <span className="text-xs text-muted-foreground block mt-1 leading-normal">
                            Assume a role in the account that owns the trail bucket via STS + External ID.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {srcConnectionMethod === "cross_account_role" && (
                    <div className="space-y-4 p-4 rounded-lg bg-secondary/5 border border-border">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Assumable IAM Role ARN</label>
                        <input
                          type="text"
                          required
                          placeholder="arn:aws:iam::123456789012:role/CoeX-CloudTrail-Read-Role"
                          value={srcRoleArn}
                          onChange={(e) => setSrcRoleArn(e.target.value)}
                          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium block">STS External ID</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={srcExternalId}
                            className="flex-1 rounded border border-border bg-background/50 px-3 py-2 text-sm font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => copyToClipboard(srcExternalId, "external_id")}
                            className="rounded border border-border bg-background px-3 py-2 hover:bg-secondary/5 text-sm"
                          >
                            {copiedTextType === "external_id" ? "Copied!" : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border border-border/80 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowGuide(!showGuide)}
                      className="w-full flex items-center justify-between p-3.5 bg-secondary/5 hover:bg-secondary/10 text-sm font-medium transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-accent" />
                        Read-only IAM policy guide
                      </span>
                      {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {showGuide && (
                      <div className="p-4 border-t border-border space-y-4 bg-background text-xs leading-relaxed max-h-[220px] overflow-y-auto">
                        <div>
                          <div className="flex items-center justify-between font-bold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
                            <span>S3 read-only permissions (attach to the role above)</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(s3ReadPolicyJson, "s3read")}
                              className="flex items-center gap-1 hover:text-foreground text-[9px]"
                            >
                              <Copy className="h-3 w-3" />
                              {copiedTextType === "s3read" ? "Copied JSON!" : "Copy JSON"}
                            </button>
                          </div>
                          <pre className="p-3 bg-secondary/5 rounded border border-border overflow-x-auto text-[11px] font-mono whitespace-pre text-foreground">
                            {s3ReadPolicyJson}
                          </pre>
                        </div>
                        {srcConnectionMethod === "cross_account_role" && (
                          <div>
                            <div className="flex items-center justify-between font-bold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
                              <span>Trust relationship (on the target account's role)</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(s3TrustPolicyJson, "s3trust")}
                                className="flex items-center gap-1 hover:text-foreground text-[9px]"
                              >
                                <Copy className="h-3 w-3" />
                                {copiedTextType === "s3trust" ? "Copied JSON!" : "Copy JSON"}
                              </button>
                            </div>
                            <pre className="p-3 bg-secondary/5 rounded border border-border overflow-x-auto text-[11px] font-mono whitespace-pre text-foreground">
                              {s3TrustPolicyJson}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded border border-border bg-background px-4 py-2 hover:bg-secondary/5 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-accent text-accent-foreground px-4 py-2 hover:bg-accent/90 transition-colors text-sm font-medium"
                >
                  Connect Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add watch rule modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-card border border-border rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h4 className="text-lg font-bold flex items-center gap-2">
                <Radar className="h-5 w-5 text-accent" />
                {editingRuleId ? "Edit Watch Rule" : "Add Watch Rule"}
              </h4>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-secondary/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitRule} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prod SG changes"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Resource ID (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. sg-0a1b2c3d — matches any event on this exact resource"
                  value={ruleResourceId}
                  onChange={(e) => setRuleResourceId(e.target.value)}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Event Names (optional, comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. AuthorizeSecurityGroupIngress,RevokeSecurityGroupIngress"
                  value={ruleEventNames}
                  onChange={(e) => setRuleEventNames(e.target.value)}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Keywords (optional, comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. bucket-policy,public"
                  value={ruleKeywords}
                  onChange={(e) => setRuleKeywords(e.target.value)}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={ruleRiskyOnly}
                    onChange={(e) => setRuleRiskyOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Risky events only
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Task priority</label>
                  <select
                    value={rulePriorityOverride}
                    onChange={(e) => setRulePriorityOverride(e.target.value)}
                    className="rounded border border-border bg-background px-2 py-1.5 text-sm"
                  >
                    <option value="">Auto (from risk)</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium">Check every</label>
                <select
                  value={ruleCheckInterval}
                  onChange={(e) => setRuleCheckInterval(Number(e.target.value))}
                  className="rounded border border-border bg-background px-2 py-1.5 text-sm"
                >
                  <option value={60}>1 minute</option>
                  <option value={300}>5 minutes</option>
                  <option value={900}>15 minutes</option>
                  <option value={3600}>1 hour</option>
                  <option value={21600}>6 hours</option>
                  <option value={86400}>Daily</option>
                </select>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                This is a floor, not a guarantee — the background check itself runs about once a
                minute, so an interval shorter than that has no extra effect. "Check Now" always runs
                immediately regardless of this setting.
              </p>

              <p className="text-[11px] text-muted-foreground leading-normal border-t border-border pt-3">
                Specify at least one of Resource ID, Event Names, Keywords, or "Risky events only".
                Matching is on resource ID / event name / keyword only — not resource tags.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="rounded border border-border bg-background px-4 py-2 hover:bg-secondary/5 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-accent text-accent-foreground px-4 py-2 hover:bg-accent/90 transition-colors text-sm font-medium"
                >
                  {editingRuleId ? "Save Changes" : "Add Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
