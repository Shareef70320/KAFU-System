-- Add scheduled_location column to review_requests if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'review_requests' AND column_name = 'scheduled_location'
    ) THEN
        ALTER TABLE review_requests ADD COLUMN scheduled_location TEXT;
    END IF;

    BEGIN
        ALTER TYPE review_status ADD VALUE 'ACCEPTED';
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER TYPE review_status ADD VALUE 'REJECTED';
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;

