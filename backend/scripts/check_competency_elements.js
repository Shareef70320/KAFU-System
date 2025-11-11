const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

async function checkElements() {
  try {
    // Try multiple possible paths
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
      } catch (e) {
        // Continue to next path
      }
    }
    
    if (!excelPath) {
      throw new Error(`Excel file not found. Tried: ${possiblePaths.join(', ')}`);
    }
    
    console.log(`Reading Excel file: ${excelPath}\n`);
    
    // Read Excel file
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Total rows: ${data.length}`);
    console.log(`Columns: ${Object.keys(data[0] || {}).join(', ')}\n`);
    
    // Check for elements column
    const elementColumns = Object.keys(data[0] || {}).filter(k => 
      k.toLowerCase().includes('element') || 
      k.toLowerCase().includes('attribute') ||
      k.toLowerCase().includes('component')
    );
    
    console.log(`Element-related columns found: ${elementColumns.length > 0 ? elementColumns.join(', ') : 'None'}\n`);
    
    // Check all columns for bullet points
    console.log('Checking all columns for bullet points...\n');
    
    const columnsWithBullets = [];
    const sampleRows = [];
    
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      for (const [key, value] of Object.entries(row)) {
        if (value && typeof value === 'string') {
          // Check for bullet points (•, -, *, etc.)
          if (value.includes('•') || value.includes('-') || value.includes('*') || value.match(/^\s*[•\-\*]\s/)) {
            if (!columnsWithBullets.includes(key)) {
              columnsWithBullets.push(key);
            }
            
            // Store sample
            if (sampleRows.length < 5 && !sampleRows.find(r => r.column === key)) {
              sampleRows.push({
                row: i + 1,
                column: key,
                value: value.substring(0, 200) + (value.length > 200 ? '...' : '')
              });
            }
          }
        }
      }
    }
    
    if (columnsWithBullets.length > 0) {
      console.log(`Columns with bullet points found: ${columnsWithBullets.join(', ')}\n`);
      console.log('Sample rows with bullets:');
      sampleRows.forEach(sample => {
        console.log(`\nRow ${sample.row}, Column "${sample.column}":`);
        console.log(sample.value);
      });
    } else {
      console.log('No columns with bullet points found in first 10 rows.');
      console.log('\nChecking all rows for any column with bullets...');
      
      // Check all rows
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        for (const [key, value] of Object.entries(row)) {
          if (value && typeof value === 'string') {
            if (value.includes('•') || value.includes('-') || value.match(/^\s*[•\-\*]\s/)) {
              if (!columnsWithBullets.includes(key)) {
                columnsWithBullets.push(key);
              }
              
              if (sampleRows.length < 5) {
                sampleRows.push({
                  row: i + 1,
                  column: key,
                  value: value.substring(0, 200) + (value.length > 200 ? '...' : '')
                });
              }
              
              if (columnsWithBullets.length > 0 && sampleRows.length >= 5) break;
            }
          }
        }
        if (columnsWithBullets.length > 0 && sampleRows.length >= 5) break;
      }
      
      if (columnsWithBullets.length > 0) {
        console.log(`\nColumns with bullet points found: ${columnsWithBullets.join(', ')}\n`);
        console.log('Sample rows:');
        sampleRows.forEach(sample => {
          console.log(`\nRow ${sample.row}, Column "${sample.column}":`);
          console.log(sample.value);
        });
      } else {
        console.log('No columns with bullet points found.');
      }
    }
    
    // Show first row with all columns to understand structure
    console.log('\n\nFirst row structure:');
    console.log(JSON.stringify(data[0], null, 2));
    
  } catch (error) {
    console.error('Error checking elements:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  checkElements()
    .then(() => {
      console.log('\nCheck completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkElements };

