const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const prisma = new PrismaClient();

async function listMissingCompetencies() {
  try {
    // Try multiple possible paths
    const possiblePaths = [
      path.join(__dirname, '../../JobCompetencyProfiles.xlsx'),
      path.join(__dirname, '../JobCompetencyProfiles.xlsx'),
      '/app/JobCompetencyProfiles.xlsx',
      path.join(process.cwd(), 'JobCompetencyProfiles.xlsx')
    ];
    
    let excelPath = null;
    for (const p of possiblePaths) {
      try {
        const fs = require('fs');
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
    
    // Read Excel file
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Get competency names from Excel
    const excelCompetencies = [...new Set(data.map(row => {
      const key = Object.keys(row).find(k => 
        k.toLowerCase().includes('competency') && 
        k.toLowerCase().includes('name')
      );
      return key ? String(row[key]).trim() : null;
    }).filter(Boolean))];
    
    // Get all competencies from database
    const competencies = await prisma.$queryRawUnsafe(`
      SELECT name, id FROM competencies ORDER BY name
    `);
    const dbCompetencyNames = competencies.map(c => c.name);
    
    // Case-insensitive comparison
    const dbCompetencyNamesLower = dbCompetencyNames.map(n => n.toLowerCase().trim());
    
    // Find truly missing (not even case-insensitive match)
    const trulyMissing = excelCompetencies.filter(excelName => {
      const excelLower = excelName.toLowerCase().trim();
      return !dbCompetencyNamesLower.includes(excelLower);
    });
    
    console.log('=== 63 MISSING COMPETENCIES (Not in Database) ===\n');
    console.log(`Total: ${trulyMissing.length}\n`);
    
    // Sort alphabetically for easier review
    trulyMissing.sort().forEach((compName, index) => {
      const rows = data.filter(row => {
        const key = Object.keys(row).find(k => 
          k.toLowerCase().includes('competency') && 
          k.toLowerCase().includes('name')
        );
        return key && String(row[key]).trim() === compName;
      });
      console.log(`${(index + 1).toString().padStart(2, ' ')}. "${compName}" (${rows.length} row(s))`);
    });
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total missing competencies: ${trulyMissing.length}`);
    const totalRows = trulyMissing.reduce((sum, compName) => {
      const rows = data.filter(row => {
        const key = Object.keys(row).find(k => 
          k.toLowerCase().includes('competency') && 
          k.toLowerCase().includes('name')
        );
        return key && String(row[key]).trim() === compName;
      });
      return sum + rows.length;
    }, 0);
    console.log(`Total rows affected: ${totalRows}`);
    
  } catch (error) {
    console.error('Error listing missing competencies:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  listMissingCompetencies()
    .then(() => {
      console.log('\nList completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

module.exports = { listMissingCompetencies };

