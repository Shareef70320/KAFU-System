-- Create assessment sessions table
CREATE TABLE IF NOT EXISTS assessment_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    competency_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS', -- IN_PROGRESS, COMPLETED, ABANDONED
    score INTEGER DEFAULT 0,
    percentage_score INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (competency_id) REFERENCES competencies(id) ON DELETE CASCADE
);

-- Create assessment responses table
CREATE TABLE IF NOT EXISTS assessment_responses (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    selected_option_id TEXT,
    answer_text TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (selected_option_id) REFERENCES question_options(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user_id ON assessment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_competency_id ON assessment_sessions(competency_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_status ON assessment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_session_id ON assessment_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_question_id ON assessment_responses(question_id);

-- Add comments
COMMENT ON TABLE assessment_sessions IS 'Stores user assessment sessions and results';
COMMENT ON TABLE assessment_responses IS 'Stores individual question responses within assessment sessions';
COMMENT ON COLUMN assessment_sessions.status IS 'Assessment status: IN_PROGRESS, COMPLETED, ABANDONED';
COMMENT ON COLUMN assessment_sessions.score IS 'Total points earned in the assessment';
COMMENT ON COLUMN assessment_sessions.percentage_score IS 'Percentage score (0-100)';
COMMENT ON COLUMN assessment_responses.is_correct IS 'Whether the answer was correct';
COMMENT ON COLUMN assessment_responses.points_earned IS 'Points earned for this specific answer';

