#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple CSV parser
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
  }
  
  return data;
}

// Generate SQL insert statements
function generateSQL(employees) {
  let sql = `-- Employee Import SQL
-- Generated from HRData.csv

-- Clear existing employees
DELETE FROM "Employee";

-- Insert employees
INSERT INTO "Employee" (
  "id", "employeeId", "sid", "erpId", "firstName", "lastName", "email", 
  "jobCode", "jobTitle", "division", "unit", "department", "section", 
  "subSection", "positionRemark", "grade", "location", "photoUrl", 
  "isActive", "employmentStatus", "createdAt", "updatedAt"
) VALUES
`;

  const values = employees.map((emp, index) => {
    const fullName = emp.Name || '';
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const employeeId = emp.SID || `EMP_${String(index + 1).padStart(3, '0')}`;
    const photoUrl = emp.SID ? `/employee-photos/${emp.SID}.jpg` : null;
    
    return `(
      '${employeeId}',
      '${employeeId}',
      ${emp.SID ? `'${emp.SID}'` : 'NULL'},
      ${emp.ERPID ? `'${emp.ERPID}'` : 'NULL'},
      '${firstName.replace(/'/g, "''")}',
      '${lastName.replace(/'/g, "''")}',
      '${(emp.Email || '').replace(/'/g, "''")}',
      ${emp.JobCode ? `'${emp.JobCode.replace(/'/g, "''")}'` : 'NULL'},
      ${emp['Job Title'] ? `'${emp['Job Title'].replace(/'/g, "''")}'` : 'NULL'},
      ${emp.Division ? `'${emp.Division.replace(/'/g, "''")}'` : 'NULL'},
      ${emp.Unit ? `'${emp.Unit.replace(/'/g, "''")}'` : 'NULL'},
      ${emp.Department ? `'${emp.Department.replace(/'/g, "''")}'` : 'NULL'},
      ${emp.Section ? `'${emp.Section.replace(/'/g, "''")}'` : 'NULL'},
      ${emp['Sub Section'] ? `'${emp['Sub Section'].replace(/'/g, "''")}'` : 'NULL'},
      ${emp['Position Remark'] ? `'${emp['Position Remark'].replace(/'/g, "''")}'` : 'NULL'},
      ${emp.Grade ? `'${emp.Grade.replace(/'/g, "''")}'` : 'NULL'},
      ${emp.Location ? `'${emp.Location.replace(/'/g, "''")}'` : 'NULL'},
      ${photoUrl ? `'${photoUrl}'` : 'NULL'},
      true,
      'ACTIVE',
      NOW(),
      NOW()
    )`;
  });

  sql += values.join(',\n') + ';';
  
  return sql;
}

// Main function
function main() {
  try {
    console.log('🚀 Starting HR Data Import...');
    
    // Read CSV file
    const csvPath = path.join(__dirname, 'HRData.csv');
    if (!fs.existsSync(csvPath)) {
      console.error('❌ HRData.csv file not found!');
      process.exit(1);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    console.log('📄 CSV file loaded');
    
    // Parse CSV
    const employees = parseCSV(csvContent);
    console.log(`👥 Found ${employees.length} employees`);
    
    // Generate SQL
    const sql = generateSQL(employees);
    
    // Write SQL file
    const sqlPath = path.join(__dirname, 'import_employees.sql');
    fs.writeFileSync(sqlPath, sql);
    console.log(`💾 SQL file generated: ${sqlPath}`);
    
    // Create employee photos directory
    const photosDir = path.join(__dirname, 'frontend', 'public', 'employee-photos');
    if (!fs.existsSync(photosDir)) {
      fs.mkdirSync(photosDir, { recursive: true });
      console.log(`📁 Created photos directory: ${photosDir}`);
    }
    
    console.log('✅ Import preparation complete!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Run migration: docker-compose exec backend npx prisma migrate dev --name add-hr-data-fields');
    console.log('2. Import data: docker-compose exec backend psql -U postgres -d kafu_system -f /app/import_employees.sql');
    console.log('3. Restart frontend: docker-compose restart frontend');
    console.log('');
    console.log(`📊 Summary: ${employees.length} employees ready for import`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

