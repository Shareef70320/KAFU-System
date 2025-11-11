#!/usr/bin/env node

/**
 * Find Missing Competencies Script
 * 
 * Compares CompetencyDictionaryV02.xlsx with database
 * and lists competencies that are in Excel but not in the system
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findMissingCompetencies() {
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
    
    console.log(`Found ${data.length} rows in Excel file\n`);
    
    // Extract unique competencies from Excel
    const excelCompetencies = [];
    const seen = new Set();
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const title = String(row['Competency Title'] || '').trim();
      const type = String(row['Type'] || '').trim();
      const family = String(row['Competency Family'] || '').trim();
      
      if (!title) continue;
      
      // Create unique key: name + type + family
      const key = `${title.toLowerCase()}|${type.toLowerCase()}|${family.toLowerCase()}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        excelCompetencies.push({
          title,
          type,
          family,
          division: String(row['Related Division'] || '').trim() || null,
          definition: String(row['Competency Definition'] || '').trim(),
          row: i + 2 // Excel row number (1-indexed, +1 for header)
        });
      }
    }
    
    console.log(`Found ${excelCompetencies.length} unique competencies in Excel\n`);
    
    // Get all competencies from database
    const dbCompetencies = await prisma.competency.findMany({
      select: {
        name: true,
        type: true,
        family: true
      }
    });
    
    console.log(`Found ${dbCompetencies.length} competencies in database\n`);
    
    // Create a set of database competencies for quick lookup
    // Key format: name|type|family (all lowercase)
    const dbCompetencyKeys = new Set(
      dbCompetencies.map(c => 
        `${c.name.toLowerCase().trim()}|${c.type.toLowerCase()}|${c.family.toLowerCase().trim()}`
      )
    );
    
    // Find missing competencies
    const missingCompetencies = excelCompetencies.filter(excelComp => {
      const key = `${excelComp.title.toLowerCase().trim()}|${excelComp.type.toLowerCase()}|${excelComp.family.toLowerCase().trim()}`;
      return !dbCompetencyKeys.has(key);
    });
    
    console.log('='.repeat(80));
    console.log(`MISSING COMPETENCIES: ${missingCompetencies.length}`);
    console.log('='.repeat(80));
    console.log();
    
    if (missingCompetencies.length === 0) {
      console.log('✅ All competencies from Excel are already in the database!');
    } else {
      console.log('The following competencies are in Excel but NOT in the database:\n');
      
      // Group by type and family for better readability
      const grouped = {};
      missingCompetencies.forEach(comp => {
        const groupKey = `${comp.type} - ${comp.family}`;
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
        }
        grouped[groupKey].push(comp);
      });
      
      // Sort groups
      const sortedGroups = Object.keys(grouped).sort();
      
      let index = 1;
      sortedGroups.forEach(groupKey => {
        console.log(`\n${groupKey}:`);
        console.log('-'.repeat(80));
        grouped[groupKey].forEach(comp => {
          console.log(`${index}. ${comp.title}`);
          if (comp.division) {
            console.log(`   Division: ${comp.division}`);
          }
          if (comp.definition) {
            const shortDef = comp.definition.length > 100 
              ? comp.definition.substring(0, 100) + '...' 
              : comp.definition;
            console.log(`   Definition: ${shortDef}`);
          }
          console.log(`   Excel Row: ${comp.row}`);
          console.log();
          index++;
        });
      });
      
      // Also create a simple list
      console.log('\n' + '='.repeat(80));
      console.log('SIMPLE LIST (for easy copy-paste):');
      console.log('='.repeat(80));
      missingCompetencies.forEach((comp, idx) => {
        console.log(`${idx + 1}. ${comp.title} (${comp.type} - ${comp.family})`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Total competencies in Excel: ${excelCompetencies.length}`);
    console.log(`Total competencies in database: ${dbCompetencies.length}`);
    console.log(`Missing competencies: ${missingCompetencies.length}`);
    console.log(`Already in database: ${excelCompetencies.length - missingCompetencies.length}`);
    console.log();
    
  } catch (error) {
    console.error('Error finding missing competencies:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

findMissingCompetencies();

