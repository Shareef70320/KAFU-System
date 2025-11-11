const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

async function checkElementsColumn() {
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
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Total rows: ${data.length}`);
    console.log(`Columns: ${Object.keys(data[0] || {}).join(', ')}\n`);
    
    // Check for Competency Elements column
    const elementColumn = Object.keys(data[0] || {}).find(k => 
      k.toLowerCase().includes('element') && 
      k.toLowerCase().includes('competency')
    );
    
    if (!elementColumn) {
      console.log('❌ "Competency Elements" column not found!');
      console.log('\nAvailable columns:');
      Object.keys(data[0] || {}).forEach(col => console.log(`  - ${col}`));
      return;
    }
    
    console.log(`✓ Found column: "${elementColumn}"\n`);
    
    // Check rows with elements
    let rowsWithElements = 0;
    let totalElements = 0;
    const samples = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const elementsValue = row[elementColumn];
      
      if (elementsValue && String(elementsValue).trim().length > 0) {
        rowsWithElements++;
        const elementsText = String(elementsValue);
        
        // Split by newlines and filter for bullet points
        const lines = elementsText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        const bulletLines = lines.filter(line => 
          line.startsWith('•') || 
          line.startsWith('-') || 
          line.startsWith('*') ||
          line.match(/^[•\-\*]\s/)
        );
        
        totalElements += bulletLines.length;
        
        if (samples.length < 5) {
          samples.push({
            row: i + 1,
            competency: row['Competency Title'] || row['Competency Title '] || 'Unknown',
            elementsCount: bulletLines.length,
            sampleElements: bulletLines.slice(0, 3)
          });
        }
      }
    }
    
    console.log(`Rows with elements: ${rowsWithElements} out of ${data.length}`);
    console.log(`Total elements found: ${totalElements}\n`);
    
    if (samples.length > 0) {
      console.log('Sample rows with elements:');
      samples.forEach(sample => {
        console.log(`\nRow ${sample.row}: ${sample.competency}`);
        console.log(`  Elements: ${sample.elementsCount}`);
        sample.sampleElements.forEach((el, idx) => {
          console.log(`    ${idx + 1}. ${el.substring(0, 80)}${el.length > 80 ? '...' : ''}`);
        });
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

if (require.main === module) {
  checkElementsColumn()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

module.exports = { checkElementsColumn };

