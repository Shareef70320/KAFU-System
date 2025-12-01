-- Migration script to move competency elements from competency to competency level
-- This script adds the competency_level_id column and migrates existing data

-- Step 1: Add competency_level_id column (nullable initially)
ALTER TABLE competency_elements 
ADD COLUMN IF NOT EXISTS competency_level_id TEXT;

-- Step 2: Create index for the new column
CREATE INDEX IF NOT EXISTS idx_competency_elements_level_id 
ON competency_elements(competency_level_id);

-- Step 3: Migrate existing elements to the first level of each competency
-- This assigns all existing elements to the BASIC level of their competency
UPDATE competency_elements ce
SET competency_level_id = (
  SELECT cl.id 
  FROM competency_levels cl
  WHERE cl."competencyId" = ce.competency_id
    AND cl.level = 'BASIC'
  LIMIT 1
)
WHERE ce.competency_level_id IS NULL
  AND ce.competency_id IS NOT NULL;

-- Step 4: For competencies without a BASIC level, assign to the first available level
UPDATE competency_elements ce
SET competency_level_id = (
  SELECT cl.id 
  FROM competency_levels cl
  WHERE cl."competencyId" = ce.competency_id
  ORDER BY 
    CASE cl.level
      WHEN 'BASIC' THEN 1
      WHEN 'INTERMEDIATE' THEN 2
      WHEN 'ADVANCED' THEN 3
      WHEN 'MASTERY' THEN 4
    END
  LIMIT 1
)
WHERE ce.competency_level_id IS NULL
  AND ce.competency_id IS NOT NULL;

-- Step 5: Add foreign key constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'competency_elements_competency_level_id_fkey'
  ) THEN
    ALTER TABLE competency_elements
    ADD CONSTRAINT competency_elements_competency_level_id_fkey
    FOREIGN KEY (competency_level_id) 
    REFERENCES competency_levels(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Step 6: Make competency_id nullable (it's now optional for backward compatibility)
-- Note: This is already nullable in the new schema, but we keep it for existing data

-- Step 7: Add comment
COMMENT ON COLUMN competency_elements.competency_level_id IS 'Links element to a specific competency level (BASIC, INTERMEDIATE, ADVANCED, MASTERY)';

