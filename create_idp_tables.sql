-- Individual Development Plan (IDP) tables

CREATE TABLE IF NOT EXISTS idp_entries (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,                -- SID or employee id (store SID for consistency with assessment_sessions)
    competency_id TEXT NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    required_level TEXT NOT NULL,             -- from job_competencies.requiredLevel (BASIC/INTERMEDIATE/ADVANCED/MASTERY)
    employee_level TEXT,                      -- user_confirmed_level at creation time
    system_level TEXT,                        -- system_level at creation time
    manager_level TEXT,                       -- manager_selected_level if available
    intervention_id TEXT,                     -- link to intervention_instances.id (optional)
    status TEXT NOT NULL DEFAULT 'OPEN',      -- OPEN, IN_PROGRESS, COMPLETED, CANCELLED
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idp_entries_employee ON idp_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_idp_entries_competency ON idp_entries(competency_id);
CREATE INDEX IF NOT EXISTS idx_idp_entries_status ON idp_entries(status);

