"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  FileText,
  Search,
  Activity,
  Settings,
  Menu,
  ChevronLeft
} from "lucide-react"
import { ThemeToggle } from "@/components/layout/theme-toggle"

export const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/projects",
    label: "Projects",
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
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Sync state with localStorage on load
  useEffect(() => {
    try {
      const stored = localStorage.getItem("coex_sidebar_collapsed")
      if (stored === "true") {
        setIsCollapsed(true)
      }
    } catch (err) {
      console.error("Local storage lookup failed:", err)
    }
  }, [])

  const toggleCollapse = () => {
    const nextVal = !isCollapsed
    setIsCollapsed(nextVal)
    try {
      localStorage.setItem("coex_sidebar_collapsed", String(nextVal))
    } catch (err) {
      console.error("Local storage save failed:", err)
    }
  }

  return (
    <aside 
      className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out flex-shrink-0 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header Row */}
      <div 
        className={`flex h-16 items-center border-b border-border px-4 justify-between transition-all ${
          isCollapsed ? "justify-center" : ""
        }`}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-sans tracking-wide text-foreground">CoeX</h1>
            <div className="scale-90">
              <ThemeToggle />
            </div>
          </div>
        )}
        
        <button
          onClick={toggleCollapse}
          className="p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? (
            <Menu className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav Links */}
      <nav className={`space-y-1.5 p-3 flex-1`}>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          if (isCollapsed) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-center rounded-lg h-10 w-10 mx-auto transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                title={item.label}
              >
                <Icon className="h-5 w-5" />
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
