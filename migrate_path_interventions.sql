-- Migration script to update path_interventions table for L&D integration
-- Add intervention_type_id column and update existing structure

-- Add intervention_type_id column
ALTER TABLE path_interventions 
ADD COLUMN IF NOT EXISTS intervention_type_id VARCHAR(50);

-- Add instructor column (replacing modality)
ALTER TABLE path_interventions 
ADD COLUMN IF NOT EXISTS instructor VARCHAR(100);

-- Add foreign key constraint to intervention_types
ALTER TABLE path_interventions 
ADD CONSTRAINT fk_path_intervention_type 
FOREIGN KEY (intervention_type_id) REFERENCES intervention_types(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_path_interventions_type ON path_interventions(intervention_type_id);

-- Update existing interventions to have a default intervention type
-- This is a temporary measure - in production, you'd want to map existing interventions properly
UPDATE path_interventions 
SET intervention_type_id = (
  SELECT id FROM intervention_types 
  WHERE name = 'Classroom Training (Instructor-led)' 
  LIMIT 1
)
WHERE intervention_type_id IS NULL AND type = 'CLASSROOM';

UPDATE path_interventions 
SET intervention_type_id = (
  SELECT id FROM intervention_types 
  WHERE name = 'On-the-Job Training (OJT)' 
  LIMIT 1
)
WHERE intervention_type_id IS NULL AND type = 'ON_JOB';

UPDATE path_interventions 
SET intervention_type_id = (
  SELECT id FROM intervention_types 
  WHERE name = 'Self-Learning' 
  LIMIT 1
)
WHERE intervention_type_id IS NULL AND type = 'SELF_LEARNING';

UPDATE path_interventions 
SET intervention_type_id = (
  SELECT id FROM intervention_types 
  WHERE name = 'E-Learning / Online Modules' 
  LIMIT 1
)
WHERE intervention_type_id IS NULL AND type = 'ONLINE';

UPDATE path_interventions 
SET intervention_type_id = (
  SELECT id FROM intervention_types 
  WHERE name = 'E-Learning / Online Modules' 
  LIMIT 1
)
WHERE intervention_type_id IS NULL AND type = 'E_LEARNING';

UPDATE path_interventions 
SET intervention_type_id = (
  SELECT id FROM intervention_types 
  WHERE name = 'Coaching' 
  LIMIT 1
)
WHERE intervention_type_id IS NULL AND type = 'COACHING';

UPDATE path_interventions 
SET intervention_type_id = (
  SELECT id FROM intervention_types 
  WHERE name = 'Mentoring' 
  LIMIT 1
)
WHERE intervention_type_id IS NULL AND type = 'MENTORING';

-- Set a default for any remaining interventions
UPDATE path_interventions 
SET intervention_type_id = (
  SELECT id FROM intervention_types 
  WHERE name = 'Classroom Training (Instructor-led)' 
  LIMIT 1
)
WHERE intervention_type_id IS NULL;
