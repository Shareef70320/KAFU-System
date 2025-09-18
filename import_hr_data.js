const fs = require('fs');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function importHRData() {
  try {
    console.log('Starting HR data import...');
    
    // Clear existing employees
    console.log('Clearing existing employees...');
    await prisma.employee.deleteMany({});
    
    const employees = [];
    let rowCount = 0;
    
    // Read and parse CSV file
    fs.createReadStream('HRData.csv')
      .pipe(csv())
      .on('data', (row) => {
        rowCount++;
        
        // Parse name into first and last name
        const fullName = row.Name?.trim() || '';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Create employee object
        const employee = {
          employeeId: row.SID?.trim() || `EMP_${rowCount}`,
          sid: row.SID?.trim() || null,
          erpId: row.ERPID?.trim() || null,
          firstName: firstName,
          lastName: lastName,
          email: row.Email?.trim() || '',
          jobCode: row.JobCode?.trim() || null,
          jobTitle: row['Job Title']?.trim() || null,
          division: row.Division?.trim() || null,
          unit: row.Unit?.trim() || null,
          department: row.Department?.trim() || null,
          section: row.Section?.trim() || null,
          subSection: row['Sub Section']?.trim() || null,
          positionRemark: row['Position Remark']?.trim() || null,
          grade: row.Grade?.trim() || null,
          location: row.Location?.trim() || null,
          workLocation: row.Location?.trim() || null,
          isActive: true,
          employmentStatus: 'ACTIVE',
          // Set photo URL placeholder for future images
          photoUrl: row.SID ? `/employee-photos/${row.SID}.jpg` : null,
        };
        
        employees.push(employee);
        
        // Process in batches of 100
        if (employees.length >= 100) {
          processBatch(employees.splice(0, 100));
        }
      })
      .on('end', async () => {
        // Process remaining employees
        if (employees.length > 0) {
          await processBatch(employees);
        }
        
        console.log(`Import completed! Processed ${rowCount} employees.`);
        await prisma.$disconnect();
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
      });
      
  } catch (error) {
    console.error('Error during import:', error);
    await prisma.$disconnect();
  }
}

async function processBatch(employees) {
  try {
    console.log(`Processing batch of ${employees.length} employees...`);
    
    // Use createMany for better performance
    await prisma.employee.createMany({
      data: employees,
      skipDuplicates: true,
    });
    
    console.log(`Successfully imported ${employees.length} employees.`);
  } catch (error) {
    console.error('Error processing batch:', error);
    // Try individual inserts if batch fails
    for (const employee of employees) {
      try {
        await prisma.employee.create({
          data: employee,
        });
      } catch (individualError) {
        console.error(`Error importing employee ${employee.employeeId}:`, individualError.message);
      }
    }
  }
}

// Run the import
importHRData();

