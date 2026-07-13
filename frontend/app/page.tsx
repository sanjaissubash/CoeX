"use client"

import { useEffect } from "react"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard/header"
import { useAppStore } from "@/store/app"

export default function DashboardPage() {
  const products = useAppStore((s) => s.products)
  const initializeWorkspace = useAppStore((s) => s.initializeWorkspace)

  useEffect(() => {
    // ensure workspace/products are loaded (workspace initializer may have run already)
    if (!products || products.length === 0) {
      initializeWorkspace().catch(() => {})
    }
  }, [])

  return (
    <div className="space-y-8 p-8">
      <DashboardHeader />
      <div className="grid gap-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">Today's Focus</h2>

          {(!products || products.length === 0) ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
              No products found. Create your first product to get started.
            </div>
          ) : (
            <div className="grid gap-4">
              {products.slice(0, 6).map((p) => (
                <Link key={p.id} href={`/products/${p.id}`} className="rounded-lg border border-border bg-card p-4 hover:bg-secondary/50">
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
