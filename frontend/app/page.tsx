"use client"

import { useEffect } from "react"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard/header"
import { useAppStore } from "@/store/app"

export default function DashboardPage() {
  const projects = useAppStore((s) => s.projects)
  const initializeWorkspace = useAppStore((s) => s.initializeWorkspace)

  useEffect(() => {
    // ensure workspace/projects are loaded (workspace initializer may have run already)
    if (!projects || projects.length === 0) {
      initializeWorkspace().catch(() => {})
    }
  }, [])

  return (
    <div className="space-y-8 p-8">
      <DashboardHeader />
      <div className="grid gap-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">Today's Focus</h2>

          {(!projects || projects.length === 0) ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
              No projects found. Create your first project to get started.
            </div>
          ) : (
            <div className="grid gap-4">
              {projects.slice(0, 6).map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="rounded-lg border border-border bg-card p-4 hover:bg-secondary/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm text-muted-foreground">{p.description || "—"}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">{p.lifecycle}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

        </section>
      </div>
    </div>
  )
}
