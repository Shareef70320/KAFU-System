-- Assessor competencies mapping
CREATE TABLE IF NOT EXISTS assessor_competencies (
  id TEXT PRIMARY KEY,
  assessor_sid TEXT NOT NULL,
  competency_id TEXT NOT NULL,
  competency_level TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assessor_competencies_assessor ON assessor_competencies(assessor_sid);
CREATE INDEX IF NOT EXISTS idx_assessor_competencies_comp ON assessor_competencies(competency_id);
