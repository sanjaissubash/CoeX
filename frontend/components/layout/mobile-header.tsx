"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { navItems } from "./sidebar"
import { ThemeToggle } from "./theme-toggle"

export function MobileHeader() {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between h-12 px-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="p-2 rounded-md hover:bg-secondary transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">CoeX</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle className="w-9" />
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <nav className="absolute left-0 top-0 h-full w-64 bg-card border-r border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Navigation</h2>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-2 rounded-md hover:bg-secondary transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-secondary">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </div>
  )
}
