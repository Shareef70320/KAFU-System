const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const prisma = new PrismaClient();

async function analyzeExcel() {
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
    
    const filePath = excelPath;
    console.log(`Reading Excel file: ${filePath}\n`);
    
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
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
    
    // Extract unique values
    const jobCodes = [...new Set(data.map(row => {
      const key = Object.keys(row).find(k => 
        k.toLowerCase().includes('job') && 
        (k.toLowerCase().includes('code') || k.toLowerCase().includes('id'))
      );
      return key ? String(row[key]).trim() : null;
    }).filter(Boolean))];
    
    const competencyNames = [...new Set(data.map(row => {
      const key = Object.keys(row).find(k => 
        k.toLowerCase().includes('competency') && 
        k.toLowerCase().includes('name')
      );
      return key ? String(row[key]).trim() : null;
    }).filter(Boolean))];
    
    const levels = [...new Set(data.map(row => {
      const key = Object.keys(row).find(k => 
        k.toLowerCase().includes('level')
      );
      return key ? String(row[key]).trim() : null;
    }).filter(Boolean))];
    
    console.log('=== EXCEL FILE ANALYSIS ===');
    console.log(`Total rows: ${data.length}`);
    console.log(`Unique job codes: ${jobCodes.length}`);
    console.log(`Unique competency names: ${competencyNames.length}`);
    console.log(`Unique levels: ${levels.length}`);
    console.log(`Levels found: ${levels.join(', ')}\n`);
    
    // Get all jobs from database
    const jobs = await prisma.$queryRawUnsafe(`
      SELECT code, title FROM jobs ORDER BY code
    `);
    const dbJobCodes = jobs.map(j => j.code);
    
    // Get all competencies from database
    const competencies = await prisma.$queryRawUnsafe(`
      SELECT name, id FROM competencies ORDER BY name
    `);
    const dbCompetencyNames = competencies.map(c => c.name);
    
    // Find missing job codes
    const missingJobCodes = jobCodes.filter(code => !dbJobCodes.includes(code));
    const foundJobCodes = jobCodes.filter(code => dbJobCodes.includes(code));
    
    // Find missing competency names
    const missingCompetencies = competencyNames.filter(name => !dbCompetencyNames.includes(name));
    const foundCompetencies = competencyNames.filter(name => dbCompetencyNames.includes(name));
    
    console.log('=== DATABASE COMPARISON ===');
    console.log(`\nJobs in database: ${dbJobCodes.length}`);
    console.log(`Jobs found in Excel: ${foundJobCodes.length}`);
    console.log(`Jobs NOT found in database: ${missingJobCodes.length}`);
    
    if (missingJobCodes.length > 0) {
      console.log('\n⚠️  Missing Job Codes:');
      missingJobCodes.forEach(code => {
        const rows = data.filter(row => {
          const key = Object.keys(row).find(k => 
            k.toLowerCase().includes('job') && 
            (k.toLowerCase().includes('code') || k.toLowerCase().includes('id'))
          );
          return key && String(row[key]).trim() === code;
        });
        console.log(`  - ${code} (appears in ${rows.length} row(s))`);
      });
    }
    
    console.log(`\nCompetencies in database: ${dbCompetencyNames.length}`);
    console.log(`Competencies found in Excel: ${foundCompetencies.length}`);
    console.log(`Competencies NOT found in database: ${missingCompetencies.length}`);
    
    if (missingCompetencies.length > 0) {
      console.log('\n⚠️  Missing Competency Names:');
      missingCompetencies.forEach(name => {
        const rows = data.filter(row => {
          const key = Object.keys(row).find(k => 
            k.toLowerCase().includes('competency') && 
            k.toLowerCase().includes('name')
          );
          return key && String(row[key]).trim() === name;
        });
        console.log(`  - ${name} (appears in ${rows.length} row(s))`);
      });
    }
    
    // Analyze level values
    console.log('\n=== LEVEL ANALYSIS ===');
    const validLevels = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'];
    const invalidLevels = levels.filter(l => !validLevels.includes(l?.toUpperCase()));
    
    if (invalidLevels.length > 0) {
      console.log('⚠️  Invalid or unexpected level values:');
      invalidLevels.forEach(level => {
        const rows = data.filter(row => {
          const key = Object.keys(row).find(k => k.toLowerCase().includes('level'));
          return key && String(row[key]).trim() === level;
        });
        console.log(`  - "${level}" (appears in ${rows.length} row(s))`);
      });
    } else {
      console.log('✓ All level values are valid');
    }
    
    // Summary statistics
    console.log('\n=== IMPORT SUMMARY ===');
    const validMappings = data.filter(row => {
      const jobKey = Object.keys(row).find(k => 
        k.toLowerCase().includes('job') && 
        (k.toLowerCase().includes('code') || k.toLowerCase().includes('id'))
      );
      const compKey = Object.keys(row).find(k => 
        k.toLowerCase().includes('competency') && 
        k.toLowerCase().includes('name')
      );
      const levelKey = Object.keys(row).find(k => k.toLowerCase().includes('level'));
      
      const jobCode = jobKey ? String(row[jobKey]).trim() : null;
      const compName = compKey ? String(row[compKey]).trim() : null;
      const level = levelKey ? String(row[levelKey]).trim().toUpperCase() : null;
      
      return jobCode && compName && level && 
             dbJobCodes.includes(jobCode) && 
             dbCompetencyNames.includes(compName) &&
             validLevels.includes(level);
    });
    
    const invalidMappings = data.length - validMappings.length;
    
    console.log(`Total rows in Excel: ${data.length}`);
    console.log(`Valid mappings (can be imported): ${validMappings.length}`);
    console.log(`Invalid mappings (will be skipped): ${invalidMappings.length}`);
    console.log(`\n✓ Ready to import ${validMappings.length} valid mappings`);
    
    if (invalidMappings > 0) {
      console.log(`⚠️  ${invalidMappings} rows will be skipped due to missing jobs/competencies or invalid levels`);
    }
    
  } catch (error) {
    console.error('Error analyzing Excel:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
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

