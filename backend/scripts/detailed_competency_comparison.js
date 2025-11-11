const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const prisma = new PrismaClient();

async function detailedComparison() {
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
    
    console.log('=== DETAILED COMPETENCY COMPARISON ===\n');
    console.log(`Total unique competencies in Excel: ${excelCompetencies.length}`);
    console.log(`Total competencies in database: ${dbCompetencyNames.length}\n`);
    
    // Case-insensitive comparison
    const dbCompetencyNamesLower = dbCompetencyNames.map(n => n.toLowerCase().trim());
    const excelCompetenciesLower = excelCompetencies.map(n => n.toLowerCase().trim());
    
    // Find exact matches (case-sensitive)
    const exactMatches = excelCompetencies.filter(excelName => 
      dbCompetencyNames.includes(excelName)
    );
    
    // Find case-insensitive matches (but not exact)
    const caseInsensitiveMatches = excelCompetencies.filter(excelName => {
      const excelLower = excelName.toLowerCase().trim();
      return !dbCompetencyNames.includes(excelName) && 
             dbCompetencyNamesLower.includes(excelLower);
    });
    
    // Find truly missing (not even case-insensitive match)
    const trulyMissing = excelCompetencies.filter(excelName => {
      const excelLower = excelName.toLowerCase().trim();
      return !dbCompetencyNamesLower.includes(excelLower);
    });
    
    console.log(`✓ Exact matches (case-sensitive): ${exactMatches.length}`);
    console.log(`⚠️  Case/formatting differences: ${caseInsensitiveMatches.length}`);
    console.log(`✗ Truly missing (not in database): ${trulyMissing.length}\n`);
    
    if (caseInsensitiveMatches.length > 0) {
      console.log('=== CASE/FORMATTING DIFFERENCES ===');
      console.log('These competencies exist in database but with different case/formatting:\n');
      caseInsensitiveMatches.forEach(excelName => {
        const excelLower = excelName.toLowerCase().trim();
        const dbMatch = dbCompetencyNames.find(dbName => 
          dbName.toLowerCase().trim() === excelLower
        );
        console.log(`  Excel: "${excelName}"`);
        console.log(`  Database: "${dbMatch}"`);
        console.log('');
      });
    }
    
    if (trulyMissing.length > 0) {
      console.log('=== TRULY MISSING COMPETENCIES ===');
      console.log('These competencies are NOT in the database at all:\n');
      trulyMissing.forEach(compName => {
        const rows = data.filter(row => {
          const key = Object.keys(row).find(k => 
            k.toLowerCase().includes('competency') && 
            k.toLowerCase().includes('name')
          );
          return key && String(row[key]).trim() === compName;
        });
        console.log(`  - "${compName}" (appears in ${rows.length} row(s))`);
      });
    }
    
    // Also check the reverse - competencies in DB but not in Excel
    const dbNotInExcel = dbCompetencyNames.filter(dbName => {
      const dbLower = dbName.toLowerCase().trim();
      return !excelCompetenciesLower.includes(dbLower);
    });
    
    console.log(`\n=== COMPETENCIES IN DATABASE BUT NOT IN EXCEL ===`);
    console.log(`Total: ${dbNotInExcel.length}`);
    if (dbNotInExcel.length > 0 && dbNotInExcel.length <= 50) {
      dbNotInExcel.forEach(name => console.log(`  - ${name}`));
    } else if (dbNotInExcel.length > 50) {
      console.log('(Too many to list - showing first 20)');
      dbNotInExcel.slice(0, 20).forEach(name => console.log(`  - ${name}`));
    }
    
  } catch (error) {
    console.error('Error in detailed comparison:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  detailedComparison()
    .then(() => {
      console.log('\nDetailed comparison completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Detailed comparison failed:', error);
      process.exit(1);
    });
}

module.exports = { detailedComparison };

