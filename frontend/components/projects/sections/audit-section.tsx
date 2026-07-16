"use client"

import React, { useEffect, useState } from "react"
import { apiClient } from "@/lib/api"
import { useToast } from "@/components/ui/Toaster"
import { 
  Shield, 
  ShieldAlert, 
  RefreshCw, 
  FileText, 
  Check, 
  CheckCircle, 
  AlertTriangle, 
  Calendar, 
  Layers, 
  Database, 
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Inbox,
  Copy
} from "lucide-react"

interface AuditSectionProps {
  projectId: string
}

export function AuditSection({ projectId }: AuditSectionProps) {
  const [accounts, setAccounts] = useState<Array<any>>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [reports, setReports] = useState<Array<any>>([])
  const [selectedReport, setSelectedReport] = useState<any>(null)
  
  // Running filters and active states
  const [cadence, setCadence] = useState<"monthly" | "quarterly">("monthly")
  const [activeTab, setActiveTab] = useState<"security" | "resource" | "backup">("security")
  const [items, setItems] = useState<Array<any>>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [copiedTextType, setCopiedTextType] = useState<string | null>(null)
  
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopiedTextType(type)
    setTimeout(() => setCopiedTextType(null), 2500)
  }

  const { push } = useToast()

  useEffect(() => {
    loadAccounts()
  }, [projectId])

  useEffect(() => {
    if (selectedAccountId) {
      loadReports()
    } else {
      setReports([])
      setSelectedReport(null)
      setItems([])
    }
  }, [selectedAccountId])

  useEffect(() => {
    if (selectedReport) {
      loadItems(selectedReport.id)
    } else {
      setItems([])
    }
  }, [selectedReport])

  const loadAccounts = async () => {
    setLoading(true)
    try {
      const client = apiClient()
      const res = await client.get(`/projects/${projectId}/compliance/accounts`)
      if (res.data && res.data.success) {
        setAccounts(res.data.data)
        if (res.data.data.length > 0) {
          setSelectedAccountId(res.data.data[0].id)
        }
      }
    } catch (err: any) {
      console.error(err)
      push({
        title: "Error",
        description: "Failed to load cloud accounts."
      })
    } finally {
      setLoading(false)
    }
  }

  const loadReports = async () => {
    try {
      const client = apiClient()
      const res = await client.get(`/projects/${projectId}/audits/reports`)
      if (res.data && res.data.success) {
        const filtered = res.data.data.filter((r: any) => r.compliance_account_id === selectedAccountId)
        setReports(filtered)
        if (filtered.length > 0) {
          setSelectedReport(filtered[0])
        } else {
          setSelectedReport(null)
        }
      }
    } catch (err: any) {
      console.error(err)
    }
  }

  const loadItems = async (reportId: string) => {
    try {
      const client = apiClient()
      const res = await client.get(`/projects/${projectId}/audits/reports/${reportId}/items`)
      if (res.data && res.data.success) {
        setItems(res.data.data)
      }
    } catch (err: any) {
      console.error(err)
    }
  }

  const handleRunAudit = async () => {
    if (!selectedAccountId) return
    setRunning(true)
    try {
      const client = apiClient()
      const res = await client.post(`/projects/${projectId}/audits/run`, {
        account_id: selectedAccountId,
        cadence: cadence
      })
      if (res.data && res.data.success) {
        push({
          title: "Audit Completed",
          description: `Successfully executed ${cadence} security audit.`
        })
        // Reload history
        await loadReports()
      }
    } catch (err: any) {
      console.error(err)
      push({
        title: "Audit Failed",
        description: err.response?.data?.error || "Error executing AWS compliance scanning."
      })
    } finally {
      setRunning(false)
    }
  }

  const handleCreateRemediationTask = async (item: any) => {
    try {
      const client = apiClient()
      const res = await client.post(`/projects/${projectId}/audits/items/${item.id}/create-task`)
      if (res.data && res.data.success) {
        push({
          title: "Task Created",
          description: "Remediation plan logged to project board."
        })
        // Update local items state
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, task_id: res.data.data.id } : i))
      }
    } catch (err: any) {
      console.error(err)
      push({
        title: "Action Failed",
        description: "Failed to register remediation task."
      })
    }
  }

  const toggleExpandItem = (id: string) => {
    setExpandedItemId(prev => prev === id ? null : id)
  }

  // Filter items based on active sub-audit type tab
  const filteredItems = items.filter(item => item.audit_type === activeTab)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Settings Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-card border border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          {/* Account Picker */}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground font-medium block">AWS Account Connection</span>
            {accounts.length === 0 ? (
              <span className="text-xs text-muted-foreground italic block pt-2">No connected accounts yet. Add one in Compliance tab first.</span>
            ) : (
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="rounded border border-border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-accent"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.aws_account_id})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Cadence Selector */}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground font-medium block">Audit Type / Cadence</span>
            <div className="flex rounded border border-border overflow-hidden">
              <button
                onClick={() => setCadence("monthly")}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  cadence === "monthly" ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground hover:bg-secondary/5"
                }`}
              >
                Monthly Audit
              </button>
              <button
                onClick={() => setCadence("quarterly")}
                className={`px-3 py-1.5 text-xs font-semibold border-l border-border transition-colors ${
                  cadence === "quarterly" ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground hover:bg-secondary/5"
                }`}
              >
                Quarterly Audit
              </button>
            </div>
          </div>

          {/* History Selection */}
          {reports.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground font-medium block">Audit History / Report Run</span>
              <select
                value={selectedReport?.id || ""}
                onChange={(e) => setSelectedReport(reports.find(r => r.id === e.target.value))}
                className="rounded border border-border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-accent"
              >
                {reports.map(rep => (
                  <option key={rep.id} value={rep.id}>
                    {new Date(rep.audit_date).toLocaleString()} ({rep.audit_cadence})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Trigger scan action */}
        {accounts.length > 0 && (
          <button
            onClick={handleRunAudit}
            disabled={running}
            className="flex items-center gap-2 rounded bg-accent text-accent-foreground px-4 py-2 hover:bg-accent/90 transition-colors text-sm font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
            {running ? "Scanning AWS..." : "Run Security & Backup Audit"}
          </button>
        )}
      </div>

      {/* AWS IAM Setup Guides */}
      {accounts.length > 0 && (
        <div className="border border-border/80 rounded-lg overflow-hidden bg-card">
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="w-full flex items-center justify-between p-3.5 bg-secondary/5 hover:bg-secondary/10 text-sm font-semibold transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              AWS IAM Permissions Setup Guide (For Audit Features)
            </span>
            {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showGuide && (
            <div className="p-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-6 bg-background text-xs leading-relaxed max-h-[350px] overflow-y-auto">
              {/* Left Column: Host setup */}
              <div className="space-y-4">
                <h5 className="font-bold text-sm text-foreground border-b border-border/60 pb-1.5 flex items-center gap-2">
                  <span>Host AWS Account Setup</span>
                </h5>
                <p className="text-muted-foreground">
                  Attach these policy blocks to the IAM Role assigned directly to your host CoeX EC2 Instance Profile:
                </p>
                
                <div>
                  <div className="flex items-center justify-between font-bold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
                    <span>1. Audit Permissions Policy</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeVolumes",
        "ec2:DescribeSecurityGroups",
        "ec2:GetEbsEncryptionByDefault",
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation",
        "s3:GetBucketPolicyStatus",
        "s3:GetBucketPublicAccessBlock",
        "rds:DescribeDBInstances",
        "lambda:ListFunctions",
        "ecs:ListClusters",
        "ecs:DescribeClusters",
        "backup:ListBackupPlans",
        "backup:ListProtectedResources"
      ],
      "Resource": "*"
    }
  ]
}`, "host_permissions")}
                      className="flex items-center gap-1 hover:text-foreground text-[9px]"
                    >
                      <Copy className="h-3 w-3" />
                      {copiedTextType === "host_permissions" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="p-3 bg-secondary/5 rounded border border-border overflow-x-auto text-[11px] font-mono whitespace-pre text-foreground max-h-[150px]">
{`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeVolumes",
        "ec2:DescribeSecurityGroups",
        "ec2:GetEbsEncryptionByDefault",
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation",
        "s3:GetBucketPolicyStatus",
        "s3:GetBucketPublicAccessBlock",
        "rds:DescribeDBInstances",
        "lambda:ListFunctions",
        "ecs:ListClusters",
        "ecs:DescribeClusters",
        "backup:ListBackupPlans",
        "backup:ListProtectedResources"
      ],
      "Resource": "*"
    }
  ]
}`}
                  </pre>
                </div>

                <div>
                  <div className="flex items-center justify-between font-bold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
                    <span>2. STS AssumeRole Policy (Optional for Multi-Account)</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::*:role/CoeX-Compliance-Assumed-Role"
    }
  ]
}`, "host_sts")}
                      className="flex items-center gap-1 hover:text-foreground text-[9px]"
                    >
                      <Copy className="h-3 w-3" />
                      {copiedTextType === "host_sts" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="p-3 bg-secondary/5 rounded border border-border overflow-x-auto text-[11px] font-mono whitespace-pre text-foreground max-h-[120px]">
{`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::*:role/CoeX-Compliance-Assumed-Role"
    }
  ]
}`}
                  </pre>
                </div>
              </div>

              {/* Right Column: Target Setup */}
              <div className="space-y-4">
                <h5 className="font-bold text-sm text-foreground border-b border-border/60 pb-1.5 flex items-center gap-2">
                  <span>Target AWS Account Setup</span>
                </h5>
                <p className="text-muted-foreground">
                  If auditing external target accounts, create the assumed IAM role in the target account with:
                </p>

                <div>
                  <div className="flex items-center justify-between font-bold text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">
                    <span>1. Trust Relationship Configuration (Trust Policy)</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<HOST_ACCOUNT_ID>:role/CoeX-EC2-Instance-Profile"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "<COEX_EXTERNAL_ID>"
        }
      }
    }
  ]
}`, "target_trust")}
                      className="flex items-center gap-1 hover:text-foreground text-[9px]"
                    >
                      <Copy className="h-3 w-3" />
                      {copiedTextType === "target_trust" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="p-3 bg-secondary/5 rounded border border-border overflow-x-auto text-[11px] font-mono whitespace-pre text-foreground max-h-[150px]">
{`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<HOST_ACCOUNT_ID>:role/CoeX-EC2-Instance-Profile"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "<COEX_EXTERNAL_ID>"
        }
      }
    }
  ]
}`}
                  </pre>
                </div>

                <p className="text-muted-foreground text-[11px] pt-1">
                  * Additionally, attach the **Audit Permissions Policy** (shown on the left column) as the permissions policy for this target role.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-border rounded-lg p-12 text-center bg-card">
          <ShieldAlert className="h-10 w-10 text-muted-foreground/60 mb-4 animate-pulse" />
          <h4 className="font-bold text-lg mb-1 text-foreground">No Connected AWS Cloud Accounts Found</h4>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Auditing requires a secure link to your host infrastructure or targets. Please visit the **Compliance** tab first to add an account connection.
          </p>
        </div>
      ) : !selectedReport ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-border rounded-lg p-12 text-center bg-card">
          <FileText className="h-10 w-10 text-muted-foreground/60 mb-4 animate-pulse" />
          <h4 className="font-bold text-lg mb-1 text-foreground">No Audits Run Yet</h4>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-4">
            No active audit reports were found for this account connection. Run a new audit snapshot above to trigger Security Hub, Inspector, S3 checks, and backup vaults scanning.
          </p>
          <button
            onClick={handleRunAudit}
            disabled={running}
            className="flex items-center gap-2 rounded bg-accent text-accent-foreground px-4 py-2 hover:bg-accent/90 transition-colors text-sm font-semibold"
          >
            <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
            {running ? "Scanning AWS..." : "Trigger First Scan"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-card border border-border shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Security Audit Score</span>
                <span className="text-2xl font-bold mt-1 block">{selectedReport.security_score}%</span>
              </div>
              <Shield className={`h-8 w-8 ${selectedReport.security_score === 100 ? "text-green-500" : "text-amber-500"}`} />
            </div>

            <div className="p-4 rounded-lg bg-card border border-border shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Total Resources Audited</span>
                <span className="text-2xl font-bold mt-1 block">{selectedReport.total_resources}</span>
              </div>
              <Layers className="h-8 w-8 text-blue-500" />
            </div>

            <div className="p-4 rounded-lg bg-card border border-border shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Backup Plan Coverage</span>
                <span className="text-2xl font-bold mt-1 block">{selectedReport.backup_coverage_pct}%</span>
              </div>
              <Database className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          {/* Sub Audit Nav tabs */}
          <div className="border-b border-border flex gap-4">
            <button
              onClick={() => setActiveTab("security")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "security" ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              1. Security Audit
            </button>
            <button
              onClick={() => setActiveTab("resource")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "resource" ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              2. Resource Inventory Audit
            </button>
            <button
              onClick={() => setActiveTab("backup")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "backup" ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              3. Backup Coverage Audit
            </button>
          </div>

          {/* Tab Checklist Panel content */}
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-card border border-border rounded-lg">
              <Inbox className="h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm text-muted-foreground font-medium">No checks registered in this category.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map(item => {
                const isExpanded = expandedItemId === item.id
                const isNonCompliant = item.status === "non-compliant"
                const hasTask = !!item.task_id

                return (
                  <div 
                    key={item.id}
                    className={`rounded-lg border bg-card transition-all ${
                      isNonCompliant 
                        ? "border-amber-500/20 hover:border-amber-500/35" 
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center gap-3 p-4">
                      {/* Check/Alert icon */}
                      {isNonCompliant ? (
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      )}

                      {/* Heading metadata details */}
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => toggleExpandItem(item.id)}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground truncate">{item.resource_id}</span>
                          {item.is_new_resource && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 border border-blue-500/30 text-blue-500 animate-pulse">
                              NEW RESOURCE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-2 items-center mt-1">
                          <span className="font-mono bg-secondary/5 px-1.5 py-0.5 rounded text-[11px] border border-border">
                            {item.resource_type}
                          </span>
                          <span>•</span>
                          <span className="bg-secondary/5 px-1.5 py-0.5 rounded text-[11px] border border-border">
                            {item.region}
                          </span>
                        </div>
                      </div>

                      {/* Right action button */}
                      <div className="flex items-center gap-3">
                        {isNonCompliant && (activeTab === "backup" || activeTab === "security") && (
                          hasTask ? (
                            <span className="text-xs text-green-500 font-semibold flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" />
                              Created {activeTab === "backup" ? "Backup" : "Security"} Task
                            </span>
                          ) : (
                            <button
                              onClick={() => handleCreateRemediationTask(item)}
                              className="rounded border border-border bg-background px-3 py-1 hover:bg-secondary/5 text-xs font-semibold transition-colors"
                            >
                              Create {activeTab === "backup" ? "Backup" : "Security"} Task
                            </button>
                          )
                        )}
                        <button
                          onClick={() => toggleExpandItem(item.id)}
                          className="p-1 rounded hover:bg-secondary/5 text-muted-foreground"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Panel details */}
                    {isExpanded && (
                      <div className="border-t border-border/60 p-4 space-y-3 bg-secondary/2 text-sm">
                        <div>
                          <h5 className="font-bold text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider mb-1">
                            <Info className="h-3.5 w-3.5" />
                            Audit Evaluation & Status Details
                          </h5>
                          <p className="text-foreground leading-relaxed pl-5 bg-background/30 p-2.5 rounded border border-border/40 font-mono text-xs">
                            {item.details || "No details provided for this audit item check."}
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
    </div>
  )
}
