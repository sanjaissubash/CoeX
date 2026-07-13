import axios from "axios"

export function getApiBase() {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("productos_api_url")
    if (stored) return stored
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001/api"
}

export function apiClient() {
  return axios.create({
    baseURL: getApiBase(),
    headers: { "Content-Type": "application/json" },
  })
}
