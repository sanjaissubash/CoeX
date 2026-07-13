-- ============================================================================
-- WORKSPACE LAYER
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- FAMILY LAYER
-- ============================================================================

CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE INDEX IF NOT EXISTS idx_families_workspace_id ON families(workspace_id);

-- ============================================================================
-- PROJECT TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_milestones TEXT,
  default_tasks TEXT,
  default_context_blocks TEXT,
  default_folder_structure TEXT,
  default_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PROJECT LAYER
-- ============================================================================

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  family_id TEXT NOT NULL,
  template_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  lifecycle TEXT NOT NULL DEFAULT 'IDEA',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  health_score REAL DEFAULT 0.0,
  storage_path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMP,
  ai_metadata TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (family_id) REFERENCES families(id),
  FOREIGN KEY (template_id) REFERENCES project_templates(id)
);

CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_family_id ON projects(family_id);
CREATE INDEX IF NOT EXISTS idx_projects_lifecycle ON projects(lifecycle);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ============================================================================
-- PROJECT PROGRESS TRACKING (Multi-stage)
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_progress (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  idea_progress TEXT DEFAULT 'not_started',
  research_progress TEXT DEFAULT 'not_started',
  planning_progress TEXT DEFAULT 'not_started',
  creating_progress TEXT DEFAULT 'not_started',
  testing_progress TEXT DEFAULT 'not_started',
  ready_to_sell_progress TEXT DEFAULT 'not_started',
  published_progress TEXT DEFAULT 'not_started',
  optimizing_progress TEXT DEFAULT 'not_started',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- ============================================================================
-- PLANNING MODULE: MILESTONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  lifecycle_stage TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_lifecycle_stage ON milestones(lifecycle_stage);

-- ============================================================================
-- PLANNING MODULE: TASKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  milestone_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  due_date TIMESTAMP,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (milestone_id) REFERENCES milestones(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ============================================================================
-- KNOWLEDGE MODULE: DECISIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rationale TEXT,
  impact TEXT,
  alternatives TEXT,
  decision_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ai_metadata TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_decisions_project_id ON decisions(project_id);

-- ============================================================================
-- KNOWLEDGE MODULE: CONTEXT BLOCKS (High-Value Memory)
-- ============================================================================

CREATE TABLE IF NOT EXISTS context_blocks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  block_type TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ai_metadata TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_context_blocks_project_id ON context_blocks(project_id);
CREATE INDEX IF NOT EXISTS idx_context_blocks_priority ON context_blocks(priority);

-- ============================================================================
-- KNOWLEDGE MODULE: RESEARCH
-- ============================================================================

CREATE TABLE IF NOT EXISTS research (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  source TEXT,
  url TEXT,
  content TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ai_metadata TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_research_project_id ON research(project_id);

-- ============================================================================
-- WORK HISTORY: SESSIONS (ChatGPT, Claude, Gemini, Manual)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  ai_tool TEXT NOT NULL,
  goal TEXT NOT NULL,
  summary TEXT NOT NULL,
  outcome TEXT,
  next_steps TEXT,
  full_output TEXT,
  session_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ai_metadata TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_ai_tool ON sessions(ai_tool);

-- ============================================================================
-- REUSABLE PROMPTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  name TEXT NOT NULL,
  category TEXT,
  prompt_text TEXT NOT NULL,
  ai_tool TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_prompts_project_id ON prompts(project_id);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);

-- ============================================================================
-- ASSETS MODULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  asset_type TEXT,
  description TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON assets(asset_type);

-- ============================================================================
-- SELLING MODULE: MARKETING
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketing (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  target_audience TEXT,
  key_benefits TEXT,
  pricing_strategy TEXT,
  marketing_channels TEXT,
  seo_keywords TEXT,
  unique_selling_proposition TEXT,
  competitor_analysis TEXT,
  launch_strategy TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ai_metadata TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_marketing_project_id ON marketing(project_id);

-- ============================================================================
-- SELLING MODULE: VERSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  version_number TEXT NOT NULL,
  release_date TIMESTAMP,
  changes TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_versions_project_id ON versions(project_id);

-- ============================================================================
-- SELLING MODULE: LINKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  link_type TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_links_project_id ON links(project_id);

-- ============================================================================
-- NOTES SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  note_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  pinned BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id);
CREATE INDEX IF NOT EXISTS idx_notes_note_type ON notes(note_type);

-- ============================================================================
-- ACTIVITY TRACKING & HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);

-- ============================================================================
-- SEARCH INDEX (Full-Text Search Support)
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_index (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  title TEXT,
  content TEXT,
  searchable_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_search_index_project_id ON search_index(project_id);
CREATE INDEX IF NOT EXISTS idx_search_index_entity_type ON search_index(entity_type);

-- ============================================================================
-- HEALTH SCORE CALCULATION DATA
-- ============================================================================

CREATE TABLE IF NOT EXISTS health_score_components (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  milestones_score REAL DEFAULT 0.0,
  tasks_score REAL DEFAULT 0.0,
  context_completeness_score REAL DEFAULT 0.0,
  asset_completeness_score REAL DEFAULT 0.0,
  marketing_completeness_score REAL DEFAULT 0.0,
  documentation_completeness_score REAL DEFAULT 0.0,
  overall_score REAL DEFAULT 0.0,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- ============================================================================
-- INSERT DEFAULT WORKSPACE
-- ============================================================================

INSERT OR IGNORE INTO workspaces (id, name) VALUES ('default', 'Default Workspace');

-- ============================================================================
-- INSERT DEFAULT PROJECT TEMPLATES
-- ============================================================================

INSERT OR IGNORE INTO project_templates (id, name, description) VALUES
  ('google-sheet', 'Google Sheet Project', 'Template for spreadsheet-based projects'),
  ('resume', 'Resume Project', 'Template for resume/CV projects'),
  ('journal', 'Journal Project', 'Template for journal-based projects'),
  ('planner', 'Planner Project', 'Template for planning/organization projects');
