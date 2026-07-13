import { AxiosError } from "axios"
import { useState, useCallback } from "react"
import { APIResponse } from "@/types"
import { apiClient as runtimeClient } from "@/lib/api"

export function useApi<T>(
  url: string,
  initialData?: T
) {
  const [data, setData] = useState<T | undefined>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
  const client = runtimeClient()
  const response = await client.get<APIResponse<T>>(url)
      if (response.data.success && response.data.data) {
        setData(response.data.data)
      }
    } catch (err) {
      const axiosError = err as AxiosError
      setError(axiosError.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [url])

  return { data, loading, error, fetch }
}
