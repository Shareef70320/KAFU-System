-- Clear all Development Paths data
-- This script removes all development path related data to start fresh

-- Delete path interventions first (due to foreign key constraints)
DELETE FROM path_interventions;

-- Delete path assignments
DELETE FROM path_assignments;

-- Delete development paths
DELETE FROM development_paths;

-- Reset any sequences if they exist (PostgreSQL doesn't auto-increment these tables)
-- No sequences to reset as we're using custom ID generation

-- Verify cleanup
SELECT 'Development Paths' as table_name, COUNT(*) as remaining_records FROM development_paths
UNION ALL
SELECT 'Path Assignments' as table_name, COUNT(*) as remaining_records FROM path_assignments
UNION ALL
SELECT 'Path Interventions' as table_name, COUNT(*) as remaining_records FROM path_interventions;
