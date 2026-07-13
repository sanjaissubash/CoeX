"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Search } from "lucide-react"
import { apiClient } from "@/lib/api"

interface SearchResult {
  type: string
  id: string
  title: string
  subtitle?: string
  href: string
}

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      const q = query.trim()
      if (!q) {
        setResults([])
        return
      }

      setLoading(true)
      try {
        const res = await apiClient().get("/search", { params: { q } })
        if (res.data.success) setResults(res.data.data || [])
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => window.clearTimeout(handle)
  }, [query])

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Search</h1>
        <p className="text-muted-foreground">Find projects, notes, prompts, decisions, research, and sessions</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4"
          placeholder="Search CoeX"
          autoFocus
        />
      </div>

      <div className="rounded-lg border border-border bg-card">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Searching...</div>
        ) : query.trim() && results.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No results found</div>
        ) : !query.trim() ? (
          <div className="p-6 text-sm text-muted-foreground">Start typing to search your local project memory</div>
        ) : (
          <div className="divide-y divide-border">
            {results.map((result) => (
              <Link key={`${result.type}-${result.id}`} href={result.href} className="block p-4 hover:bg-secondary/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium">{result.title}</div>
                    {result.subtitle && (
                      <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{result.subtitle}</div>
                    )}
                  </div>
                  <span className="rounded border border-border px-2 py-1 text-xs uppercase text-muted-foreground">
                    {result.type}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
