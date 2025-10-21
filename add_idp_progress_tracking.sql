-- Add progress tracking columns to idp_entries table
-- This script adds columns for tracking IDP progress and status updates

-- Add progress tracking columns
ALTER TABLE idp_entries 
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
ADD COLUMN IF NOT EXISTS progress_notes TEXT,
ADD COLUMN IF NOT EXISTS last_progress_update TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS completion_date DATE,
ADD COLUMN IF NOT EXISTS started_date DATE;

-- Update existing records to have proper default values
UPDATE idp_entries 
SET progress_percentage = 0,
    last_progress_update = created_at
WHERE progress_percentage IS NULL;

-- Create index for better performance on progress queries
CREATE INDEX IF NOT EXISTS idx_idp_entries_progress ON idp_entries(progress_percentage);
CREATE INDEX IF NOT EXISTS idx_idp_entries_status ON idp_entries(status);
CREATE INDEX IF NOT EXISTS idx_idp_entries_last_update ON idp_entries(last_progress_update);

-- Add comments for documentation
COMMENT ON COLUMN idp_entries.progress_percentage IS 'Progress percentage from 0 to 100';
COMMENT ON COLUMN idp_entries.progress_notes IS 'User notes about progress updates';
COMMENT ON COLUMN idp_entries.last_progress_update IS 'Timestamp of last progress update';
COMMENT ON COLUMN idp_entries.completion_date IS 'Date when IDP was completed';
COMMENT ON COLUMN idp_entries.started_date IS 'Date when IDP work was started';
