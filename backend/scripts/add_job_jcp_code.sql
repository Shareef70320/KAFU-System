ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS jcp_code TEXT;

CREATE INDEX IF NOT EXISTS idx_jobs_jcp_code ON jobs(jcp_code);


