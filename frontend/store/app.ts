import { create } from "zustand"
import { Workspace, Family, Project } from "@/types"
import { apiClient } from "@/lib/api"

interface AppStore {
  currentWorkspace: Workspace | null
  setCurrentWorkspace: (workspace: Workspace) => void
  families: Family[]
  setFamilies: (families: Family[]) => void
  projects: Project[]
  setProjects: (projects: Project[]) => void
  selectedProject: Project | null
  setSelectedProject: (project: Project | null) => void
  initializeWorkspace: () => Promise<void>
}

export const useAppStore = create<AppStore>((set) => ({
  currentWorkspace: null,
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  families: [],
  setFamilies: (families) => set({ families }),
  projects: [],
  setProjects: (projects) => set({ projects }),
  selectedProject: null,
  setSelectedProject: (project) => set({ selectedProject: project }),
  
  initializeWorkspace: async () => {
    try {
      const client = apiClient()

      // Set a simple default workspace object in the store for legacy codepaths
      set({ currentWorkspace: { id: "default", name: "Default Workspace", created_at: new Date().toISOString(), updated_at: new Date().toISOString() } })

      // Fetch families and projects (unscoped)
      const [familiesRes, projectsRes] = await Promise.all([
        client.get(`/families`),
        client.get(`/projects`),
      ])

      try {
        if (familiesRes.data && familiesRes.data.success) set({ families: familiesRes.data.data })
      } catch (e) { /* ignore parse errors */ }

      try {
        if (projectsRes.data && projectsRes.data.success) set({ projects: projectsRes.data.data })
      } catch (e) { /* ignore parse errors */ }
    } catch (error) {
      console.error("Failed to initialize workspace:", error)
    }
  },
}))
