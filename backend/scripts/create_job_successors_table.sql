-- Create job_successors table for succession planning
CREATE TABLE IF NOT EXISTS job_successors (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  readiness_level TEXT,
  notes TEXT,
  assigned_by TEXT,
  assigned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(job_id, employee_id),
  CONSTRAINT fk_job_successors_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_successors_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_successors_job_id ON job_successors(job_id);
CREATE INDEX IF NOT EXISTS idx_job_successors_employee_id ON job_successors(employee_id);
CREATE INDEX IF NOT EXISTS idx_job_successors_readiness_level ON job_successors(readiness_level);

