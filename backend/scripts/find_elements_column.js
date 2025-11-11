const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

async function findElementsColumn() {
  try {
    const possiblePaths = [
      path.join(__dirname, '../../CompetencyDictionaryV02.xlsx'),
      path.join(__dirname, '../CompetencyDictionaryV02.xlsx'),
      '/app/CompetencyDictionaryV02.xlsx',
      path.join(process.cwd(), 'CompetencyDictionaryV02.xlsx')
    ];
    
    let excelPath = null;
    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p)) {
          excelPath = p;
          break;
        }
      } catch (e) {}
    }
    
    if (!excelPath) {
      throw new Error(`Excel file not found`);
    }
    
    console.log(`Reading Excel file: ${excelPath}\n`);
    
    const workbook = XLSX.readFile(excelPath);
    
    console.log(`Sheets: ${workbook.SheetNames.join(', ')}\n`);
    
    // Check all sheets
    for (const sheetName of workbook.SheetNames) {
      console.log(`\n=== Sheet: ${sheetName} ===`);
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      if (data.length === 0) {
        console.log('  Empty sheet');
        continue;
      }
      
      const columns = Object.keys(data[0] || {});
      console.log(`  Columns (${columns.length}):`);
      columns.forEach(col => {
        const hasElement = col.toLowerCase().includes('element');
        console.log(`    ${hasElement ? '>>> ' : '    '}${col}`);
      });
      
      // Check for element-related columns
      const elementColumns = columns.filter(k => 
        k.toLowerCase().includes('element')
      );
      
      if (elementColumns.length > 0) {
        console.log(`\n  ✓ Found element columns: ${elementColumns.join(', ')}`);
        
        // Show sample data
        for (let i = 0; i < Math.min(3, data.length); i++) {
          const row = data[i];
          elementColumns.forEach(col => {
            const value = row[col];
            if (value && String(value).trim().length > 0) {
              console.log(`\n  Row ${i + 1}, Column "${col}":`);
              const text = String(value).substring(0, 300);
              console.log(`    ${text}${String(value).length > 300 ? '...' : ''}`);
            }
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

if (require.main === module) {
  findElementsColumn()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

module.exports = { findElementsColumn };

