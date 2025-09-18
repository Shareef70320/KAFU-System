const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function quickImport() {
  try {
    console.log('Starting quick HR import...');
    
    // Read CSV file
    const csvContent = fs.readFileSync('HRData.csv', 'utf8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    console.log('Headers:', headers);
    console.log('Total lines:', lines.length - 1);
    
    // Clear existing employees
    await prisma.employee.deleteMany({});
    console.log('Cleared existing employees');
    
    const employees = [];
    
    // Process each line (skip header)
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',');
        
        const fullName = values[1]?.trim() || '';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const employee = {
          employeeId: values[0]?.trim() || `EMP_${i}`,
          sid: values[0]?.trim() || null,
          erpId: values[2]?.trim() || null,
          firstName: firstName,
          lastName: lastName,
          email: values[3]?.trim() || '',
          jobCode: values[4]?.trim() || null,
          jobTitle: values[5]?.trim() || null,
          division: values[6]?.trim() || null,
          unit: values[7]?.trim() || null,
          department: values[8]?.trim() || null,
          section: values[9]?.trim() || null,
          subSection: values[10]?.trim() || null,
          positionRemark: values[11]?.trim() || null,
          grade: values[12]?.trim() || null,
          location: values[13]?.trim() || null,
          workLocation: values[13]?.trim() || null,
          photoUrl: values[0] ? `/employee-photos/${values[0].trim()}.jpg` : null,
          isActive: true,
          employmentStatus: 'ACTIVE',
        };
        
        employees.push(employee);
        
        if (employees.length >= 50) {
          await prisma.employee.createMany({ data: employees, skipDuplicates: true });
          console.log(`Imported ${employees.length} employees...`);
          employees.length = 0;
        }
      }
    }
    
    // Import remaining employees
    if (employees.length > 0) {
      await prisma.employee.createMany({ data: employees, skipDuplicates: true });
      console.log(`Imported final ${employees.length} employees`);
    }
    
    console.log('Import completed!');
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

quickImport();

