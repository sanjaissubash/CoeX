"use client"

import { useEffect } from "react"
import { useAppStore } from "@/store/app"

export function WorkspaceInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useAppStore.getState().initializeWorkspace()
  }, [])

  return <>{children}</>
}
