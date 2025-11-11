-- Add is_active to intervention_categories and intervention_instances
ALTER TABLE intervention_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE intervention_instances ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Backfill: set existing to TRUE if NULL
UPDATE intervention_categories SET is_active = TRUE WHERE is_active IS NULL;
UPDATE intervention_instances SET is_active = TRUE WHERE is_active IS NULL;
