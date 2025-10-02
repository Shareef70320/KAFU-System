-- Learning & Development Interventions Tables
-- This script creates the database structure for managing L&D interventions

-- Create intervention categories table
CREATE TABLE IF NOT EXISTS intervention_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for UI
    icon VARCHAR(50) DEFAULT 'BookOpen', -- Lucide icon name
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create intervention types table
CREATE TABLE IF NOT EXISTS intervention_types (
    id VARCHAR(50) PRIMARY KEY,
    category_id VARCHAR(50) NOT NULL REFERENCES intervention_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration_range VARCHAR(50), -- e.g., "1-3 days", "2-4 weeks", "Self-paced"
    delivery_mode VARCHAR(50), -- e.g., "Face-to-face", "Online", "Blended", "Self-directed"
    cost_level VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH
    complexity_level VARCHAR(20) DEFAULT 'MEDIUM', -- BASIC, INTERMEDIATE, ADVANCED, EXPERT
    prerequisites TEXT,
    learning_objectives TEXT,
    assessment_method VARCHAR(100),
    certification_provided BOOLEAN DEFAULT FALSE,
    external_provider VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create intervention instances table (for tracking actual interventions)
CREATE TABLE IF NOT EXISTS intervention_instances (
    id VARCHAR(50) PRIMARY KEY,
    intervention_type_id VARCHAR(50) NOT NULL REFERENCES intervention_types(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    instructor VARCHAR(100),
    location VARCHAR(200),
    start_date DATE,
    end_date DATE,
    max_participants INTEGER DEFAULT 20,
    current_participants INTEGER DEFAULT 0,
    cost_per_participant DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'PLANNED', -- PLANNED, ONGOING, COMPLETED, CANCELLED
    notes TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create intervention participants table
CREATE TABLE IF NOT EXISTS intervention_participants (
    id VARCHAR(50) PRIMARY KEY,
    instance_id VARCHAR(50) NOT NULL REFERENCES intervention_instances(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP DEFAULT NOW(),
    completion_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ENROLLED', -- ENROLLED, IN_PROGRESS, COMPLETED, DROPPED_OUT
    grade VARCHAR(10), -- A, B, C, D, F, Pass, Fail
    feedback TEXT,
    certificate_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(instance_id, employee_id)
);

-- Insert default categories
INSERT INTO intervention_categories (id, name, description, color, icon) VALUES
('FORMAL', 'Formal / Structured Interventions', 'Traditional structured learning programs', '#3B82F6', 'GraduationCap'),
('WORKPLACE', 'Workplace / Experiential Interventions', 'Learning through work experience and practice', '#10B981', 'Briefcase'),
('SOCIAL', 'Social / Developmental Interventions', 'Learning through relationships and collaboration', '#F59E0B', 'Users'),
('SELF_DIRECTED', 'Self-Directed Interventions', 'Employee-driven learning activities', '#8B5CF6', 'BookOpen'),
('STRATEGIC', 'Strategic Interventions', 'High-level organizational development programs', '#EF4444', 'Target');

-- Insert intervention types for each category
INSERT INTO intervention_types (id, category_id, name, description, duration_range, delivery_mode, cost_level, complexity_level) VALUES
-- Formal / Structured Interventions
('CLASSROOM_TRAINING', 'FORMAL', 'Classroom Training (Instructor-led)', 'Traditional face-to-face training sessions with instructor', '1-5 days', 'Face-to-face', 'HIGH', 'INTERMEDIATE'),
('E_LEARNING', 'FORMAL', 'E-Learning / Online Modules', 'Self-paced digital courses through LMS', 'Self-paced', 'Online', 'MEDIUM', 'BASIC'),
('WORKSHOPS', 'FORMAL', 'Workshops / Bootcamps', 'Interactive, shorter, skill-based sessions', '1-3 days', 'Face-to-face', 'HIGH', 'INTERMEDIATE'),
('CERTIFICATIONS', 'FORMAL', 'Professional Certifications', 'Accredited programs (PMP, ITIL, ICAO/IATA)', '3-12 months', 'Blended', 'HIGH', 'ADVANCED'),
('ACADEMIC_PROGRAMS', 'FORMAL', 'Academic Programs / Sponsorships', 'Diplomas, degrees, executive education', '6-24 months', 'Blended', 'HIGH', 'EXPERT'),

-- Workplace / Experiential Interventions
('OJT', 'WORKPLACE', 'On-the-Job Training (OJT)', 'Learning by doing, supported by supervisors', '1-6 months', 'Workplace', 'LOW', 'BASIC'),
('JOB_ROTATION', 'WORKPLACE', 'Job Rotation / Cross-Functional', 'Moving between roles for exposure', '3-12 months', 'Workplace', 'MEDIUM', 'INTERMEDIATE'),
('STRETCH_ASSIGNMENTS', 'WORKPLACE', 'Stretch Assignments / Projects', 'Challenging tasks to develop skills', '1-6 months', 'Workplace', 'LOW', 'ADVANCED'),
('SECONDMENTS', 'WORKPLACE', 'Secondments / International Exposure', 'Temporary assignments abroad or other departments', '6-24 months', 'Workplace', 'HIGH', 'ADVANCED'),
('SIMULATIONS', 'WORKPLACE', 'Simulations & Role Plays', 'Practicing scenarios in safe environment', '1-3 days', 'Face-to-face', 'MEDIUM', 'INTERMEDIATE'),

-- Social / Developmental Interventions
('COACHING', 'SOCIAL', 'Coaching', 'One-on-one sessions with coach for skills/performance', '3-12 months', 'Face-to-face', 'HIGH', 'INTERMEDIATE'),
('MENTORING', 'SOCIAL', 'Mentoring', 'Guidance from senior colleagues for career growth', '6-24 months', 'Face-to-face', 'LOW', 'INTERMEDIATE'),
('PEER_LEARNING', 'SOCIAL', 'Peer Learning / Communities of Practice', 'Knowledge sharing groups', 'Ongoing', 'Blended', 'LOW', 'BASIC'),
('ACTION_LEARNING', 'SOCIAL', 'Action Learning Groups', 'Teams solving real business issues while learning', '3-6 months', 'Blended', 'MEDIUM', 'ADVANCED'),

-- Self-Directed Interventions
('SELF_LEARNING', 'SELF_DIRECTED', 'Self-Learning', 'Books, articles, podcasts, videos', 'Self-paced', 'Self-directed', 'LOW', 'BASIC'),
('MOOCS', 'SELF_DIRECTED', 'MOOCs & Online Platforms', 'LinkedIn Learning, Coursera, ICAO courses', 'Self-paced', 'Online', 'MEDIUM', 'BASIC'),
('KNOWLEDGE_PORTALS', 'SELF_DIRECTED', 'Knowledge Portals & Sharing Tools', 'Intranet, knowledge bases', 'Ongoing', 'Online', 'LOW', 'BASIC'),
('IDPS', 'SELF_DIRECTED', 'Learning Journeys / IDPs', 'Employee-driven growth paths', '6-24 months', 'Self-directed', 'LOW', 'INTERMEDIATE'),

-- Strategic Interventions
('LEADERSHIP_PROGRAMS', 'STRATEGIC', 'Leadership Development Programs', 'Targeted programs for future leaders', '6-18 months', 'Blended', 'HIGH', 'EXPERT'),
('CONFERENCES', 'STRATEGIC', 'Conferences / Seminars / Study Tours', 'Exposure to industry trends', '1-5 days', 'Face-to-face', 'HIGH', 'ADVANCED'),
('SHADOWING', 'STRATEGIC', 'Shadowing / Observation', 'Watching experts perform tasks', '1-4 weeks', 'Workplace', 'LOW', 'BASIC');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_intervention_types_category ON intervention_types(category_id);
CREATE INDEX IF NOT EXISTS idx_intervention_instances_type ON intervention_instances(intervention_type_id);
CREATE INDEX IF NOT EXISTS idx_intervention_instances_status ON intervention_instances(status);
CREATE INDEX IF NOT EXISTS idx_intervention_participants_instance ON intervention_participants(instance_id);
CREATE INDEX IF NOT EXISTS idx_intervention_participants_employee ON intervention_participants(employee_id);
CREATE INDEX IF NOT EXISTS idx_intervention_participants_status ON intervention_participants(status);
