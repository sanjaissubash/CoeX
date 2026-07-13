"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ShieldAlert, ShieldCheck } from "lucide-react"
import { CUSTOM_KEYWORDS_STORAGE_KEY, normalizeLeakKeywords } from "@/lib/leak-keywords"

type Severity = "high" | "medium"

type Finding = {
  id: string
  label: string
  severity: Severity
  line: number
  start: number
  end: number
  match: string
  recommendation: string
}

type LeakRule = {
  label: string
  severity: Severity
  pattern: RegExp
  recommendation: string
}

const RULES: LeakRule[] = [
  {
    label: "Private key block",
    severity: "high",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    recommendation: "Remove the private key and replace it with a placeholder like [PRIVATE_KEY_REMOVED].",
  },
  {
    label: "OpenAI-style API key",
    severity: "high",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
    recommendation: "Remove the API key and rotate it if this context was shared anywhere.",
  },
  {
    label: "AWS access key",
    severity: "high",
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
    recommendation: "Remove the AWS key and rotate it if it is real.",
  },
  {
    label: "Google API key",
    severity: "high",
    pattern: /\bAIza[0-9A-Za-z_-]{20,}\b/g,
    recommendation: "Remove the Google API key and rotate it if it is real.",
  },
  {
    label: "Bearer token",
    severity: "high",
    pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}\b/gi,
    recommendation: "Remove the bearer token and replace it with [TOKEN_REMOVED].",
  },
  {
    label: "JWT token",
    severity: "high",
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    recommendation: "Remove the JWT and replace it with [JWT_REMOVED].",
  },
  {
    label: "Secret assignment",
    severity: "high",
    pattern: /\b(?:password|passwd|secret|client_secret|api[_-]?key|access[_-]?token|auth[_-]?token|refresh[_-]?token)\b\s*[:=]\s*["']?[^"'\s]{6,}/gi,
    recommendation: "Remove the credential value and keep only the field name or a placeholder.",
  },
  {
    label: "Credential in URL",
    severity: "high",
    pattern: /\bhttps?:\/\/[^:\s/@]+:[^@\s/]+@[^/\s]+/gi,
    recommendation: "Remove the username/password from the URL before sharing.",
  },
  {
    label: "Email address",
    severity: "medium",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    recommendation: "Replace personal or private emails with a generic placeholder if not needed.",
  },
]

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function mask(value: string) {
  if (value.length <= 12) return value
  return `${value.slice(0, 8)}...${value.slice(-4)}`
}

function scanText(text: string, customKeywords: string[] = []) {
  const findings: Finding[] = []
  const lines = text.split("\n")

  lines.forEach((line, lineIndex) => {
    RULES.forEach((rule) => {
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags)
      let match: RegExpExecArray | null
      while ((match = pattern.exec(line)) !== null) {
        findings.push({
          id: `${lineIndex}-${rule.label}-${match.index}-${findings.length}`,
          label: rule.label,
          severity: rule.severity,
          line: lineIndex + 1,
          start: match.index,
          end: match.index + match[0].length,
          match: match[0],
          recommendation: rule.recommendation,
        })
        if (match[0].length === 0) pattern.lastIndex += 1
      }
    })

    customKeywords.forEach((keyword) => {
      const value = keyword.trim()
      if (!value) return

      const pattern = new RegExp(escapeRegExp(value), "gi")
      let match: RegExpExecArray | null
      while ((match = pattern.exec(line)) !== null) {
        findings.push({
          id: `${lineIndex}-custom-${value}-${match.index}-${findings.length}`,
          label: "Custom keyword",
          severity: "medium",
          line: lineIndex + 1,
          start: match.index,
          end: match.index + match[0].length,
          match: match[0],
          recommendation: `Review or replace "${value}" before sharing this context.`,
        })
        if (match[0].length === 0) pattern.lastIndex += 1
      }
    })
  })

  return findings.sort((a, b) => a.line - b.line || a.start - b.start)
}

