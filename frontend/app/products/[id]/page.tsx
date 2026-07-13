"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { apiClient } from "@/lib/api"
import { useToast } from "@/components/ui/Toaster"
import { Edit2, Archive, Share2 } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { EditProductModal } from "@/components/products/EditProductModal"
import { ContextLeakChecker } from "@/components/products/context-leak-checker"
import { Product } from "@/types"
import { ProductDetailTabs } from "@/components/products/detail-tabs-new"


export default function ProductDetailPage() {
  const params = useParams()
  const productId = params.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [ctxOpen, setCtxOpen] = useState(false)
  const [ctxLoading, setCtxLoading] = useState(false)
  const [ctxText, setCtxText] = useState<string | null>(null)
  const [ctxCopied, setCtxCopied] = useState(false)
  const router = useRouter()
  const { push } = useToast()
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    fetchProduct()
  }, [productId])

  const fetchProduct = async () => {
    try {
      const client = apiClient()
      const response = await client.get(`/products/${productId}`)
      if (response.data.success) {
        setProduct(response.data.data)
      }
    } catch (error) {
      console.error("Failed to fetch product:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyGeneratedContext = async () => {
    const text = ctxText || ""
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    setCtxCopied(true)
    push({ title: "Copied", description: "Product context copied to clipboard" })
    window.setTimeout(() => setCtxCopied(false), 1800)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Product not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-muted-foreground">{product.description}</p>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">Stage: {product.lifecycle}</span>
            <span className="text-muted-foreground">Status: {product.status}</span>
            {product.status === 'ARCHIVED' && (
              <span className="ml-2 inline-block rounded-full bg-destructive/20 text-destructive px-2 py-0.5 text-xs">Archived</span>
            )}
            <span className="text-muted-foreground">
              Health: {Number.isFinite(Number(product.health_score)) ? Number(product.health_score).toFixed(0) + '%' : '—'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 hover:bg-secondary"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </button>
          <button onClick={async () => {
            setCtxOpen(true)
              if (!ctxText) {
                setCtxLoading(true)
                try {
                  const client = apiClient()
                  const res = await client.get(`/products/${productId}/context`)
                  if (res.data && res.data.success) setCtxText(res.data.data.compact_text)
                  else setCtxText('Failed to generate context')
                } catch (e) {
                  setCtxText('Failed to generate context')
                } finally {
                  setCtxLoading(false)
                }
              }
          }} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 hover:bg-secondary">
            <Share2 className="h-4 w-4" />
            Generate Context
          </button>
          <button
            onClick={async () => {
              if (!confirm('Are you sure you want to archive this product?')) return
              setArchiveLoading(true)
              try {
                const client = apiClient()
                const resp = await client.patch(`/products/${productId}`, { status: 'ARCHIVED' })
                if (resp.data.success) {
                  // show undo toast with restore action
                  push({
                    title: 'Product archived',
                    description: `${product.name} archived`,
                    action: { label: 'Restore', onClick: async () => {
                      try {
                        const r = await client.patch(`/products/${productId}`, { status: 'ACTIVE' })
                        if (r.data.success) {
                          router.push(`/products/${productId}`)
                        }
                      } catch (e) {
                        console.error('Failed to restore product', e)
                      }
                    } }
                  })
                  // navigate back to products list
                  router.push('/products')
                }
              } catch (err) {
                console.error('Failed to archive product:', err)
                push({ title: 'Archive failed', description: 'Could not archive product' })
              } finally {
                setArchiveLoading(false)
              }
            }}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 hover:bg-secondary"
            disabled={archiveLoading}
          >
            <Archive className="h-4 w-4" />
            {archiveLoading ? 'Archiving...' : 'Archive'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <ProductDetailTabs productId={productId} />

      <EditProductModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        product={product}
        onSaved={(p) => setProduct(p)}
      />

      <Modal open={ctxOpen} onClose={() => setCtxOpen(false)} title="Generated Context">
        <div className="space-y-3">
          {ctxLoading ? (
            <div className="text-sm text-muted-foreground">Generating context...</div>
          ) : (
            <>
              <textarea
                aria-label="Editable generated product context"
                value={ctxText || ''}
                onChange={(event) => setCtxText(event.target.value)}
                className="min-h-[45vh] max-h-[55vh] w-full resize-y overflow-auto rounded border bg-background p-3 font-mono text-sm"
                placeholder="No context available"
              />
              <div className="flex flex-wrap gap-2 justify-end">
                <ContextLeakChecker text={ctxText || ""} />
                <button onClick={copyGeneratedContext} className="rounded bg-accent px-3 py-2 text-accent-foreground">{ctxCopied ? 'Copied' : 'Copy'}</button>
                <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(ctxText || '')}`} download={`${product?.name || 'product'}-context.txt`} className="rounded border px-3 py-2">Export</a>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
