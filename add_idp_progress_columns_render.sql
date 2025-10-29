-- SQL Migration: Add IDP Progress Tracking Columns to Render Database
-- Run this on your Render PostgreSQL database to enable IDP progress updates
-- 
-- IMPORTANT: Get your Render database connection URL from:
-- Render Dashboard → Your PostgreSQL Service → Settings → Internal Connection URL
-- 
-- To run this script:
-- Option 1: Using psql (if you have it installed):
--   psql "<YOUR_RENDER_DATABASE_URL>" -f add_idp_progress_columns_render.sql
--
-- Option 2: Using Render's PostgreSQL Shell (if available):
--   Copy and paste the SQL commands below into the shell
--
-- Option 3: Using a PostgreSQL GUI tool (pgAdmin, DBeaver, etc.):
--   Connect to your Render database and execute this script

-- Add progress tracking columns if they don't exist
ALTER TABLE idp_entries
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_notes TEXT,
ADD COLUMN IF NOT EXISTS last_progress_update TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS started_date TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS completion_date TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS progress_attachments TEXT[],
ADD COLUMN IF NOT EXISTS attachment_names TEXT[];

-- Add a check constraint for progress_percentage (0-100)
ALTER TABLE idp_entries
DROP CONSTRAINT IF EXISTS idp_entries_progress_percentage_check;

ALTER TABLE idp_entries
ADD CONSTRAINT idp_entries_progress_percentage_check
CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- Verify the columns were added (optional - just to confirm)
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'idp_entries' 
-- AND column_name IN (
--   'progress_percentage', 
--   'progress_notes', 
--   'last_progress_update',
--   'started_date',
--   'completion_date',
--   'progress_attachments',
--   'attachment_names'
-- );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ IDP progress tracking columns added successfully!';
  RAISE NOTICE 'You can now update IDP progress on Render.';
END $$;