function FindingPreview({ text, findings }: { text: string; findings: Finding[] }) {
  const lines = text.split("\n")

  return (
    <pre className="max-h-56 max-w-full overflow-auto whitespace-pre-wrap break-words rounded border border-border bg-background p-3 font-mono text-xs leading-relaxed">
      {lines.map((line, index) => {
        const lineFindings = findings
          .filter((finding) => finding.line === index + 1)
          .sort((a, b) => a.start - b.start)
        let cursor = 0
        const parts = []

        lineFindings.forEach((finding) => {
          if (finding.start < cursor) return
          if (finding.start > cursor) parts.push(line.slice(cursor, finding.start))
          parts.push(
            <span key={finding.id} className={finding.severity === "high" ? "rounded bg-red-200 px-0.5 text-red-950" : "rounded bg-amber-200 px-0.5 text-amber-950"}>
              {line.slice(finding.start, finding.end)}
            </span>
          )
          cursor = finding.end
        })

        parts.push(line.slice(cursor))
        return (
          <span key={index}>
            <span className="select-none text-muted-foreground">{String(index + 1).padStart(2, " ")} | </span>
            {parts}
            {index < lines.length - 1 ? "\n" : ""}
          </span>
        )
      })}
    </pre>
  )
}

export function ContextLeakChecker({ text }: { text: string }) {
  const [findings, setFindings] = useState<Finding[] | null>(null)
  const [customKeywords, setCustomKeywords] = useState<string[]>([])
  const safe = findings !== null && findings.length === 0
  const hasFindings = Boolean(findings?.length)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CUSTOM_KEYWORDS_STORAGE_KEY)
      if (stored) setCustomKeywords(normalizeLeakKeywords(JSON.parse(stored)))
    } catch {
      setCustomKeywords([])
    }
  }, [])

  useEffect(() => {
    setFindings(null)
  }, [text])

  const counts = useMemo(() => {
    return {
      high: findings?.filter((finding) => finding.severity === "high").length || 0,
      medium: findings?.filter((finding) => finding.severity === "medium").length || 0,
    }
  }, [findings])

  return (
    <>
      <button
        type="button"
        onClick={() => setFindings(scanText(text, customKeywords))}
        className="inline-flex items-center gap-2 rounded border border-border px-3 py-2 hover:bg-secondary"
      >
        {hasFindings ? <ShieldAlert className="h-4 w-4 text-destructive" /> : <ShieldCheck className="h-4 w-4" />}
        {hasFindings ? `Leaks found (${findings?.length})` : safe ? "Safe to share" : "Verify leaks"}
      </button>

      {findings !== null && (
        <div className="min-w-0 basis-full rounded border border-border bg-secondary/30 p-3 text-left">
          {safe ? (
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span>No common secrets, authentication tokens, or private contact details were found.</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                <span>Review before sharing: {findings.length} finding{findings.length === 1 ? "" : "s"}</span>
                {counts.high > 0 && <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-900">{counts.high} high</span>}
                {counts.medium > 0 && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">{counts.medium} medium</span>}
              </div>

              <div className="space-y-2">
                {findings.map((finding) => (
                  <div key={finding.id} className="rounded border border-border bg-background p-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={finding.severity === "high" ? "rounded bg-red-100 px-2 py-0.5 font-medium text-red-900" : "rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-900"}>
                        {finding.severity}
                      </span>
                      <span className="font-medium">{finding.label}</span>
                      <span className="text-muted-foreground">line {finding.line}</span>
                      <span className="font-mono text-muted-foreground">{mask(finding.match)}</span>
                    </div>
                    <div className="mt-1 text-muted-foreground">{finding.recommendation}</div>
                  </div>
                ))}
              </div>

              <FindingPreview text={text} findings={findings} />
              <div className="text-xs text-muted-foreground">
                Edit the highlighted content in the context box above, then run Verify leaks again.
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-border pt-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Global leak keywords</div>
                <div className="text-xs text-muted-foreground">
                  {customKeywords.length} keyword{customKeywords.length === 1 ? "" : "s"} checked from your global leak keyword list.
                </div>
              </div>
              <Link href="/leak-keywords" className="rounded border border-border px-3 py-2 text-sm hover:bg-secondary">
                Manage Keywords
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
