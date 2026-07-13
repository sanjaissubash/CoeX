"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CreateProductWizard } from "@/components/products/create-wizard"

export default function CreateProductPage() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push("/products")
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Create Product</h1>
        <p className="text-muted-foreground">Set up a new product and get started</p>
      </div>
      <CreateProductWizard onSuccess={handleSuccess} />
    </div>
  )
}
