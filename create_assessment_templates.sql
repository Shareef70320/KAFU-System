-- Assessment Templates schema
CREATE TABLE IF NOT EXISTS assessment_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  -- Settings
  num_questions INTEGER NOT NULL DEFAULT 10,
  time_limit_minutes INTEGER NOT NULL DEFAULT 30,
  max_attempts INTEGER DEFAULT 1,
  selection_strategy TEXT NOT NULL DEFAULT 'RANDOM', -- RANDOM | BY_LEVEL | WEIGHTED
  difficulty_filter TEXT, -- OPTIONAL: BASIC, INTERMEDIATE, ADVANCED, MASTERY (comma-separated)
  question_types TEXT, -- OPTIONAL: MULTIPLE_CHOICE,TRUE_FALSE,SHORT_ANSWER,ESSAY (comma-separated)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Link templates to competencies
CREATE TABLE IF NOT EXISTS assessment_template_competencies (
  template_id TEXT NOT NULL,
  competency_id TEXT NOT NULL,
  PRIMARY KEY (template_id, competency_id),
  FOREIGN KEY (template_id) REFERENCES assessment_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (competency_id) REFERENCES competencies(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assessment_templates_active ON assessment_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_template_competencies_template ON assessment_template_competencies(template_id);
CREATE INDEX IF NOT EXISTS idx_template_competencies_competency ON assessment_template_competencies(competency_id);



