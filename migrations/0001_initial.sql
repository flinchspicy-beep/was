PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','project_manager','surveyor','approver')),
  display_name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  project_code TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  area_name TEXT,
  survey_date TEXT,
  status TEXT NOT NULL DEFAULT 'surveying' CHECK (status IN ('surveying','submitted','changes_requested','approved','closed','archived')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('project_manager','surveyor','approver','viewer')),
  assigned_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS survey_points (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  point_code TEXT,
  sequence_no INTEGER NOT NULL,
  point_type TEXT NOT NULL DEFAULT 'pole' CHECK (point_type IN ('pole','transformer','meter','other')),
  status TEXT NOT NULL DEFAULT 'existing' CHECK (status IN ('existing','new_installation','removal')),
  latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  gps_accuracy_m REAL,
  gps_captured_at TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL REFERENCES users(id),
  updated_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (project_id, sequence_no)
);

CREATE TABLE IF NOT EXISTS pole_details (
  point_id TEXT PRIMARY KEY REFERENCES survey_points(id) ON DELETE CASCADE,
  height_m REAL CHECK (height_m BETWEEN 8 AND 14.3),
  pole_head_type TEXT,
  low_voltage_rack_type TEXT CHECK (low_voltage_rack_type IN ('R2','R3','R4') OR low_voltage_rack_type IS NULL),
  low_voltage_rack_sets INTEGER NOT NULL DEFAULT 0 CHECK (low_voltage_rack_sets >= 0),
  burial_depth_m REAL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS equipment_catalog (
  id TEXT PRIMARY KEY,
  item_code TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  specification TEXT,
  unit TEXT NOT NULL,
  is_standard INTEGER NOT NULL DEFAULT 1 CHECK (is_standard IN (0,1)),
  review_status TEXT NOT NULL DEFAULT 'approved' CHECK (review_status IN ('pending','approved','rejected')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS point_equipment (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  point_id TEXT NOT NULL REFERENCES survey_points(id) ON DELETE CASCADE,
  equipment_id TEXT REFERENCES equipment_catalog(id),
  temporary_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('existing','removal','installation')),
  quantity REAL NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'approved' CHECK (review_status IN ('pending','approved','rejected')),
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL REFERENCES users(id),
  updated_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (equipment_id IS NOT NULL OR temporary_name IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS spans (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_point_id TEXT NOT NULL REFERENCES survey_points(id),
  to_point_id TEXT NOT NULL REFERENCES survey_points(id),
  voltage_class TEXT NOT NULL CHECK (voltage_class IN ('high_voltage','low_voltage')),
  work_action TEXT NOT NULL CHECK (work_action IN ('removal','installation','existing')),
  wire_type TEXT,
  wire_size TEXT,
  measured_length_m REAL CHECK (measured_length_m >= 0),
  coordinate_length_m REAL CHECK (coordinate_length_m >= 0),
  length_source TEXT NOT NULL DEFAULT 'coordinates' CHECK (length_source IN ('coordinates','field_measurement','manual')),
  phase_conductors INTEGER NOT NULL DEFAULT 0 CHECK (phase_conductors >= 0),
  neutral_conductors INTEGER NOT NULL DEFAULT 0 CHECK (neutral_conductors >= 0),
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL REFERENCES users(id),
  updated_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (from_point_id <> to_point_id)
);

CREATE TABLE IF NOT EXISTS transformers (
  point_id TEXT PRIMARY KEY REFERENCES survey_points(id) ON DELETE CASCADE,
  kva REAL CHECK (kva > 0),
  phase_count INTEGER CHECK (phase_count IN (1,3)),
  installation_method TEXT CHECK (installation_method IN ('pole_hung','rack','concrete_pad') OR installation_method IS NULL),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS meters (
  point_id TEXT PRIMARY KEY REFERENCES survey_points(id) ON DELETE CASCADE,
  meter_size TEXT,
  phase_count INTEGER CHECK (phase_count IN (1,3)),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS sync_operations (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  base_version INTEGER,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','succeeded','conflict','failed','cancelled')),
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  processed_at TEXT,
  UNIQUE (client_id, id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  actor_user_id TEXT REFERENCES users(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_value_json TEXT,
  new_value_json TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS boq_snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_json TEXT NOT NULL,
  source_project_version INTEGER NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reviewer_user_id TEXT NOT NULL REFERENCES users(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved','changes_requested')),
  comments TEXT,
  project_version INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS project_exports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('kml','csv_boq','pdf','google_sheet')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','succeeded','failed')),
  file_url TEXT,
  error_message TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_points_project_sequence ON survey_points(project_id, sequence_no);
CREATE INDEX IF NOT EXISTS idx_equipment_project_point ON point_equipment(project_id, point_id);
CREATE INDEX IF NOT EXISTS idx_spans_project ON spans(project_id);
CREATE INDEX IF NOT EXISTS idx_sync_project_status ON sync_operations(project_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_project_time ON audit_logs(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_approvals_project_time ON approvals(project_id, created_at);
