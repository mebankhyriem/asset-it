-- Consolidated MySQL schema (migrated from SQLite/better-sqlite3).
-- Applied once via: mysql -u it_asset_app -p it_asset_dev < lib/db/schema.sql
-- Not executed automatically by the app on boot.

CREATE TABLE IF NOT EXISTS departments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(191) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  employee_id           VARCHAR(191) NOT NULL UNIQUE,
  name                  VARCHAR(191) NOT NULL,
  email                 VARCHAR(191) NOT NULL UNIQUE,
  password_hash         VARCHAR(191) NOT NULL,
  role                  VARCHAR(50) NOT NULL CHECK (role IN ('INVENTORY_MANAGER','SIO','JIO','DEPT_USER')),
  department_id         INT,
  designation           VARCHAR(191),
  phone                 VARCHAR(50),
  is_active             TINYINT(1) NOT NULL DEFAULT 1,
  must_change_password  TINYINT(1) NOT NULL DEFAULT 0,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS assets (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  asset_id           VARCHAR(191) NOT NULL UNIQUE,
  asset_type         VARCHAR(191) NOT NULL,
  serial_number      VARCHAR(191) UNIQUE,
  mac_address        VARCHAR(191),
  specifications     TEXT,
  description        TEXT,
  status             VARCHAR(50) NOT NULL DEFAULT 'Available',
  department_id      INT,
  ict_category       VARCHAR(100),
  issued_date        DATE,
  end_of_life_date   DATE,
  eol_notified       VARCHAR(191) NOT NULL DEFAULT '',
  room_number        VARCHAR(191),
  disposal_method    VARCHAR(191),
  disposal_recycler  VARCHAR(191),
  disposal_reference VARCHAR(191),
  disposal_date      DATE,
  created_by         INT NOT NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_assets_department FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_assets_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_assets_status (status),
  INDEX idx_assets_type (asset_type),
  INDEX idx_assets_department (department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- EOL policies: allows Inventory Manager to set default lifespan (years)
CREATE TABLE IF NOT EXISTS eol_policies (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  asset_type     VARCHAR(191) NOT NULL UNIQUE,
  lifespan_years INT NOT NULL,
  created_by     INT NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_eol_policies_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Growing suggestion list for the OS / RAM / Processor specs prompt on Add Asset.
-- Seeded from the hardcoded presets in lib/types.ts; whenever an IM types a value via
-- "Other" that isn't already known, it's saved here so it becomes a normal pickable
-- option for everyone from then on — the list only ever grows, never needs editing.
CREATE TABLE IF NOT EXISTS spec_options (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  kind       VARCHAR(20) NOT NULL,   -- 'os' | 'ram' | 'processor'
  value      VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_spec_option (kind, value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS requests (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  request_number         VARCHAR(191) NOT NULL UNIQUE,
  requested_by           INT NOT NULL,
  department_id          INT,
  request_type           VARCHAR(50) NOT NULL DEFAULT 'New Asset',
  asset_type             VARCHAR(191) NOT NULL DEFAULT '',
  quantity               INT NOT NULL DEFAULT 1,
  justification          TEXT NOT NULL,
  status                 VARCHAR(50) NOT NULL DEFAULT 'Pending',
  -- For Return/Repair requests
  service_asset_id       INT,
  service_reason         TEXT,
  -- Worker/requester contact details (entered by the request head)
  requester_name         VARCHAR(191),
  requester_employee_id  VARCHAR(191),
  requester_email        VARCHAR(191),
  requester_designation  VARCHAR(191),
  requester_phone        VARCHAR(50),
  -- IM Initial Check fields
  tentative_asset_id     INT,
  im_notes               TEXT,
  -- Emergency request flag, captured when IM routes it via Download/Upload
  is_emergency            TINYINT(1) NOT NULL DEFAULT 0,
  verbal_approval          TINYINT(1),
  verbal_approval_reason   TEXT,
  -- Proof of approval attached after the fact for an emergency request (PDF/JPG)
  emergency_approval_document VARCHAR(191),
  -- Bypass approval: IM can skip JIO/SIO when signed off-system by the competent authority
  bypass_approved        TINYINT(1) NOT NULL DEFAULT 0,
  bypass_reference        VARCHAR(191),
  bypass_signed_file      VARCHAR(191),
  -- Optional photo evidence of a defect, attached to a Repair or Condemnation request
  defect_photo            VARCHAR(191),
  -- For Transfer requests
  target_dept_id         INT,
  target_room_number     VARCHAR(191),
  -- Final Issuance fields
  allocated_asset_id     INT,
  allocation_date        DATE,
  assigned_to_name       VARCHAR(191),
  condition_on_issue     VARCHAR(191),
  acknowledged           TINYINT(1) NOT NULL DEFAULT 0,
  -- External issuance fields (NGO / School)
  issue_to_type          VARCHAR(50) NOT NULL DEFAULT 'Internal',
  issue_to_org_name      VARCHAR(191),
  -- Condemnation fields
  condemnation_reason    TEXT,
  data_sanitized         TINYINT(1) NOT NULL DEFAULT 0,
  created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_requests_requested_by FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_requests_department FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_requests_service_asset FOREIGN KEY (service_asset_id) REFERENCES assets(id),
  CONSTRAINT fk_requests_tentative_asset FOREIGN KEY (tentative_asset_id) REFERENCES assets(id),
  CONSTRAINT fk_requests_allocated_asset FOREIGN KEY (allocated_asset_id) REFERENCES assets(id),
  CONSTRAINT fk_requests_target_dept FOREIGN KEY (target_dept_id) REFERENCES departments(id),
  INDEX idx_requests_status (status),
  INDEX idx_requests_by (requested_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS approvals (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  request_id  INT NOT NULL,
  step        VARCHAR(50) NOT NULL CHECK (step IN ('IM Initial Review','JIO Approval','SIO Approval','IM Final Processing','IM Service Processing')),
  status      VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected')),
  reviewer_id INT,
  comments    TEXT,
  reviewed_at TIMESTAMP NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_approvals_request FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_approvals_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id),
  INDEX idx_approvals_request (request_id),
  INDEX idx_approvals_step (step, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS request_items (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  request_id         INT NOT NULL,
  asset_type         VARCHAR(191) NOT NULL,
  quantity           INT NOT NULL DEFAULT 1,
  allocated_asset_id INT,
  CONSTRAINT fk_request_items_request FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_request_items_allocated_asset FOREIGN KEY (allocated_asset_id) REFERENCES assets(id),
  INDEX idx_request_items_request (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS asset_history (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  asset_id   INT NOT NULL,
  event      VARCHAR(191) NOT NULL,
  actor_name VARCHAR(191),
  actor_role VARCHAR(50),
  notes      TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_asset_history_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  INDEX idx_asset_history_asset (asset_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employees (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  employee_id   VARCHAR(191) NOT NULL UNIQUE,
  name          VARCHAR(191) NOT NULL,
  email         VARCHAR(191),
  phone         VARCHAR(50),
  designation   VARCHAR(191),
  department_id INT,
  created_by    INT,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_employees_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_employees_department (department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  token      VARCHAR(191) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used       TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Undocumented in the old SQLite migrations but present in the live DB and used by
-- app/actions/users.ts::deleteUser's cleanup DELETE. Kept for parity; nothing currently
-- writes OTP rows (the OTP-login feature this supported appears to have been abandoned).
CREATE TABLE IF NOT EXISTS email_otp (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(191) NOT NULL,
  otp        VARCHAR(20) NOT NULL,
  expires_at DATETIME NOT NULL,
  used       TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_otp_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS asset_transfers (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  asset_id         INT NOT NULL,
  from_dept_id     INT,
  to_dept_id       INT NOT NULL,
  from_room_number VARCHAR(191),
  to_room_number   VARCHAR(191),
  reason           TEXT,
  status           VARCHAR(50) NOT NULL DEFAULT 'Pending',
  initiated_by     INT NOT NULL,
  confirmed_by     INT,
  confirmed_at     TIMESTAMP NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_asset_transfers_asset FOREIGN KEY (asset_id) REFERENCES assets(id),
  CONSTRAINT fk_asset_transfers_from_dept FOREIGN KEY (from_dept_id) REFERENCES departments(id),
  CONSTRAINT fk_asset_transfers_to_dept FOREIGN KEY (to_dept_id) REFERENCES departments(id),
  CONSTRAINT fk_asset_transfers_initiated_by FOREIGN KEY (initiated_by) REFERENCES users(id),
  CONSTRAINT fk_asset_transfers_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES users(id),
  INDEX idx_transfers_asset (asset_id),
  INDEX idx_transfers_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Previously referenced by app/actions/assignments.ts and its API routes with no
-- backing table anywhere (SQLite would throw "no such table" if these code paths were
-- ever hit). Built now, columns derived from the existing INSERT/SELECT statements.
-- external_org_id is kept as a plain nullable column with no FK target: the
-- external-organizations module it pointed to was already removed in an earlier
-- redesign (see app/api/organizations/route.ts).
CREATE TABLE IF NOT EXISTS asset_assignments (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  asset_id             INT NOT NULL,
  assigned_to_name     VARCHAR(191) NOT NULL,
  assigned_to_type     VARCHAR(50) NOT NULL,
  department_id        INT,
  external_org_id      INT,
  expected_return_date DATE,
  condition_on_issue   VARCHAR(191),
  notes                TEXT,
  issued_by            INT NOT NULL,
  status               VARCHAR(50) NOT NULL DEFAULT 'Active',
  actual_return_date   DATE,
  condition_on_return  VARCHAR(191),
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_asset_assignments_asset FOREIGN KEY (asset_id) REFERENCES assets(id),
  CONSTRAINT fk_asset_assignments_department FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_asset_assignments_issued_by FOREIGN KEY (issued_by) REFERENCES users(id),
  INDEX idx_asset_assignments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Previously referenced by app/actions/maintenance.ts and its API routes with no
-- backing table anywhere. Built now, columns derived from the existing INSERT/SELECT
-- statements.
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  asset_id           INT NOT NULL,
  maintenance_type   VARCHAR(100) NOT NULL,
  description        TEXT NOT NULL,
  vendor_name        VARCHAR(191),
  vendor_contact     VARCHAR(191),
  estimated_cost     DECIMAL(12,2),
  actual_cost        DECIMAL(12,2),
  started_at         DATE,
  next_service_date  DATE,
  completed_at       TIMESTAMP NULL,
  status             VARCHAR(50) NOT NULL DEFAULT 'In Progress',
  notes              TEXT,
  logged_by          INT NOT NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_maintenance_logs_asset FOREIGN KEY (asset_id) REFERENCES assets(id),
  CONSTRAINT fk_maintenance_logs_logged_by FOREIGN KEY (logged_by) REFERENCES users(id),
  INDEX idx_maintenance_logs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
