-- Create function to sync job changes to employees
CREATE OR REPLACE FUNCTION sync_job_to_employees()
RETURNS TRIGGER AS $$
BEGIN
    -- Update employees when job details change
    -- Only sync job-related fields, preserve employee-specific fields like location, grade, etc.
    UPDATE employees 
    SET 
        job_title = NEW.title,
        division = NEW.division,
        department = NEW.department,
        unit = NEW.unit,
        section = NEW.section,
        updated_at = NOW()
    WHERE job_code = NEW.code;
    
    -- Update the locations array in jobs table based on employee locations
    UPDATE jobs 
    SET locations = (
        SELECT array_agg(DISTINCT location) 
        FROM employees 
        WHERE employees.job_code = jobs.code 
        AND location IS NOT NULL
    )
    WHERE code = NEW.code;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync job changes to employees
CREATE TRIGGER trigger_sync_job_to_employees
    AFTER UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION sync_job_to_employees();

-- Create function to update job locations when employee locations change
CREATE OR REPLACE FUNCTION update_job_locations()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the locations array in jobs table when employee location changes
    UPDATE jobs 
    SET locations = (
        SELECT array_agg(DISTINCT location) 
        FROM employees 
        WHERE employees.job_code = jobs.code 
        AND location IS NOT NULL
    )
    WHERE code = COALESCE(NEW.job_code, OLD.job_code);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update job locations when employee location changes
CREATE TRIGGER trigger_update_job_locations
    AFTER INSERT OR UPDATE OR DELETE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_job_locations();
