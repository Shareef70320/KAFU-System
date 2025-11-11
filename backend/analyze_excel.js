const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'EmployeeData_Full.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });

  console.log('='.repeat(80));
  console.log('EXCEL FILE ANALYSIS');
  console.log('='.repeat(80));
  console.log(`\nSheet Name: ${sheetName}`);
  console.log(`Total Rows: ${data.length}`);
  
  if (data.length > 0) {
    console.log(`\nColumn Headers (${Object.keys(data[0]).length} columns):`);
    console.log('-'.repeat(80));
    Object.keys(data[0]).forEach((col, i) => {
      console.log(`${(i + 1).toString().padStart(3)}. ${col}`);
    });
    
    console.log('\n\nFirst Row Sample Data:');
    console.log('-'.repeat(80));
    console.log(JSON.stringify(data[0], null, 2));
    
    console.log('\n\nChecking for key fields:');
    console.log('-'.repeat(80));
    const keyFields = ['SID', 'JOINING DATE', 'DATE OF BIRTH', 'PREVIOUS EXPERIANCE', 'OAMC EXPERIENCE', 'TOTAL EXPERIANCE', 'AGE'];
    keyFields.forEach(field => {
      const found = Object.keys(data[0]).find(k => k.toUpperCase().includes(field.toUpperCase()));
      if (found) {
        console.log(`✓ Found: "${found}" (matches "${field}")`);
      } else {
        console.log(`✗ Missing: "${field}"`);
      }
    });
    
    // Check date formats
    console.log('\n\nDate Field Analysis:');
    console.log('-'.repeat(80));
    const dateFields = Object.keys(data[0]).filter(k => k.toUpperCase().includes('DATE') || k.toUpperCase().includes('BIRTH'));
    dateFields.forEach(field => {
      const sample = data[0][field];
      console.log(`${field}: ${sample} (type: ${typeof sample})`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
} catch (error) {
  console.error('Error reading Excel file:', error.message);
  process.exit(1);
}

