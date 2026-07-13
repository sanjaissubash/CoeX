"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { apiClient } from "@/lib/api"
import { Plus, ArrowRight } from "lucide-react"
import { Product, Family } from "@/types"
import { PRODUCT_LIFECYCLES } from "@/lib/product-options"


export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [families, setFamilies] = useState<Record<string, Family>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const client = apiClient()
      const [productsRes, familiesRes] = await Promise.all([
        client.get(`/products`),
        client.get(`/families`),
      ])

      if (productsRes.data.success) {
        setProducts(productsRes.data.data)
      }

      if (familiesRes.data.success) {
        const familiesMap = familiesRes.data.data.reduce(
          (acc: Record<string, Family>, f: Family) => {
            acc[f.id] = f
            return acc
          },
          {}
        )
        setFamilies(familiesMap)
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = filter === "all" 
    ? products 
    : products.filter(p => p.lifecycle === filter)

  const lifecycleStats = PRODUCT_LIFECYCLES.reduce((acc, stage) => {
    acc[stage] = products.filter(p => p.lifecycle === stage).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your product portfolio</p>
        </div>
        <Link
          href="/products/create"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-accent-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Product
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Object.entries(lifecycleStats).map(([stage, count]) => (
          <div key={stage} className="rounded-lg border border-border bg-card p-4">
            <div className="text-sm text-muted-foreground">{stage}</div>
            <div className="text-2xl font-bold">{count}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", ...PRODUCT_LIFECYCLES].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1 text-sm transition-colors ${
              filter === f
                ? "bg-accent text-accent-foreground"
                : "border border-border hover:bg-secondary"
            }`}
          >
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          Loading products...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <p className="text-muted-foreground mb-4">No products found</p>
          <Link
            href="/products/create"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-accent-foreground hover:opacity-90"
          >
            Create your first product
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Name</th>
                <th className="px-6 py-3 text-left font-medium">Family</th>
                <th className="px-6 py-3 text-left font-medium">Stage</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-left font-medium">Health</th>
                <th className="px-6 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-border hover:bg-secondary/50">
                  <td className="px-6 py-4 font-medium">{product.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {families[product.family_id]?.name || "—"}
                  </td>
                  <td className="px-6 py-4">{product.lifecycle}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded px-2 py-1 text-xs font-medium ${
                      product.status === "ACTIVE" 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                    }`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${Math.min(100, Math.max(0, Number(product.health_score) || 0))}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <Link
                        href={`/products/${product.id}`}
                        className="flex items-center gap-1 text-accent hover:underline"
                      >
                        View
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={async () => {
                          if (!confirm('Are you sure you want to delete this product?')) return
                          try {
                            const client = apiClient()
                            const resp = await client.delete(`/products/${product.id}`)
                            if (resp.data.success) {
                              setProducts((ps) => ps.filter(p => p.id !== product.id))
                            }
                          } catch (err) {
                            console.error('Failed to delete product:', err)
                          }
                        }}
                        className="rounded px-3 py-1 border border-border hover:bg-secondary text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
