-- Create competency_families table
CREATE TABLE IF NOT EXISTS competency_families (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  type TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, type)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_competency_families_name ON competency_families(name);
CREATE INDEX IF NOT EXISTS idx_competency_families_type ON competency_families(type);
CREATE INDEX IF NOT EXISTS idx_competency_families_is_active ON competency_families(is_active);

-- Add familyId column to competencies table (optional, for future use)
DO $$ BEGIN
  ALTER TABLE competencies ADD COLUMN "familyId" TEXT;
  EXCEPTION
      WHEN duplicate_column THEN RAISE NOTICE 'column familyId already exists in competencies.';
END $$;

-- Migrate existing families from competencies to competency_families
-- Create a family entry for each unique type-family combination
INSERT INTO competency_families (name, type, description, is_active)
SELECT DISTINCT 
  family as name,
  type,
  NULL as description,
  true as is_active
FROM competencies
WHERE family IS NOT NULL AND family != ''
ON CONFLICT (name, type) DO NOTHING;

