-- Clean Employee Table Creation
-- Drop existing table and recreate with HR data structure

DROP TABLE IF EXISTS employees CASCADE;

CREATE TABLE employees (
    id VARCHAR(50) PRIMARY KEY,
    sid VARCHAR(50) UNIQUE,
    erp_id VARCHAR(50),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    job_code VARCHAR(50),
    job_title VARCHAR(255),
    division VARCHAR(100),
    unit VARCHAR(100),
    department VARCHAR(100),
    section VARCHAR(100),
    sub_section VARCHAR(100),
    position_remark TEXT,
    grade VARCHAR(50),
    location VARCHAR(100),
    photo_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    employment_status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_employees_sid ON employees(sid);
CREATE INDEX idx_employees_division ON employees(division);
CREATE INDEX idx_employees_job_code ON employees(job_code);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_email ON employees(email);

-- Insert sample data to test structure
INSERT INTO employees (
    id, sid, erp_id, first_name, last_name, email, job_code, job_title, 
    division, unit, department, section, sub_section, position_remark, 
    grade, location, photo_url, is_active, employment_status
) VALUES (
    'EMP001', '1214', '635', 'Aaisha Ahmed Hamood', 'Al Harthi', 
    '1214@omanairports.com', 'OPS-MCT-216', 'Customer Service Officers',
    'Operations', 'Muscat Airport', 'Aviation', 'Terminal', 'N/A',
    'Security Pass Officer', '9B', 'Muscat', '/employee-photos/1214.jpg',
    true, 'ACTIVE'
);

-- Verify table structure
SELECT 'Table created successfully' as status;
SELECT COUNT(*) as sample_records FROM employees;

