const fs = require('fs');

// Read CSV and generate SQL
const csvContent = fs.readFileSync('HRData.csv', 'utf8');
const lines = csvContent.split('\n');
const headers = lines[0].split(',').map(h => h.trim());

let sql = `-- Import All 1,254 Employees from HRData.csv
DELETE FROM employees;

INSERT INTO employees (
    id, sid, erp_id, first_name, last_name, email, job_code, job_title,
    division, unit, department, section, sub_section, position_remark,
    grade, location, photo_url, is_active, employment_status
) VALUES
`;

const values = [];

for (let i = 1; i < lines.length; i++) {
  if (lines[i].trim()) {
    const row = lines[i].split(',').map(v => v.trim());
    
    const sid = row[0] || '';
    const fullName = row[1] || '';
    const erpId = row[2] || '';
    const email = row[3] || '';
    const jobCode = row[4] || '';
    const jobTitle = row[5] || '';
    const division = row[6] || '';
    const unit = row[7] || '';
    const department = row[8] || '';
    const section = row[9] || '';
    const subSection = row[10] || '';
    const positionRemark = row[11] || '';
    const grade = row[12] || '';
    const location = row[13] || '';
    
    // Split name into first and last
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const employeeId = `EMP${String(i).padStart(3, '0')}`;
    const photoUrl = sid ? `/employee-photos/${sid}.jpg` : null;
    
    // Escape single quotes
    const escape = (str) => (str || '').replace(/'/g, "''");
    
    values.push(`(
      '${employeeId}',
      ${sid ? `'${escape(sid)}'` : 'NULL'},
      ${erpId ? `'${escape(erpId)}'` : 'NULL'},
      '${escape(firstName)}',
      '${escape(lastName)}',
      '${escape(email)}',
      ${jobCode ? `'${escape(jobCode)}'` : 'NULL'},
      ${jobTitle ? `'${escape(jobTitle)}'` : 'NULL'},
      ${division ? `'${escape(division)}'` : 'NULL'},
      ${unit ? `'${escape(unit)}'` : 'NULL'},
      ${department ? `'${escape(department)}'` : 'NULL'},
      ${section ? `'${escape(section)}'` : 'NULL'},
      ${subSection ? `'${escape(subSection)}'` : 'NULL'},
      ${positionRemark ? `'${escape(positionRemark)}'` : 'NULL'},
      ${grade ? `'${escape(grade)}'` : 'NULL'},
      ${location ? `'${escape(location)}'` : 'NULL'},
      ${photoUrl ? `'${photoUrl}'` : 'NULL'},
      true,
      'ACTIVE'
    )`);
  }
}

sql += values.join(',\n') + ';\n\n';
sql += `-- Verify import
SELECT 'Import completed successfully' as status;
SELECT COUNT(*) as total_employees FROM employees;
SELECT division, COUNT(*) as count FROM employees GROUP BY division ORDER BY count DESC;
SELECT job_code, COUNT(*) as count FROM employees GROUP BY job_code ORDER BY count DESC LIMIT 10;
`;

fs.writeFileSync('import_all_employees_full.sql', sql);
console.log(`✅ Generated SQL file with ${values.length} employees`);
console.log('📁 File: import_all_employees_full.sql');

