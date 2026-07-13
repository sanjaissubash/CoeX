"use client"

import React from "react"

type Toast = {
  id: string
  title?: string
  description?: string
  action?: { label: string; onClick: () => void }
}

const ToastContext = React.createContext<{
  push: (t: Omit<Toast, 'id'>) => string
  remove: (id: string) => void
} | null>(null)

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  function push(t: Omit<Toast, 'id'>) {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 8)
    setToasts((s) => [...s, { id, ...t }])
    // auto-remove after 6s
    setTimeout(() => setToasts((s) => s.filter(x => x.id !== id)), 6000)
    return id
  }

  function remove(id: string) {
    setToasts((s) => s.filter(x => x.id !== id))
  }

  return (
    <ToastContext.Provider value={{ push, remove }}>
      {children}
      <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div key={t.id} className="rounded-lg border border-border bg-card p-3 shadow">
            {t.title && <div className="font-medium">{t.title}</div>}
            {t.description && <div className="text-sm text-muted-foreground">{t.description}</div>}
            {t.action && (
              <div className="mt-2 flex justify-end">
                <button onClick={() => { t.action?.onClick(); remove(t.id) }} className="rounded px-3 py-1 border border-border text-sm">{t.action.label}</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToasterProvider')
  return ctx
}

export default ToasterProvider
