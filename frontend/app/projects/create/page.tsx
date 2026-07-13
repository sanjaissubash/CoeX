"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CreateProjectWizard } from "@/components/projects/create-wizard"

export default function CreateProjectPage() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push("/projects")
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Create Project</h1>
        <p className="text-muted-foreground">Set up a new project and get started</p>
      </div>
      <CreateProjectWizard onSuccess={handleSuccess} />
    </div>
  )
}
