"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  FileText,
  Search,
  Activity,
  ShieldAlert,
  Settings,
} from "lucide-react"
import { ThemeToggle } from "@/components/layout/theme-toggle"

export const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/products",
    label: "Products",
    icon: Package,
  },
  {
    href: "/families",
    label: "Families",
    icon: FolderOpen,
  },
  {
    href: "/notes",
    label: "Notes",
    icon: FileText,
  },
  {
    href: "/search",
    label: "Search",
    icon: Search,
  },
  {
    href: "/activity",
    label: "Activity",
    icon: Activity,
  },
  {
    href: "/leak-keywords",
    label: "Leak Keywords",
    icon: ShieldAlert,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:block w-64 border-r border-border bg-card">
      <div className="flex h-16 items-center border-b border-border px-4 justify-between">
        <h1 className="text-xl font-bold">CoeX</h1>
        <div className="ml-2">
          <ThemeToggle />
        </div>
      </div>
      <nav className="space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      {/* Theme toggle moved to header */}
    </aside>
  )
}
