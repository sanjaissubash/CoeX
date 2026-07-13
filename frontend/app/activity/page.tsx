"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api"

interface ActivityItem {
  id: string
  project_id: string
  action: string
  entity_type: string
  entity_id?: string
  details?: Record<string, unknown>
  timestamp: string
}

export default function ActivityPage() {
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient().get("/activity")
        if (res.data.success) setActivity(res.data.data || [])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Activity</h1>
        <p className="text-muted-foreground">Recent project changes</p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading activity...</div>
        ) : activity.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No activity yet</div>
        ) : (
          <div className="divide-y divide-border">
            {activity.map((item) => (
              <Link key={item.id} href={`/projects/${item.project_id}`} className="block p-4 hover:bg-secondary/50">
                {(() => {
                  const detailTitle = item.details?.title ? String(item.details.title) : ""
                  return (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">
                      {item.action} {item.entity_type}
                    </div>
                    {detailTitle && (
                      <div className="mt-1 text-sm text-muted-foreground">{detailTitle}</div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <span className="rounded border border-border px-2 py-1 text-xs uppercase text-muted-foreground">
                    {item.entity_type}
                  </span>
                </div>
                  )
                })()}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
