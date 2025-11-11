-- Migration: Add Full Employee Data Columns
-- This script adds all new columns from EmployeeData_Full.xlsx to the employees table
-- Run this before importing the full employee data

-- Add new columns to employees table
ALTER TABLE employees 
  -- Name fields
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS name_ar TEXT,
  
  -- Job/Position fields
  ADD COLUMN IF NOT EXISTS jcp_code TEXT,
  ADD COLUMN IF NOT EXISTS division1 TEXT,
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS job TEXT,
  ADD COLUMN IF NOT EXISTS chief_office TEXT,
  
  -- Supervisor fields
  ADD COLUMN IF NOT EXISTS competency_supervisor_sid TEXT,
  
  -- Personal Information
  ADD COLUMN IF NOT EXISTS date_of_birth TIMESTAMP,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS gender TEXT, -- Will be enum in Prisma, but TEXT for migration
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS mobile_number TEXT,
  ADD COLUMN IF NOT EXISTS id_resident_card_no TEXT,
  
  -- Employment Information
  ADD COLUMN IF NOT EXISTS joining_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS previous_experience FLOAT,
  ADD COLUMN IF NOT EXISTS oamc_experience FLOAT,
  ADD COLUMN IF NOT EXISTS total_experience FLOAT,
  ADD COLUMN IF NOT EXISTS person_type TEXT,
  ADD COLUMN IF NOT EXISTS employee_category TEXT,
  ADD COLUMN IF NOT EXISTS employee_local TEXT,
  ADD COLUMN IF NOT EXISTS qualification TEXT,
  ADD COLUMN IF NOT EXISTS specialization TEXT;

-- Add index on competency_supervisor_sid for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_competency_supervisor_sid ON employees(competency_supervisor_sid);

-- Add foreign key constraint for competency_supervisor_sid (self-referencing)
-- Note: This will only work if the referenced SIDs exist
-- You may need to run this after the import if there are supervisor SIDs that don't exist yet
-- ALTER TABLE employees 
--   ADD CONSTRAINT fk_competency_supervisor 
--   FOREIGN KEY (competency_supervisor_sid) 
--   REFERENCES employees(sid) 
--   ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON COLUMN employees.full_name IS 'Full employee name from Excel';
COMMENT ON COLUMN employees.name_ar IS 'Arabic name';
COMMENT ON COLUMN employees.jcp_code IS 'JCP Code from Excel';
COMMENT ON COLUMN employees.division1 IS 'Division 1 from Excel';
COMMENT ON COLUMN employees.competency_supervisor_sid IS 'Competency supervisor SID (initially same as line_manager_sid)';
COMMENT ON COLUMN employees.date_of_birth IS 'Date of birth from Excel';
COMMENT ON COLUMN employees.age IS 'Calculated age from date_of_birth';
COMMENT ON COLUMN employees.joining_date IS 'Joining date from Excel';
COMMENT ON COLUMN employees.previous_experience IS 'Previous experience in years';
COMMENT ON COLUMN employees.oamc_experience IS 'OAMC experience calculated from joining_date';
COMMENT ON COLUMN employees.total_experience IS 'Total experience (previous + oamc)';

