-- Create idp_entries table for Render database
-- This table stores Individual Development Plan entries

CREATE TABLE IF NOT EXISTS idp_entries (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    competency_id TEXT NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    required_level TEXT NOT NULL,
    employee_level TEXT,
    system_level TEXT,
    manager_level TEXT,
    intervention_id TEXT,
    intervention_type_id TEXT,
    custom_intervention_name TEXT,
    target_date DATE,
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    status TEXT NOT NULL DEFAULT 'OPEN',
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_idp_entries_employee_id ON idp_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_idp_entries_competency_id ON idp_entries(competency_id);
CREATE INDEX IF NOT EXISTS idx_idp_entries_intervention_id ON idp_entries(intervention_id);
CREATE INDEX IF NOT EXISTS idx_idp_entries_status ON idp_entries(status);
CREATE INDEX IF NOT EXISTS idx_idp_entries_created_at ON idp_entries(created_at);

-- Add foreign key constraints if tables exist
DO $$
BEGIN
    -- Add foreign key for intervention_id if intervention_instances table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intervention_instances') THEN
        ALTER TABLE idp_entries 
        ADD CONSTRAINT fk_idp_entries_intervention 
        FOREIGN KEY (intervention_id) REFERENCES intervention_instances(id) ON DELETE SET NULL;
    END IF;
    
    -- Add foreign key for intervention_type_id if intervention_types table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intervention_types') THEN
        ALTER TABLE idp_entries 
        ADD CONSTRAINT fk_idp_entries_intervention_type 
        FOREIGN KEY (intervention_type_id) REFERENCES intervention_types(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Verify table creation
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'idp_entries' 
ORDER BY ordinal_position;
