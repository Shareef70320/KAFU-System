-- Create Performance Review System Tables
-- Following troubleshooting guide pattern: use raw SQL instead of Prisma

-- 1. Create ReviewStatus enum
CREATE TYPE review_status AS ENUM ('REQUESTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- 2. Create ReviewType enum
CREATE TYPE review_type AS ENUM ('COMPETENCY_REVIEW', 'PERFORMANCE_REVIEW', 'SKILL_ASSESSMENT');

-- 3. Create AssessorCompetencies table (many-to-many relationship)
CREATE TABLE assessor_competencies (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    assessor_id TEXT NOT NULL REFERENCES employees(sid) ON DELETE CASCADE,
    competency_id TEXT NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    max_level TEXT NOT NULL CHECK (max_level IN ('BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure unique assessor-competency combinations
    UNIQUE(assessor_id, competency_id)
);

-- 4. Create ReviewRequests table
CREATE TABLE review_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id TEXT NOT NULL REFERENCES employees(sid) ON DELETE CASCADE,
    competency_id TEXT NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    requested_level TEXT NOT NULL CHECK (requested_level IN ('BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY')),
    assessor_id TEXT REFERENCES employees(sid) ON DELETE SET NULL,
    status review_status DEFAULT 'REQUESTED',
    review_type review_type DEFAULT 'COMPETENCY_REVIEW',
    requested_date TIMESTAMP DEFAULT NOW(),
    scheduled_date TIMESTAMP,
    completed_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Create PerformanceReviews table
CREATE TABLE performance_reviews (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    review_request_id TEXT NOT NULL REFERENCES review_requests(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES employees(sid) ON DELETE CASCADE,
    competency_id TEXT NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    assessor_id TEXT NOT NULL REFERENCES employees(sid) ON DELETE CASCADE,
    
    -- Review Details
    current_level TEXT CHECK (current_level IN ('BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY')),
    manager_selected_level TEXT CHECK (manager_selected_level IN ('BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY')),
    assessor_assigned_level TEXT CHECK (assessor_assigned_level IN ('BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY')),
    
    -- Assessment Results
    assessment_score INTEGER,
    assessment_percentage DECIMAL(5,2),
    last_assessment_date TIMESTAMP,
    
    -- Review Content
    assessor_comments TEXT,
    strengths TEXT,
    gaps TEXT,
    recommendations TEXT,
    development_plan TEXT,
    
    -- Review Metadata
    review_date TIMESTAMP DEFAULT NOW(),
    next_review_date TIMESTAMP,
    is_finalized BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Create ReviewGaps table (for detailed gap tracking)
CREATE TABLE review_gaps (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    review_id TEXT NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
    gap_description TEXT NOT NULL,
    gap_category TEXT, -- e.g., 'KNOWLEDGE', 'SKILL', 'BEHAVIOR'
    priority TEXT CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    is_addressed BOOLEAN DEFAULT false,
    addressed_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. Create ReviewRecommendations table
CREATE TABLE review_recommendations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    review_id TEXT NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
    recommendation TEXT NOT NULL,
    recommendation_type TEXT, -- e.g., 'TRAINING', 'MENTORING', 'PROJECT', 'COURSE'
    priority TEXT CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    target_completion_date TIMESTAMP,
    is_completed BOOLEAN DEFAULT false,
    completed_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. Create indexes for better performance
CREATE INDEX idx_assessor_competencies_assessor ON assessor_competencies(assessor_id);
CREATE INDEX idx_assessor_competencies_competency ON assessor_competencies(competency_id);
CREATE INDEX idx_review_requests_employee ON review_requests(employee_id);
CREATE INDEX idx_review_requests_assessor ON review_requests(assessor_id);
CREATE INDEX idx_review_requests_status ON review_requests(status);
CREATE INDEX idx_performance_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX idx_performance_reviews_assessor ON performance_reviews(assessor_id);
CREATE INDEX idx_performance_reviews_competency ON performance_reviews(competency_id);

-- 9. Add comments for documentation
COMMENT ON TABLE assessor_competencies IS 'Maps assessors to competencies they can evaluate with their maximum evaluation level';
COMMENT ON TABLE review_requests IS 'Tracks competency review requests from employees to assessors';
COMMENT ON TABLE performance_reviews IS 'Stores completed performance reviews with detailed feedback';
COMMENT ON TABLE review_gaps IS 'Tracks specific gaps identified during reviews';
COMMENT ON TABLE review_recommendations IS 'Stores recommendations made during reviews';

-- 10. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_assessor_competencies_updated_at BEFORE UPDATE ON assessor_competencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_review_requests_updated_at BEFORE UPDATE ON review_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_performance_reviews_updated_at BEFORE UPDATE ON performance_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_review_gaps_updated_at BEFORE UPDATE ON review_gaps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_review_recommendations_updated_at BEFORE UPDATE ON review_recommendations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
