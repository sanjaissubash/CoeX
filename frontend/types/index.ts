export interface Workspace {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Family {
  id: string
  name: string
  description?: string
  icon?: string
  sort_order: number
  project_count: number
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  family_id: string
  template_id?: string
  name: string
  description?: string
  lifecycle: string
  status: string
  health_score: number
  storage_path?: string
  created_at: string
  updated_at: string
  archived_at?: string
}

export interface APIResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
  details?: string
}
