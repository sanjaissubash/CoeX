import axios from "axios"

export function getApiBase() {
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  if (envUrl) {
    return envUrl
  }
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("projectos_api_url")
    if (stored) return stored
  }
  return "/api"
}

export function apiClient() {
  return axios.create({
    baseURL: getApiBase(),
    headers: { "Content-Type": "application/json" },
  })
}
