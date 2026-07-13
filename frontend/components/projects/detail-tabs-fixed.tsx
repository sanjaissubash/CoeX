"use client"

import React, { useState } from "react"

interface DetailTabsProps {
  projectId: string
}

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "planning", label: "Planning" },
  { id: "knowledge", label: "Knowledge" },
]

function OverviewPane({ projectId }: { projectId: string }) {
  return (
    <div className="p-6">
      <h3 className="text-lg font-bold">Overview</h3>
      <p className="text-sm text-muted-foreground mt-2">Overview content will load here.</p>
      <p className="text-sm mt-4">Project ID: {projectId}</p>
    </div>
  )
}

export function ProjectDetailTabs({ projectId }: DetailTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("overview")

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id ? "border-accent text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card">
        {activeTab === "overview" && <OverviewPane projectId={projectId} />}

        {activeTab === "planning" && (
          <div className="p-6">
            <h3 className="text-lg font-bold">Planning</h3>
            <div className="text-sm text-muted-foreground">Planning tools will appear here.</div>
          </div>
        )}

        {activeTab === "knowledge" && (
          <div className="p-6">
            <h3 className="text-lg font-bold">Knowledge</h3>
            <div className="text-sm text-muted-foreground">Knowledge resources will appear here.</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectDetailTabs
