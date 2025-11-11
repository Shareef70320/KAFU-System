-- Add competency code column
ALTER TABLE competencies 
ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_competencies_code ON competencies(code) WHERE code IS NOT NULL;

-- Add comment
COMMENT ON COLUMN competencies.code IS 'Unique competency code (user-defined or system-generated)';

