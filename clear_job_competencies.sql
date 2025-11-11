-- Clear all job competency mappings
-- This script removes all existing job-competency relationships

DELETE FROM job_competencies;

-- Reset any sequences if needed
-- Note: job_competencies uses text IDs, so no sequence reset needed

-- Verify deletion
SELECT COUNT(*) as remaining_mappings FROM job_competencies;

