import { create } from "zustand"
import { Workspace, Family, Product } from "@/types"
import { apiClient } from "@/lib/api"

interface AppStore {
  currentWorkspace: Workspace | null
  setCurrentWorkspace: (workspace: Workspace) => void
  families: Family[]
  setFamilies: (families: Family[]) => void
  products: Product[]
  setProducts: (products: Product[]) => void
  selectedProduct: Product | null
  setSelectedProduct: (product: Product | null) => void
  initializeWorkspace: () => Promise<void>
}

export const useAppStore = create<AppStore>((set) => ({
  currentWorkspace: null,
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  families: [],
  setFamilies: (families) => set({ families }),
  products: [],
  setProducts: (products) => set({ products }),
  selectedProduct: null,
  setSelectedProduct: (product) => set({ selectedProduct: product }),
  
  initializeWorkspace: async () => {
    try {
      const client = apiClient()

      // Set a simple default workspace object in the store for legacy codepaths
      set({ currentWorkspace: { id: "default", name: "Default Workspace", created_at: new Date().toISOString(), updated_at: new Date().toISOString() } })

      // Fetch families and products (unscoped)
      const [familiesRes, productsRes] = await Promise.all([
        client.get(`/families`),
        client.get(`/products`),
      ])

      try {
        if (familiesRes.data && familiesRes.data.success) set({ families: familiesRes.data.data })
      } catch (e) { /* ignore parse errors */ }

      try {
        if (productsRes.data && productsRes.data.success) set({ products: productsRes.data.data })
      } catch (e) { /* ignore parse errors */ }
    } catch (error) {
      console.error("Failed to initialize workspace:", error)
    }
  },
}))
