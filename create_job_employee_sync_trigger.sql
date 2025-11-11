-- Create trigger to sync employee job data when jobs table is updated
-- This ensures that when a job is updated, all employees with that job_code get updated

-- Function to update employees when a job is updated
CREATE OR REPLACE FUNCTION sync_employee_job_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all employees that have this job_code
    UPDATE employees
    SET 
        job_title = NEW.title,
        division = COALESCE(NEW.division, employees.division),
        unit = COALESCE(NEW.unit, employees.unit),
        department = COALESCE(NEW.department, employees.department),
        section = COALESCE(NEW.section, employees.section),
        location = COALESCE(NEW.location, employees.location),
        updated_at = NOW()
    WHERE job_code = NEW.code
        AND (
            -- Only update if something actually changed
            job_title IS DISTINCT FROM NEW.title OR
            (division IS DISTINCT FROM NEW.division AND NEW.division IS NOT NULL) OR
            (unit IS DISTINCT FROM NEW.unit AND NEW.unit IS NOT NULL) OR
            (department IS DISTINCT FROM NEW.department AND NEW.department IS NOT NULL) OR
            (section IS DISTINCT FROM NEW.section AND NEW.section IS NOT NULL) OR
            (location IS DISTINCT FROM NEW.location AND NEW.location IS NOT NULL)
        );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on jobs table
DROP TRIGGER IF EXISTS trigger_sync_employee_job_data ON jobs;
CREATE TRIGGER trigger_sync_employee_job_data
    AFTER UPDATE ON jobs
    FOR EACH ROW
    WHEN (
        -- Only trigger if relevant fields changed
        OLD.title IS DISTINCT FROM NEW.title OR
        OLD.division IS DISTINCT FROM NEW.division OR
        OLD.unit IS DISTINCT FROM NEW.unit OR
        OLD.department IS DISTINCT FROM NEW.department OR
        OLD.section IS DISTINCT FROM NEW.section OR
        OLD.location IS DISTINCT FROM NEW.location
    )
    EXECUTE FUNCTION sync_employee_job_data();

-- Add comment
COMMENT ON FUNCTION sync_employee_job_data() IS 'Automatically updates employee job-related fields when a job is updated in the jobs table';
COMMENT ON TRIGGER trigger_sync_employee_job_data ON jobs IS 'Triggers employee job data sync when job is updated';

