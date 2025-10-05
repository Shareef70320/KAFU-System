-- Create Development Paths tables
-- This script creates the necessary tables for the Development Paths functionality

-- Create development_paths table
CREATE TABLE IF NOT EXISTS development_paths (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create path_assignments table
CREATE TABLE IF NOT EXISTS path_assignments (
    id TEXT PRIMARY KEY,
    path_id TEXT NOT NULL REFERENCES development_paths(id) ON DELETE CASCADE,
    employee_id TEXT REFERENCES employees(sid) ON DELETE CASCADE,
    group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    assigned_by TEXT NOT NULL DEFAULT 'admin',
    CONSTRAINT path_assignments_check CHECK (
        (employee_id IS NOT NULL AND group_id IS NULL) OR 
        (employee_id IS NULL AND group_id IS NOT NULL)
    )
);

-- Create path_interventions table
CREATE TABLE IF NOT EXISTS path_interventions (
    id TEXT PRIMARY KEY,
    path_id TEXT NOT NULL REFERENCES development_paths(id) ON DELETE CASCADE,
    intervention_type TEXT NOT NULL,
    intervention_name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    duration_hours INTEGER,
    status TEXT NOT NULL DEFAULT 'PLANNED',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_path_assignments_path_id ON path_assignments(path_id);
CREATE INDEX IF NOT EXISTS idx_path_assignments_employee_id ON path_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_path_assignments_group_id ON path_assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_path_interventions_path_id ON path_interventions(path_id);
CREATE INDEX IF NOT EXISTS idx_path_interventions_status ON path_interventions(status);

-- Add comments for documentation
COMMENT ON TABLE development_paths IS 'Stores development path definitions';
COMMENT ON TABLE path_assignments IS 'Stores assignments of development paths to employees or groups';
COMMENT ON TABLE path_interventions IS 'Stores interventions/activities within development paths';
