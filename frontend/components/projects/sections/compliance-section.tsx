"use client"

import React, { useEffect, useState } from "react"
import { apiClient } from "@/lib/api"
import { useToast } from "@/components/ui/Toaster"
import { 
  Shield, 
  Plus, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Check, 
  ExternalLink, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  Info,
  Server,
  Key
} from "lucide-react"

interface ComplianceSectionProps {
  projectId: string
}

export function ComplianceSection({ projectId }: ComplianceSectionProps) {
  const { push } = useToast()
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [findings, setFindings] = useState<any[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(true)
  const [loadingFindings, setLoadingFindings] = useState<boolean>(false)
  const [syncingAccountId, setSyncingAccountId] = useState<string>("")
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [showGuide, setShowGuide] = useState<boolean>(false)
  const [copiedTextType, setCopiedTextType] = useState<string>("")

  // Form Fields
  const [accountName, setAccountName] = useState<string>("")
  const [accountIdVal, setAccountIdVal] = useState<string>("")
  const [connectionMethod, setConnectionMethod] = useState<string>("local_role")
  const [roleArn, setRoleArn] = useState<string>("")
  const [externalId, setExternalId] = useState<string>("")
  const [regions, setRegions] = useState<string>("us-east-1,us-west-2")

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [filterSeverity, setFilterSeverity] = useState<string>("")
  const [filterSource, setFilterSource] = useState<string>("")
  const [filterRegion, setFilterRegion] = useState<string>("")
  const [filterResourceType, setFilterResourceType] = useState<string>("")

  // Expansion and Selection
  const [expandedFindingIds, setExpandedFindingIds] = useState<Record<string, boolean>>({})
  const [selectedFindingIds, setSelectedFindingIds] = useState<Record<string, boolean>>({})
  const [bulkConverting, setBulkConverting] = useState<boolean>(false)

  useEffect(() => {
    loadAccounts()
  }, [projectId])

  useEffect(() => {
    if (selectedAccountId) {
      loadFindings()
    } else {
      setFindings([])
    }
  }, [selectedAccountId, searchQuery, filterSeverity, filterSource, filterRegion, filterResourceType])

  const loadAccounts = async () => {
    setLoadingAccounts(true)
    try {
      const client = apiClient()
      const res = await client.get(`/projects/${projectId}/compliance/accounts`)
      if (res.data && res.data.success) {
        setAccounts(res.data.data || [])
        if (res.data.data.length > 0 && !selectedAccountId) {
          setSelectedAccountId(res.data.data[0].id)
        }
      }
    } catch (e) {
      console.error("Failed to load compliance accounts", e)
      push({ title: "Failed to load accounts" })
    } finally {
      setLoadingAccounts(false)
    }
  }

  const loadFindings = async () => {
    setLoadingFindings(true)
    try {
      const client = apiClient()
      let url = `/projects/${projectId}/compliance/findings?account_id=${selectedAccountId}`
      if (filterSeverity) url += `&severity=${filterSeverity}`
      if (filterSource) url += `&source=${filterSource}`
      if (filterRegion) url += `&region=${filterRegion}`
      if (filterResourceType) url += `&resource_type=${filterResourceType}`
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`
      
      const res = await client.get(url)
      if (res.data && res.data.success) {
        setFindings(res.data.data || [])
        // Reset selections when changing accounts/filters
        setSelectedFindingIds({})
      }
    } catch (e) {
      console.error("Failed to load compliance findings", e)
      push({ title: "Failed to load findings" })
    } finally {
      setLoadingFindings(false)
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountName || !accountIdVal) {
      return push({ title: "Validation Error", description: "Account name and account ID are required" })
    }

    try {
      const client = apiClient()
      const res = await client.post(`/projects/${projectId}/compliance/accounts`, {
        name: accountName,
        account_id: accountIdVal,
        provider: "AWS",
        connection_method: connectionMethod,
        role_arn: connectionMethod === "cross_account_role" ? roleArn : "",
        external_id: connectionMethod === "cross_account_role" ? externalId : "",
        regions: regions
      })

      if (res.data && res.data.success) {
        push({ title: "Account Connected", description: `${accountName} registered successfully.` })
        setIsModalOpen(false)
        resetForm()
        loadAccounts()
      }
    } catch (e) {
      console.error("Failed to register account", e)
      push({ title: "Connection Failed" })
    }
  }

  const handleDeleteAccount = async (accId: string) => {
    if (!confirm("Are you sure you want to disconnect this account? All synchronized findings will be removed.")) return
    try {
      const client = apiClient()
      const res = await client.delete(`/projects/${projectId}/compliance/accounts/${accId}`)
      if (res.data && res.data.success) {
        push({ title: "Account Disconnected" })
        if (selectedAccountId === accId) {
          setSelectedAccountId("")
        }
        loadAccounts()
      }
    } catch (e) {
      console.error("Failed to delete account", e)
      push({ title: "Failed to disconnect account" })
    }
  }

  const handleSyncFindings = async (accId: string) => {
    setSyncingAccountId(accId)
    try {
      const client = apiClient()
      const res = await client.post(`/projects/${projectId}/compliance/accounts/${accId}/sync`)
      if (res.data && res.data.success) {
        push({ title: "Sync Completed", description: `Fetched findings successfully.` })
        if (selectedAccountId === accId) {
          setFindings(res.data.data || [])
        } else {
          setSelectedAccountId(accId)
        }
      }
    } catch (e) {
      console.error("Sync failed", e)
      push({ title: "Sync Failed", description: "Could not fetch findings from AWS. Falling back to mock details." })
    } finally {
      setSyncingAccountId("")
    }
  }

  const handleSingleConvertToTask = async (findingId: string) => {
    try {
      const client = apiClient()
      const res = await client.post(`/projects/${projectId}/compliance/findings/create-tasks`, {
        finding_ids: [findingId]
      })
      if (res.data && res.data.success) {
        push({ title: "Task Created", description: `Linked security finding to planning checklist.` })
        loadFindings()
      }
    } catch (e) {
      console.error("Task creation failed", e)
      push({ title: "Failed to create task" })
    }
  }

  const handleBulkConvertToTasks = async () => {
    const selectedIds = Object.keys(selectedFindingIds).filter((id: string) => selectedFindingIds[id])
    if (selectedIds.length === 0) return

    setBulkConverting(true)
    try {
      const client = apiClient()
      const res = await client.post(`/projects/${projectId}/compliance/findings/create-tasks`, {
        finding_ids: selectedIds
      })
      if (res.data && res.data.success) {
        push({ title: "Tasks Created", description: `Converted ${res.data.data.length} findings to tasks.` })
        loadFindings()
      }
    } catch (e) {
      console.error("Bulk conversion failed", e)
      push({ title: "Failed to convert findings" })
    } finally {
      setBulkConverting(false)
    }
  }

  const toggleExpand = (findingId: string) => {
    setExpandedFindingIds(prev => ({
      ...prev,
      [findingId]: !prev[findingId]
    }))
  }

  const toggleSelect = (findingId: string) => {
    setSelectedFindingIds(prev => ({
      ...prev,
      [findingId]: !prev[findingId]
    }))
  }

  const handleSelectAll = (checked: boolean) => {
    const newSelected: Record<string, boolean> = {}
    if (checked) {
      findings.forEach(f => {
        if (!f.task_id) {
          newSelected[f.id] = true
        }
      })
    }
    setSelectedFindingIds(newSelected)
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopiedTextType(type)
    setTimeout(() => setCopiedTextType(""), 2000)
  }

  const resetForm = () => {
    setAccountName("")
    setAccountIdVal("")
    setConnectionMethod("local_role")
    setRoleArn("")
    setExternalId(
      typeof window !== "undefined" && window.crypto && window.crypto.randomUUID 
        ? window.crypto.randomUUID() 
        : Math.random().toString(36).substring(2, 15)
    )
    setRegions("us-east-1,us-west-2")
  }

  const mockExternalId = "coex-compliance-external-12345"

  // Setup policy strings
  const trustPolicyJson = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::${accountIdVal || "123456789012"}:role/CoeX-EC2-Instance-Profile"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "${externalId || mockExternalId}"
        }
      }
    }
  ]
}`

  const permissionPolicyJson = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "securityhub:GetFindings",
        "inspector2:ListFindings",
        "guardduty:ListFindings",
        "guardduty:GetFindings",
        "guardduty:ListDetectors"
      ],
      "Resource": "*"
    }
  ]
}`
  const stsAssumeRolePolicyJson = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": [
        "arn:aws:iam::*:role/CoeX-Compliance-Assumed-Role"
      ]
    }
  ]
}`


  // Count severities
  const criticalCount = findings.filter((f: any) => f.severity === "CRITICAL").length
  const highCount = findings.filter((f: any) => f.severity === "HIGH").length
  const mediumCount = findings.filter((f: any) => f.severity === "MEDIUM").length
  const lowCount = findings.filter((f: any) => f.severity === "LOW" || f.severity === "INFORMATIONAL").length

  const activeAccount = accounts.find((a: any) => a.id === selectedAccountId)
  const isSelectedAll = findings.length > 0 && findings.filter((f: any) => !f.task_id).every((f: any) => selectedFindingIds[f.id])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-accent" />
            Security Compliance
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Audit cloud architecture compliance and vulnerabilities across connected cloud endpoints.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setIsModalOpen(true)
          }}
          className="rounded border border-accent text-accent px-4 py-2 hover:bg-accent/10 transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Account
        </button>
      </div>

      {/* Connection & Accounts Selection list */}
      {loadingAccounts ? (
        <div className="text-center py-6 text-sm text-muted-foreground">Loading accounts…</div>
      ) : accounts.length === 0 ? (
        /* Empty State */
        <div className="rounded-lg border border-border bg-card p-12 text-center flex flex-col items-center justify-center">
          <Shield className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h4 className="text-lg font-semibold">No Cloud Accounts Connected</h4>
          <p className="text-sm text-muted-foreground max-w-md mt-2 mb-6">
            Connecting an AWS account allows CoeX to securely download vulnerabilities and security alerts directly from Security Hub, GuardDuty, and Amazon Inspector.
          </p>
          <button
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="rounded bg-accent text-accent-foreground px-4 py-2 hover:bg-accent/90 transition-colors font-medium"
          >
            Connect First Account
          </button>
        </div>
      ) : (
        /* Connected Accounts bar */
        <div className="flex flex-wrap gap-3 items-center border-b border-border pb-4">
          <span className="text-sm text-muted-foreground font-medium">Select Account:</span>
          {accounts.map((acc: any) => (
            <div 
              key={acc.id} 
              className={`flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border text-sm transition-colors cursor-pointer ${
                selectedAccountId === acc.id 
                  ? "bg-accent/15 border-accent text-foreground" 
                  : "bg-secondary/5 border-border text-muted-foreground hover:bg-secondary/10"
              }`}
              onClick={() => setSelectedAccountId(acc.id)}
            >
              <span>{acc.name} ({acc.account_id})</span>
              <button
                disabled={syncingAccountId === acc.id}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSyncFindings(acc.id)
                }}
                className="p-1 rounded hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
                title="Sync from AWS"
              >
                <RefreshCw className={`h-3 w-3 ${syncingAccountId === acc.id ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteAccount(acc.id)
                }}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Disconnect Account"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active Account Dashboard Panels */}
      {selectedAccountId && activeAccount && (
        <div className="space-y-6">
          {/* KPI Dashboard Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between">
              <span className="text-sm text-muted-foreground">Critical Findings</span>
              <span className="text-3xl font-extrabold text-destructive mt-2">{criticalCount}</span>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between">
              <span className="text-sm text-muted-foreground">High Alerts</span>
              <span className="text-3xl font-extrabold text-orange-500 mt-2">{highCount}</span>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between">
              <span className="text-sm text-muted-foreground">Medium Alerts</span>
              <span className="text-3xl font-extrabold text-yellow-500 mt-2">{mediumCount}</span>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between">
              <span className="text-sm text-muted-foreground">Low Alerts</span>
              <span className="text-3xl font-extrabold text-muted-foreground mt-2">{lowCount}</span>
            </div>
          </div>

          {/* Search, Filter & Bulk Row */}
          <div className="flex flex-col gap-4 bg-secondary/5 p-4 rounded-lg border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <input
                type="text"
                placeholder="Search findings title/content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded border border-border bg-background px-3 py-1.5 text-sm w-full md:col-span-2"
              />
              
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="rounded border border-border bg-background px-3 py-1.5 text-sm"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="rounded border border-border bg-background px-3 py-1.5 text-sm"
              >
                <option value="">All Sources</option>
                <option value="SecurityHub">Security Hub</option>
                <option value="Inspector">Inspector</option>
                <option value="GuardDuty">GuardDuty</option>
              </select>

              <select
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                className="rounded border border-border bg-background px-3 py-1.5 text-sm"
              >
                <option value="">All Regions</option>
                {activeAccount.regions.split(",").map((r: string) => r.trim()).map((r: string) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Bulk Action Controls */}
            {findings.length > 0 && (
              <div className="flex items-center justify-between border-t border-border/60 pt-3 mt-1 text-sm">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="selectAllFindings"
                    checked={isSelectedAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <label htmlFor="selectAllFindings" className="text-muted-foreground cursor-pointer">
                    Select All Active Findings
                  </label>
                </div>
                <button
                  disabled={bulkConverting || Object.keys(selectedFindingIds).filter((id: string) => selectedFindingIds[id]).length === 0}
                  onClick={handleBulkConvertToTasks}
                  className="rounded bg-accent text-accent-foreground px-4 py-1.5 text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {bulkConverting ? "Converting..." : "Convert Selected to Tasks"}
                </button>
              </div>
            )}
          </div>

          {/* Findings List */}
          {loadingFindings ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Loading findings list…</div>
          ) : findings.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg text-sm text-muted-foreground">
              No findings matching the selected filters.
            </div>
          ) : (
            <div className="space-y-3">
              {findings.map((finding: any) => {
                const isExpanded = !!expandedFindingIds[finding.id]
                const isSelected = !!selectedFindingIds[finding.id]
                
                // Style mapping based on severity
                let severityColor = "text-muted-foreground border-border bg-secondary/5"
                if (finding.severity === "CRITICAL") severityColor = "text-red-500 border-red-500 bg-red-500/10"
                else if (finding.severity === "HIGH") severityColor = "text-orange-500 border-orange-500 bg-orange-500/10"
                else if (finding.severity === "MEDIUM") severityColor = "text-yellow-500 border-yellow-500 bg-yellow-500/10"

                return (
                  <div 
                    key={finding.id}
                    className={`rounded-lg border bg-card transition-colors ${
                      isExpanded ? "border-accent/40" : "border-border hover:border-border/80"
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center gap-4 p-4 text-sm">
                      {/* Checkbox (hidden if already converted) */}
                      {!finding.task_id ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(finding.id)}
                          className="h-4 w-4 rounded border-border"
                        />
                      ) : (
                        <div className="w-4 h-4 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      )}

                      {/* Severity badge */}
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${severityColor}`}>
                        {finding.severity}
                      </span>

                      {/* Title & Resource details */}
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => toggleExpand(finding.id)}
                      >
                        <div className="font-semibold text-foreground truncate">{finding.title}</div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-2 items-center mt-1">
                          <span className="font-mono bg-secondary/5 px-1.5 py-0.5 rounded text-[11px] border border-border">
                            {finding.resource_type}: {finding.resource_id}
                          </span>
                          <span>•</span>
                          <span className="bg-secondary/5 px-1.5 py-0.5 rounded text-[11px] border border-border">{finding.region}</span>
                          <span>•</span>
                          <span className="text-accent/80 font-medium">{finding.source}</span>
                        </div>
                      </div>

                      {/* Right actions */}
                      <div className="flex items-center gap-3">
                        {finding.task_id ? (
                          <span className="text-xs text-green-500 font-medium flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Created Task
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSingleConvertToTask(finding.id)}
                            className="rounded border border-border bg-background px-3 py-1 hover:bg-secondary/5 text-xs font-medium transition-colors"
                          >
                            Create Task
                          </button>
                        )}
                        <button
                          onClick={() => toggleExpand(finding.id)}
                          className="p-1 rounded hover:bg-secondary/5 text-muted-foreground"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Details */}
                    {isExpanded && (
                      <div className="border-t border-border/60 p-4 space-y-4 text-sm bg-secondary/2">
                        {/* Description */}
                        <div>
                          <h5 className="font-bold text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider mb-1">
                            <Info className="h-3.5 w-3.5" />
                            Description & Impact
                          </h5>
                          <p className="text-foreground leading-relaxed pl-5 bg-background/30 p-2.5 rounded border border-border/40">
                            {finding.description || "No description provided."}
                          </p>
                        </div>

                        {/* Remediation */}
                        <div>
                          <h5 className="font-bold text-green-500 flex items-center gap-1.5 text-xs uppercase tracking-wider mb-1">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Remediation & Fix Guide
                          </h5>
                          <p className="text-foreground leading-relaxed pl-5 bg-green-500/2 p-2.5 rounded border border-green-500/20">
                            {finding.remediation || "No remediation action described."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Setup / Add Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-lg shadow-xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h4 className="text-lg font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-accent" />
                Connect AWS Cloud Account
              </h4>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-secondary/5"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleCreateAccount} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Account Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Core Production"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">AWS Account ID</label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="12-digit account ID"
                    value={accountIdVal}
                    onChange={(e) => setAccountIdVal(e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">AWS Regions (comma-separated)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. us-east-1,us-west-2"
                  value={regions}
                  onChange={(e) => setRegions(e.target.value)}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">Account Type / Connection Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer select-none transition-colors ${
                    connectionMethod === "local_role" 
                      ? "border-accent bg-accent/5 text-foreground" 
                      : "border-border bg-background text-muted-foreground hover:bg-secondary/2"
                  }`}>
                    <input
                      type="radio"
                      name="connectionMethod"
                      value="local_role"
                      checked={connectionMethod === "local_role"}
                      onChange={() => setConnectionMethod("local_role")}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-semibold block text-sm flex items-center gap-1.5">
                        <Server className="h-4 w-4" />
                        Host AWS Account (This Server)
                      </span>
                      <span className="text-xs text-muted-foreground block mt-1 leading-normal">
                        Audit the same AWS account where CoeX is currently running. Connects automatically using the EC2 server's Instance Profile role.
                      </span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer select-none transition-colors ${
                    connectionMethod === "cross_account_role" 
                      ? "border-accent bg-accent/5 text-foreground" 
                      : "border-border bg-background text-muted-foreground hover:bg-secondary/2"
                  }`}>
                    <input
                      type="radio"
                      name="connectionMethod"
                      value="cross_account_role"
                      checked={connectionMethod === "cross_account_role"}
                      onChange={() => setConnectionMethod("cross_account_role")}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-semibold block text-sm flex items-center gap-1.5">
                        <Key className="h-4 w-4" />
                        Other AWS Account (Cross-Account)
                      </span>
                      <span className="text-xs text-muted-foreground block mt-1 leading-normal">
                        Audit a different AWS account (e.g., Production, Dev, or Client). Uses secure STS AssumeRole authentication with an External ID.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {connectionMethod === "cross_account_role" && (
                <div className="space-y-4 p-4 rounded-lg bg-secondary/5 border border-border">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Assumable IAM Role ARN</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. arn:aws:iam::123456789012:role/CoeX-Compliance-Assumed-Role"
                      value={roleArn}
                      onChange={(e) => setRoleArn(e.target.value)}
                      className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium block">STS External ID</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={externalId}
                        className="flex-1 rounded border border-border bg-background/50 px-3 py-2 text-sm font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(externalId, "external_id")}
                        className="rounded border border-border bg-background px-3 py-2 hover:bg-secondary/5 text-sm"
                      >
                        {copiedTextType === "external_id" ? "Copied!" : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <span className="text-[11px] text-muted-foreground block leading-normal">
                      Copy this ID to enter in the Trust Relationship condition block on the target account's IAM Role.
                    </span>
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
                    {connectionMethod === "local_role" 
                      ? "How to setup the host AWS Account (IAM Policy Guide)" 
                      : "How to setup target AWS Account (IAM Policy & Roles Guide)"}
                  </span>
                  {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showGuide && (
                  <div className="p-4 border-t border-border space-y-4 bg-background text-xs leading-relaxed max-h-[250px] overflow-y-auto">
                    {connectionMethod === "local_role" ? (
                      <div className="space-y-4">
                        <p>
                          To audit your host AWS account, make sure the IAM Role attached to this EC2 Instance Profile has the following policy attached to permit metadata-based audits:
                        </p>
                        <div>
                          <div className="flex items-center justify-between font-bold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
                            <span>1. Read-Only Policy permissions (Permissions Policy)</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(permissionPolicyJson, "permissions")}
                              className="flex items-center gap-1 hover:text-foreground text-[9px]"
                            >
                              <Copy className="h-3 w-3" />
                              {copiedTextType === "permissions" ? "Copied JSON!" : "Copy JSON"}
                            </button>
                          </div>
                          <pre className="p-3 bg-secondary/5 rounded border border-border overflow-x-auto text-[11px] font-mono whitespace-pre text-foreground">
                            {permissionPolicyJson}
                          </pre>
                        </div>

                        <p className="border-t border-border/40 pt-3">
                          <strong>Optional (Multi-Account Setup):</strong> If you plan to audit external AWS accounts in addition to this main host account, also attach this STS AssumeRole permission block to your EC2 host's role:
                        </p>
                        <div>
                          <div className="flex items-center justify-between font-bold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
                            <span>2. STS AssumeRole permissions (Multi-Account Support)</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(stsAssumeRolePolicyJson, "sts_assume")}
                              className="flex items-center gap-1 hover:text-foreground text-[9px]"
                            >
                              <Copy className="h-3 w-3" />
                              {copiedTextType === "sts_assume" ? "Copied JSON!" : "Copy JSON"}
                            </button>
                          </div>
                          <pre className="p-3 bg-secondary/5 rounded border border-border overflow-x-auto text-[11px] font-mono whitespace-pre text-foreground">
                            {stsAssumeRolePolicyJson}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p>
                          To audit findings in another AWS Account, the target account administrator must create an IAM Role (e.g., <strong>CoeX-Compliance-Assumed-Role</strong>) and configure the following blocks:
                        </p>

                        <div>
                          <div className="flex items-center justify-between font-bold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
                            <span>1. Trust Relationship Configuration (Trust Policy)</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(trustPolicyJson, "trust")}
                              className="flex items-center gap-1 hover:text-foreground text-[9px]"
                            >
                              <Copy className="h-3 w-3" />
                              {copiedTextType === "trust" ? "Copied JSON!" : "Copy JSON"}
                            </button>
                          </div>
                          <pre className="p-3 bg-secondary/5 rounded border border-border overflow-x-auto text-[11px] font-mono whitespace-pre text-foreground">
                            {trustPolicyJson}
                          </pre>
                        </div>

                        <div>
                          <div className="flex items-center justify-between font-bold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
                            <span>2. Read-Only Policy permissions (Permissions Policy)</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(permissionPolicyJson, "permissions")}
                              className="flex items-center gap-1 hover:text-foreground text-[9px]"
                            >
                              <Copy className="h-3 w-3" />
                              {copiedTextType === "permissions" ? "Copied JSON!" : "Copy JSON"}
                            </button>
                          </div>
                          <pre className="p-3 bg-secondary/5 rounded border border-border overflow-x-auto text-[11px] font-mono whitespace-pre text-foreground">
                            {permissionPolicyJson}
                          </pre>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
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
                  className="rounded bg-accent text-accent-foreground px-4 py-2 hover:bg-accent/90 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  Connect Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
