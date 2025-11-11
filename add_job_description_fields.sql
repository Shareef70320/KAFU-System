-- Add Job Description (JD) fields to jobs table
-- Dimensions
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS budgetary_control BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_interfaces TEXT; -- JSON array or comma-separated list
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS internal_interfaces TEXT;

-- Core JD fields
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_scope TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS accountabilities TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS qualifications_experience TEXT;

-- Special Conditions
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS restrictions TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS authority TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS demands TEXT;

-- Add comments
COMMENT ON COLUMN jobs.budgetary_control IS 'Budgetary Control (Yes/No)';
COMMENT ON COLUMN jobs.external_interfaces IS 'External Interfaces (list of items)';
COMMENT ON COLUMN jobs.internal_interfaces IS 'Internal Interfaces (text)';
COMMENT ON COLUMN jobs.job_scope IS 'Job Scope';
COMMENT ON COLUMN jobs.accountabilities IS 'Accountabilities';
COMMENT ON COLUMN jobs.qualifications_experience IS 'Qualifications and Experience';
COMMENT ON COLUMN jobs.restrictions IS 'Special Conditions - Restrictions';
COMMENT ON COLUMN jobs.authority IS 'Special Conditions - Authority';
COMMENT ON COLUMN jobs.demands IS 'Special Conditions - Demands';

