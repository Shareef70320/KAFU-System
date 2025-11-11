#!/usr/bin/env node

/**
 * JCP Mapping V02 Import Script
 * 
 * Imports job competency profiles from JobCompetencyProfilesV02.xlsx
 * - Only imports valid mappings (job exists, competency exists, valid level)
 * - Handles case-insensitive competency matching
 * - Normalizes "Advance" → "ADVANCED"
 * - Skips invalid mappings
 */

const XLSX = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

// Normalize level value
function normalizeLevel(level) {
  if (!level) return null;
  
  const levelUpper = String(level).trim().toUpperCase();
  
  // Handle "Advance" → "ADVANCED"
  if (levelUpper === 'ADVANCE') {
    return 'ADVANCED';
  }
  
  const levelMap = {
    'BASIC': 'BASIC',
    'INTERMEDIATE': 'INTERMEDIATE',
    'ADVANCED': 'ADVANCED',
    'MASTERY': 'MASTERY'
  };
  
  return levelMap[levelUpper] || null;
}

async function importJCPMapping() {
  try {
    // Try multiple possible paths (check V03 first, then V02)
    const possiblePaths = [
      path.join(__dirname, '../../JobCompetencyProfilesV03.xlsx'),
      path.join(__dirname, '../JobCompetencyProfilesV03.xlsx'),
      '/app/JobCompetencyProfilesV03.xlsx',
      path.join(process.cwd(), 'JobCompetencyProfilesV03.xlsx'),
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
    
    console.log(`Found ${data.length} rows in Excel file\n`);
    
    // Get all jobs and competencies from database
    console.log('Loading jobs and competencies from database...');
    const jobs = await prisma.$queryRawUnsafe(`
      SELECT id, code, title FROM jobs ORDER BY code
    `);
    const jobMap = new Map(jobs.map(j => [j.code, j]));
    
    const competencies = await prisma.$queryRawUnsafe(`
      SELECT id, code, name, type, family FROM competencies ORDER BY name
    `);
    
    // Create maps for quick lookup
    const competencyCodeMap = new Map(); // code → competency
    const competencyMap = new Map(); // exact name → competency
    const competencyMapLower = new Map(); // lowercase name → competency
    
    competencies.forEach(c => {
      // Map by code if available
      if (c.code) {
        competencyCodeMap.set(c.code.trim(), c);
      }
      // Map by name
      const name = c.name.trim();
      const nameLower = name.toLowerCase().trim();
      competencyMap.set(name, c);
      if (!competencyMapLower.has(nameLower)) {
        competencyMapLower.set(nameLower, c);
      }
    });
    
    console.log(`Loaded ${jobs.length} jobs and ${competencies.length} competencies\n`);
    
    let imported = 0;
    let skipped = 0;
    const skipReasons = {
      missingJob: 0,
      missingCompetency: 0,
      invalidLevel: 0,
      duplicate: 0
    };
    const skipDetails = [];
    
    // Track existing mappings to avoid duplicates
    const existingMappings = await prisma.jobCompetency.findMany({
      select: {
        jobId: true,
        competencyId: true
      }
    });
    
    const existingMappingSet = new Set(
      existingMappings.map(m => `${m.jobId}_${m.competencyId}`)
    );
    
    console.log('Starting import...\n');
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Extract data from row
        const jobKey = Object.keys(row).find(k => 
          k.toLowerCase().includes('job') && 
          (k.toLowerCase().includes('code') || k.toLowerCase().includes('id'))
        );
        const compCodeKey = Object.keys(row).find(k => 
          (k.toLowerCase().includes('competency') && k.toLowerCase().includes('code')) ||
          (k.toLowerCase() === 'code' && !k.toLowerCase().includes('job'))
        );
        const compKey = Object.keys(row).find(k => 
          k.toLowerCase().includes('competency') && 
          k.toLowerCase().includes('name')
        );
        const levelKey = Object.keys(row).find(k => k.toLowerCase().includes('level'));
        
        const jobCode = jobKey ? String(row[jobKey]).trim() : null;
        const compCode = compCodeKey ? String(row[compCodeKey]).trim() : null;
        const compName = compKey ? String(row[compKey]).trim() : null;
        const level = levelKey ? String(row[levelKey]).trim() : null;
        
        // Validate required fields
        if (!jobCode || (!compCode && !compName) || !level) {
          skipped++;
          skipReasons.invalidLevel++;
          continue;
        }
        
        // Normalize level
        const normalizedLevel = normalizeLevel(level);
        if (!normalizedLevel) {
          skipped++;
          skipReasons.invalidLevel++;
          if (skipDetails.filter(d => d.reason === 'invalidLevel' && d.value === level).length < 5) {
            skipDetails.push({ row: i + 1, reason: 'invalidLevel', value: level });
          }
          continue;
        }
        
        // Find job
        const job = jobMap.get(jobCode);
        if (!job) {
          skipped++;
          skipReasons.missingJob++;
          continue;
        }
        
        // Find competency (try code first, then name)
        let competency = null;
        if (compCode) {
          competency = competencyCodeMap.get(compCode);
        }
        // Fallback to name matching if code not found or not provided
        if (!competency && compName) {
          competency = competencyMap.get(compName);
          if (!competency) {
            const compNameLower = compName.toLowerCase().trim();
            competency = competencyMapLower.get(compNameLower);
          }
        }
        
        if (!competency) {
          skipped++;
          skipReasons.missingCompetency++;
          if (skipDetails.filter(d => d.reason === 'missingCompetency' && d.value === compName).length < 5) {
            skipDetails.push({ row: i + 1, reason: 'missingCompetency', value: compName });
          }
          continue;
        }
        
        // Check for duplicate
        const mappingKey = `${job.id}_${competency.id}`;
        if (existingMappingSet.has(mappingKey)) {
          skipped++;
          skipReasons.duplicate++;
          continue;
        }
        
        // Create mapping
        await prisma.jobCompetency.create({
          data: {
            jobId: job.id,
            competencyId: competency.id,
            requiredLevel: normalizedLevel,
            isRequired: true
          }
        });
        
        existingMappingSet.add(mappingKey);
        imported++;
        
        if (imported % 100 === 0) {
          console.log(`  Imported ${imported} mappings...`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing row ${i + 1}:`, error.message);
        skipped++;
      }
    }
    
    console.log('\n=== IMPORT SUMMARY ===');
    console.log(`Total rows processed: ${data.length}`);
    console.log(`✓ Imported: ${imported}`);
    console.log(`✗ Skipped: ${skipped}`);
    console.log('\nSkip reasons:');
    console.log(`  - Missing job: ${skipReasons.missingJob}`);
    console.log(`  - Missing competency: ${skipReasons.missingCompetency}`);
    console.log(`  - Invalid level: ${skipReasons.invalidLevel}`);
    console.log(`  - Duplicate: ${skipReasons.duplicate}`);
    
    if (skipDetails.length > 0) {
      console.log('\nSample skipped rows:');
      skipDetails.slice(0, 10).forEach(({ row, reason, value }) => {
        console.log(`  Row ${row}: ${reason} - "${value}"`);
      });
    }
    
    // Verify final count
    const finalCount = await prisma.jobCompetency.count();
    console.log(`\nTotal job competency mappings in database: ${finalCount}`);
    
    console.log('\n✓ Import completed successfully!');
    
  } catch (error) {
    console.error('Error importing JCP mapping:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  importJCPMapping()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

module.exports = { importJCPMapping };

