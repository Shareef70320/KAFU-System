-- Create Assessment System Tables
-- Following troubleshooting guide pattern: use raw SQL instead of Prisma

-- 1. Create QuestionType enum
CREATE TYPE question_type AS ENUM ('MULTIPLE_CHOICE', 'SINGLE_CHOICE', 'TRUE_FALSE', 'TEXT_INPUT', 'RATING_SCALE');

-- 2. Create AssessmentAttemptStatus enum
CREATE TYPE assessment_attempt_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'TIME_EXCEEDED');

-- 3. Create Questions table
CREATE TABLE questions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    text TEXT NOT NULL,
    type question_type NOT NULL,
    competency_id TEXT NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    competency_level_id TEXT REFERENCES competency_levels(id) ON DELETE SET NULL,
    points INTEGER DEFAULT 1,
    explanation TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create Question Options table
CREATE TABLE question_options (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Create Assessments table
CREATE TABLE assessments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    description TEXT,
    competency_id TEXT NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    competency_level_id TEXT REFERENCES competency_levels(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    time_limit INTEGER, -- Time limit in minutes (optional)
    passing_score FLOAT DEFAULT 70.0, -- Passing percentage
    max_attempts INTEGER, -- Maximum attempts allowed (null = unlimited)
    created_by TEXT, -- Employee SID who created
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Create Assessment Questions junction table
CREATE TABLE assessment_questions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    "order" INTEGER DEFAULT 0, -- Question order in assessment
    points INTEGER DEFAULT 1, -- Points for this question in this assessment
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(assessment_id, question_id)
);

-- 7. Create Employee Assessments table
CREATE TABLE employee_assessments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    status assessment_attempt_status DEFAULT 'NOT_STARTED',
    score FLOAT, -- Final score percentage
    max_score FLOAT, -- Maximum possible score
    time_spent INTEGER, -- Time spent in seconds
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    evaluated_level TEXT, -- System evaluated level (BASIC, INTERMEDIATE, ADVANCED, MASTERY)
    manager_approved BOOLEAN DEFAULT false,
    assessor_approved BOOLEAN DEFAULT false,
    manager_notes TEXT,
    assessor_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, assessment_id)
);

-- 8. Create Employee Responses table
CREATE TABLE employee_responses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_assessment_id TEXT NOT NULL REFERENCES employee_assessments(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_option_id TEXT REFERENCES question_options(id) ON DELETE SET NULL,
    text_response TEXT, -- For text-based questions
    is_correct BOOLEAN, -- Whether the response is correct
    points_earned FLOAT DEFAULT 0, -- Points earned for this response
    time_spent INTEGER, -- Time spent on this question in seconds
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_assessment_id, question_id)
);

-- 9. Create indexes for better performance
CREATE INDEX idx_questions_competency_id ON questions(competency_id);
CREATE INDEX idx_questions_competency_level_id ON questions(competency_level_id);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_question_options_question_id ON question_options(question_id);
CREATE INDEX idx_assessments_competency_id ON assessments(competency_id);
CREATE INDEX idx_assessments_competency_level_id ON assessments(competency_level_id);
CREATE INDEX idx_assessment_questions_assessment_id ON assessment_questions(assessment_id);
CREATE INDEX idx_assessment_questions_question_id ON assessment_questions(question_id);
CREATE INDEX idx_employee_assessments_employee_id ON employee_assessments(employee_id);
CREATE INDEX idx_employee_assessments_assessment_id ON employee_assessments(assessment_id);
CREATE INDEX idx_employee_assessments_status ON employee_assessments(status);
CREATE INDEX idx_employee_responses_employee_assessment_id ON employee_responses(employee_assessment_id);
CREATE INDEX idx_employee_responses_question_id ON employee_responses(question_id);

-- 10. Add comments for documentation
COMMENT ON TABLE questions IS 'Question bank for assessments, linked to competencies and levels';
COMMENT ON TABLE question_options IS 'Multiple choice options for questions';
COMMENT ON TABLE assessments IS 'Assessment definitions linked to competencies';
COMMENT ON TABLE assessment_questions IS 'Junction table linking assessments to questions';
COMMENT ON TABLE employee_assessments IS 'Employee attempts at assessments with results';
COMMENT ON TABLE employee_responses IS 'Individual question responses from employees';

COMMENT ON COLUMN questions.competency_level_id IS 'Difficulty level linked to competency level (BASIC, INTERMEDIATE, ADVANCED, MASTERY)';
COMMENT ON COLUMN assessments.time_limit IS 'Time limit in minutes (optional)';
COMMENT ON COLUMN assessments.passing_score IS 'Passing percentage (0-100)';
COMMENT ON COLUMN assessments.max_attempts IS 'Maximum attempts allowed (null = unlimited)';
COMMENT ON COLUMN employee_assessments.evaluated_level IS 'System evaluated competency level based on score';
COMMENT ON COLUMN employee_assessments.manager_approved IS 'Manager approval of assessment result';
COMMENT ON COLUMN employee_assessments.assessor_approved IS 'Assessor approval of assessment result';
