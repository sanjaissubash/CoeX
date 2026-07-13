"use client"

import React from "react"

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded bg-card p-4 shadow-lg">
        <div className="mb-2 flex flex-shrink-0 items-center justify-between gap-3">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-sm text-muted-foreground">Close</button>
        </div>
        <div className="min-h-0 overflow-y-auto overflow-x-hidden pr-1">{children}</div>
      </div>
    </div>
  )
}
