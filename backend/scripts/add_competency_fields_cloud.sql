-- Add missing competency fields to cloud database
-- This script adds the 'code' and 'familyId' columns that were added in recent updates

-- Add 'code' column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'competencies' AND column_name = 'code'
    ) THEN
        ALTER TABLE competencies ADD COLUMN code TEXT UNIQUE;
        RAISE NOTICE 'Added code column to competencies table';
    ELSE
        RAISE NOTICE 'code column already exists in competencies table';
    END IF;
END $$;

-- Add 'familyId' column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'competencies' AND column_name = 'familyId'
    ) THEN
        ALTER TABLE competencies ADD COLUMN "familyId" TEXT;
        RAISE NOTICE 'Added familyId column to competencies table';
    ELSE
        RAISE NOTICE 'familyId column already exists in competencies table';
    END IF;
END $$;

-- Create competency_families table if it doesn't exist
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

-- Add index on familyId for better query performance
CREATE INDEX IF NOT EXISTS idx_competencies_family_id ON competencies("familyId");

-- Add foreign key constraint if familyId column exists and competency_families table exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'competencies' AND column_name = 'familyId'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'competency_families'
    ) THEN
        -- Check if foreign key already exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'competencies_familyId_fkey'
        ) THEN
            ALTER TABLE competencies 
            ADD CONSTRAINT competencies_familyId_fkey 
            FOREIGN KEY ("familyId") REFERENCES competency_families(id) ON DELETE SET NULL;
            RAISE NOTICE 'Added foreign key constraint for familyId';
        ELSE
            RAISE NOTICE 'Foreign key constraint for familyId already exists';
        END IF;
    END IF;
END $$;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'competencies' 
AND column_name IN ('code', 'familyId')
ORDER BY column_name;

