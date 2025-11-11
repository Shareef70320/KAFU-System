-- Add competency_elements table
CREATE TABLE IF NOT EXISTS competency_elements (
  id TEXT PRIMARY KEY,
  competency_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT competency_elements_competency_id_fkey 
    FOREIGN KEY (competency_id) 
    REFERENCES competencies(id) 
    ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_competency_elements_competency_id ON competency_elements(competency_id);
CREATE INDEX IF NOT EXISTS idx_competency_elements_order ON competency_elements(competency_id, "order");

-- Add comment
COMMENT ON TABLE competency_elements IS 'Elements/attributes that belong to each competency for evaluation purposes';

