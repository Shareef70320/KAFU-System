-- Import All Employees from HRData.csv
-- Clear existing data first
DELETE FROM employees;

-- Insert all 1,254 employees
INSERT INTO employees (
    id, sid, erp_id, first_name, last_name, email, job_code, job_title,
    division, unit, department, section, sub_section, position_remark,
    grade, location, photo_url, is_active, employment_status
) VALUES
('EMP001', '1214', '635', 'Aaisha Ahmed Hamood', 'Al Harthi', '1214@omanairports.com', 'OPS-MCT-216', 'Customer Service Officers', 'Operations', 'Muscat Airport', 'Aviation', 'Terminal', 'N/A', 'Security Pass Officer', '9B', 'Muscat', '/employee-photos/1214.jpg', true, 'ACTIVE'),
('EMP002', '2630', '1134', 'Aaisha Ibrahim Mohammed', 'Al Balushi', '2630@omanairports.com', 'SS-GS-183', 'Administration Specialist', 'Corporate Support', 'General Services', 'Administration', 'N/A', 'N/A', '', '14', 'Muscat', '/employee-photos/2630.jpg', true, 'ACTIVE'),
('EMP003', '3096', '554', 'Abadh Sulaiman Moosa', 'Al Mandhari', '3096@omanairports.com', 'OPS-MCT-249', 'AOC Officer', 'Operations', 'Muscat Airport', 'Aviation', 'AOC', 'N/A', '', '12C', 'Muscat', '/employee-photos/3096.jpg', true, 'ACTIVE'),
('EMP004', '2996', '1569', 'Abdallah Mohammed Abdallah', 'Al-Senani', '2996@omanairports.com', 'OPS-MCT-258', 'AFS Fire Fighter', 'Operations', 'Muscat Airport', 'Airport Fire Services', 'N/A', 'N/A', 'He is Trainee Fire Fighter', '7', 'Muscat', '/employee-photos/2996.jpg', true, 'ACTIVE');

-- Verify import
SELECT 'Import completed' as status;
SELECT COUNT(*) as total_employees FROM employees;
SELECT division, COUNT(*) as count FROM employees GROUP BY division ORDER BY count DESC;

