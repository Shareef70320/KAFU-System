-- Simple sync function without location updates to avoid infinite loops
CREATE OR REPLACE FUNCTION sync_job_to_employees()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update employees when job details change
    -- Preserve employee-specific fields like location, grade, etc.
    UPDATE employees 
    SET 
        job_title = NEW.title,
        division = NEW.division,
        department = NEW.department,
        unit = NEW.unit,
        section = NEW.section,
        updated_at = NOW()
    WHERE job_code = NEW.code;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync job changes to employees
CREATE TRIGGER trigger_sync_job_to_employees
    AFTER UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION sync_job_to_employees();
