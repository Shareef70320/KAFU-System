-- Create review_request_history table to track status changes / workflow steps
CREATE TABLE IF NOT EXISTS review_request_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  review_request_id TEXT NOT NULL REFERENCES review_requests(id) ON DELETE CASCADE,
  status review_status,
  actor_sid TEXT,
  actor_role TEXT, -- e.g. EMPLOYEE, ASSESSOR, SYSTEM
  notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_review_history_request ON review_request_history(review_request_id);
CREATE INDEX IF NOT EXISTS idx_review_history_status ON review_request_history(status);

