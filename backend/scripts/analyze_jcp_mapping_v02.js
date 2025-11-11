const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const prisma = new PrismaClient();

async function analyzeJCPMapping() {
  try {
    // Try multiple possible paths
    const possiblePaths = [
      path.join(__dirname, '../../JobCompetencyProfilesV02.xlsx'),
      path.join(__dirname, '../JobCompetencyProfilesV02.xlsx'),
      '/app/JobCompetencyProfilesV02.xlsx',
      path.join(process.cwd(), 'JobCompetencyProfilesV02.xlsx')
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
      SELECT name, id, type, family FROM competencies ORDER BY name
    `);
    const dbCompetencyNames = competencies.map(c => c.name);
    
    // Find missing job codes
    const missingJobCodes = jobCodes.filter(code => !dbJobCodes.includes(code));
    const foundJobCodes = jobCodes.filter(code => dbJobCodes.includes(code));
    
    // Find missing competency names (case-insensitive comparison)
    const dbCompetencyNamesLower = dbCompetencyNames.map(n => n.toLowerCase().trim());
    const missingCompetencies = competencyNames.filter(name => {
      const nameLower = name.toLowerCase().trim();
      return !dbCompetencyNamesLower.includes(nameLower);
    });
    
    const foundCompetencies = competencyNames.filter(name => {
      const nameLower = name.toLowerCase().trim();
      return dbCompetencyNamesLower.includes(nameLower);
    });
    
    // Check for case/formatting differences
    const caseInsensitiveMatches = competencyNames.filter(name => {
      const nameLower = name.toLowerCase().trim();
      const exactMatch = dbCompetencyNames.includes(name);
      const caseMatch = dbCompetencyNamesLower.includes(nameLower);
      return !exactMatch && caseMatch;
    });
    
    console.log('=== DATABASE COMPARISON ===');
    console.log(`\nJobs in database: ${dbJobCodes.length}`);
    console.log(`Jobs found in Excel: ${foundJobCodes.length}`);
    console.log(`Jobs NOT found in database: ${missingJobCodes.length}`);
    
    if (missingJobCodes.length > 0) {
      console.log('\n⚠️  Missing Job Codes:');
      const missingJobsWithCounts = missingJobCodes.map(code => {
        const rows = data.filter(row => {
          const key = Object.keys(row).find(k => 
            k.toLowerCase().includes('job') && 
            (k.toLowerCase().includes('code') || k.toLowerCase().includes('id'))
          );
          return key && String(row[key]).trim() === code;
        });
        return { code, count: rows.length };
      }).sort((a, b) => b.count - a.count);
      
      missingJobsWithCounts.slice(0, 20).forEach(({ code, count }) => {
        console.log(`  - ${code} (appears in ${count} row(s))`);
      });
      if (missingJobCodes.length > 20) {
        console.log(`  ... and ${missingJobCodes.length - 20} more`);
      }
    }
    
    console.log(`\nCompetencies in database: ${dbCompetencyNames.length}`);
    console.log(`Competencies found in Excel (exact match): ${foundCompetencies.length}`);
    console.log(`Competencies with case/formatting differences: ${caseInsensitiveMatches.length}`);
    console.log(`Competencies NOT found in database: ${missingCompetencies.length}`);
    
    if (caseInsensitiveMatches.length > 0) {
      console.log('\n⚠️  Case/Formatting Differences:');
      caseInsensitiveMatches.slice(0, 10).forEach(excelName => {
        const excelLower = excelName.toLowerCase().trim();
        const dbMatch = dbCompetencyNames.find(dbName => 
          dbName.toLowerCase().trim() === excelLower
        );
        console.log(`  Excel: "${excelName}"`);
        console.log(`  Database: "${dbMatch}"`);
        console.log('');
      });
      if (caseInsensitiveMatches.length > 10) {
        console.log(`  ... and ${caseInsensitiveMatches.length - 10} more`);
      }
    }
    
    if (missingCompetencies.length > 0) {
      console.log('\n⚠️  Missing Competency Names:');
      const missingCompsWithCounts = missingCompetencies.map(name => {
        const rows = data.filter(row => {
          const key = Object.keys(row).find(k => 
            k.toLowerCase().includes('competency') && 
            k.toLowerCase().includes('name')
          );
          return key && String(row[key]).trim() === name;
        });
        return { name, count: rows.length };
      }).sort((a, b) => b.count - a.count);
      
      missingCompsWithCounts.slice(0, 30).forEach(({ name, count }) => {
        console.log(`  - "${name}" (appears in ${count} row(s))`);
      });
      if (missingCompetencies.length > 30) {
        console.log(`  ... and ${missingCompetencies.length - 30} more`);
      }
    }
    
    // Analyze level values
    console.log('\n=== LEVEL ANALYSIS ===');
    const validLevels = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'];
    const invalidLevels = levels.filter(l => {
      if (!l) return false;
      return !validLevels.includes(l.toUpperCase());
    });
    
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
    
    // Check for case variations in levels
    const levelCaseIssues = levels.filter(l => {
      if (!l) return false;
      const upper = l.toUpperCase();
      return validLevels.includes(upper) && l !== upper;
    });
    
    if (levelCaseIssues.length > 0) {
      console.log('\n⚠️  Level case variations (will be normalized):');
      levelCaseIssues.forEach(level => {
        const rows = data.filter(row => {
          const key = Object.keys(row).find(k => k.toLowerCase().includes('level'));
          return key && String(row[key]).trim() === level;
        });
        console.log(`  - "${level}" → "${level.toUpperCase()}" (${rows.length} row(s))`);
      });
    }
    
    // Summary statistics
    console.log('\n=== IMPORT SUMMARY ===');
    
    // Count valid mappings
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
             (dbCompetencyNamesLower.includes(compName.toLowerCase().trim())) &&
             validLevels.includes(level);
    });
    
    const invalidMappings = data.length - validMappings.length;
    
    console.log(`Total rows in Excel: ${data.length}`);
    console.log(`Valid mappings (can be imported): ${validMappings.length}`);
    console.log(`Invalid mappings (will be skipped): ${invalidMappings.length}`);
    console.log(`\n✓ Ready to import ${validMappings.length} valid mappings`);
    
    if (invalidMappings > 0) {
      console.log(`⚠️  ${invalidMappings} rows will be skipped due to:`);
      console.log(`   - Missing jobs: ${missingJobCodes.length} job codes`);
      console.log(`   - Missing competencies: ${missingCompetencies.length} competency names`);
      console.log(`   - Invalid levels: ${invalidLevels.length} level values`);
    }
    
    // Show distribution by job
    console.log('\n=== MAPPING DISTRIBUTION ===');
    const jobMappingCounts = {};
    validMappings.forEach(row => {
      const jobKey = Object.keys(row).find(k => 
        k.toLowerCase().includes('job') && 
        (k.toLowerCase().includes('code') || k.toLowerCase().includes('id'))
      );
      const jobCode = jobKey ? String(row[jobKey]).trim() : null;
      if (jobCode) {
        jobMappingCounts[jobCode] = (jobMappingCounts[jobCode] || 0) + 1;
      }
    });
    
    const sortedJobs = Object.entries(jobMappingCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    console.log('Top 10 jobs by number of competency mappings:');
    sortedJobs.forEach(([code, count]) => {
      const job = jobs.find(j => j.code === code);
      console.log(`  ${code}: ${count} competencies ${job ? `(${job.title})` : ''}`);
    });
    
  } catch (error) {
    console.error('Error analyzing JCP mapping:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  analyzeJCPMapping()
    .then(() => {
      console.log('\nAnalysis completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { analyzeJCPMapping };

