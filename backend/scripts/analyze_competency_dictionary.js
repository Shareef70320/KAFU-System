const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

async function analyzeExcel() {
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
    
    console.log(`Found ${data.length} rows in Excel file`);
    console.log(`Sheet name: ${sheetName}`);
    console.log(`Columns found: ${Object.keys(data[0] || {}).join(', ')}\n`);
    
    // Show first few rows for structure
    console.log('Sample data (first 3 rows):');
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
    console.log('\n');
    
    // Analyze unique values
    const types = [...new Set(data.map(row => {
      const key = Object.keys(row).find(k => 
        k.toLowerCase().includes('type') && !k.toLowerCase().includes('level')
      );
      return key ? String(row[key]).trim() : null;
    }).filter(Boolean))];
    
    const families = [...new Set(data.map(row => {
      const key = Object.keys(row).find(k => 
        k.toLowerCase().includes('family')
      );
      return key ? String(row[key]).trim() : null;
    }).filter(Boolean))];
    
    const divisions = [...new Set(data.map(row => {
      const key = Object.keys(row).find(k => 
        k.toLowerCase().includes('division')
      );
      return key ? String(row[key]).trim() : null;
    }).filter(Boolean))];
    
    console.log('=== EXCEL FILE ANALYSIS ===');
    console.log(`Total rows: ${data.length}`);
    console.log(`Unique types: ${types.length}`);
    console.log(`Types: ${types.join(', ')}`);
    console.log(`\nUnique families: ${families.length}`);
    console.log(`Families: ${families.slice(0, 20).join(', ')}${families.length > 20 ? '...' : ''}`);
    console.log(`\nUnique divisions: ${divisions.length}`);
    console.log(`Divisions: ${divisions.slice(0, 10).join(', ')}${divisions.length > 10 ? '...' : ''}`);
    
    // Check for level columns
    const levelColumns = Object.keys(data[0] || {}).filter(k => 
      k.toLowerCase().includes('basic') || 
      k.toLowerCase().includes('intermediate') || 
      k.toLowerCase().includes('advanced') || 
      k.toLowerCase().includes('mastery')
    );
    
    console.log(`\nLevel columns found: ${levelColumns.join(', ')}`);
    
  } catch (error) {
    console.error('Error analyzing Excel:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  analyzeExcel()
    .then(() => {
      console.log('\nAnalysis completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { analyzeExcel };

