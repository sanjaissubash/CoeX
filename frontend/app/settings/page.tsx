"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [apiUrl, setApiUrl] = useState<string>(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api")
  const [savedUrl, setSavedUrl] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("productos_api_url")
    if (stored) {
      setApiUrl(stored)
      setSavedUrl(stored)
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem("productos_api_url", apiUrl)
    setSavedUrl(apiUrl)
    // small hint to user: reload to pick up runtime env changes where necessary
    alert("Settings saved. You may need to reload the page for some changes to take effect.")
  }

  const handleReset = () => {
    localStorage.removeItem("productos_api_url")
    const def = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api"
    setApiUrl(def)
    setSavedUrl(null)
    alert("Settings reset to defaults. Reload if needed.")
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Customize your local development preferences</p>
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-2xl">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Theme</h2>
          <p className="text-sm text-muted-foreground mb-3">Choose the application theme</p>
          <div className="flex gap-2">
            {['system', 'light', 'dark'].map((t) => (
              <button key={t} onClick={() => setTheme(t)} className={`rounded px-3 py-2 border ${theme===t? 'border-accent bg-accent text-accent-foreground' : 'border-border hover:bg-secondary'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">API (local override)</h2>
          <p className="text-sm text-muted-foreground mb-3">Override the API base URL for this browser (useful for LAN testing)</p>
          <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="w-full rounded border border-border px-3 py-2 mb-3" />
          <div className="flex gap-2 justify-end">
            <button onClick={handleReset} className="rounded border px-3 py-2">Reset</button>
            <button onClick={handleSave} className="rounded bg-accent px-3 py-2 text-accent-foreground">Save</button>
          </div>
          {savedUrl && <div className="text-sm text-muted-foreground mt-3">Current override: <code className="bg-muted-inline px-2 py-1 rounded">{savedUrl}</code></div>}
        </div>
      </div>
    </div>
  )
}
