-- Migration script for Render database to add IDP enhancement columns
-- Run this on the Render PostgreSQL database

-- Add new columns to idp_entries table for enhanced IDP functionality
ALTER TABLE idp_entries 
ADD COLUMN IF NOT EXISTS intervention_type_id TEXT;

ALTER TABLE idp_entries 
ADD COLUMN IF NOT EXISTS custom_intervention_name TEXT;

ALTER TABLE idp_entries 
ADD COLUMN IF NOT EXISTS target_date DATE;

ALTER TABLE idp_entries 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'MEDIUM';

-- Update existing records to have default priority
UPDATE idp_entries 
SET priority = 'MEDIUM' 
WHERE priority IS NULL;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_idp_entries_intervention_type ON idp_entries(intervention_type_id);
CREATE INDEX IF NOT EXISTS idx_idp_entries_target_date ON idp_entries(target_date);
CREATE INDEX IF NOT EXISTS idx_idp_entries_priority ON idp_entries(priority);

-- Add foreign key constraint for intervention_type_id (if intervention_types table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intervention_types') THEN
        ALTER TABLE idp_entries 
        ADD CONSTRAINT fk_idp_entries_intervention_type 
        FOREIGN KEY (intervention_type_id) REFERENCES intervention_types(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'idp_entries' 
ORDER BY ordinal_position;
