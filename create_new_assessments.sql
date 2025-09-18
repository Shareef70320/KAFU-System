-- New Simplified Assessment Management Schema
-- This replaces the old assessment_templates system with a more direct approach

-- Drop old tables if they exist
DROP TABLE IF EXISTS assessment_template_competencies CASCADE;
DROP TABLE IF EXISTS assessment_templates CASCADE;

-- Create new assessments table
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  competency_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Assessment Settings
  shuffle_questions BOOLEAN DEFAULT TRUE,
  allow_multiple_attempts BOOLEAN DEFAULT TRUE,
  max_attempts INTEGER DEFAULT 3,
  show_timer BOOLEAN DEFAULT TRUE,
  time_limit_minutes INTEGER DEFAULT 30,
  force_time_limit BOOLEAN DEFAULT FALSE,
  show_dashboard BOOLEAN DEFAULT TRUE,
  show_correct_answers BOOLEAN DEFAULT TRUE,
  show_incorrect_answers BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (competency_id) REFERENCES competencies(id) ON DELETE CASCADE
);

-- Create assessment_questions table to link assessments with specific questions
CREATE TABLE IF NOT EXISTS assessment_questions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  assessment_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  UNIQUE(assessment_id, question_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessments_competency ON assessments(competency_id);
CREATE INDEX IF NOT EXISTS idx_assessments_active ON assessments(is_active);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_assessment ON assessment_questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_question ON assessment_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_order ON assessment_questions(assessment_id, order_index);

-- Insert sample assessment for testing
INSERT INTO assessments (
  id, name, description, competency_id, 
  shuffle_questions, allow_multiple_attempts, max_attempts,
  show_timer, time_limit_minutes, force_time_limit,
  show_dashboard, show_correct_answers, show_incorrect_answers
) VALUES (
  'sample-assessment-1',
  'Technical Skills Assessment',
  'Assessment for technical competency evaluation',
  (SELECT id FROM competencies LIMIT 1),
  TRUE, TRUE, 3, TRUE, 30, FALSE, TRUE, TRUE, TRUE
) ON CONFLICT (id) DO NOTHING;

