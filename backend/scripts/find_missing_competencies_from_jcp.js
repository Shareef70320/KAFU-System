#!/usr/bin/env node

/**
 * Find Missing Competencies from JCP Mapping File
 * 
 * Compares JobCompetencyProfilesV02.xlsx with database
 * and lists competencies that are in the mapping file but not in the system
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findMissingCompetenciesFromJCP() {
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
    
    // Find the competency name column
    const competencyNameKey = Object.keys(data[0] || {}).find(k => 
      k.toLowerCase().includes('competency') && 
      k.toLowerCase().includes('name')
    );
    
    if (!competencyNameKey) {
      throw new Error('Could not find competency name column in Excel file');
    }
    
    console.log(`Using column: "${competencyNameKey}" for competency names\n`);
    
    // Extract unique competencies from Excel
    const excelCompetencies = [...new Set(data.map(row => {
      const name = String(row[competencyNameKey] || '').trim();
      return name;
    }).filter(Boolean))];
    
    console.log(`Found ${excelCompetencies.length} unique competencies in mapping file\n`);
    
    // Get all competencies from database
    const dbCompetencies = await prisma.competency.findMany({
      select: {
        name: true,
        type: true,
        family: true
      }
    });
    
    console.log(`Found ${dbCompetencies.length} competencies in database\n`);
    
    // Create a set of database competency names (case-insensitive)
    const dbCompetencyNamesLower = new Set(
      dbCompetencies.map(c => c.name.toLowerCase().trim())
    );
    
    // Find missing competencies (case-insensitive comparison)
    const missingCompetencies = excelCompetencies.filter(excelName => {
      const excelLower = excelName.toLowerCase().trim();
      return !dbCompetencyNamesLower.has(excelLower);
    });
    
    // Also find which jobs reference these missing competencies
    const missingCompetencyDetails = missingCompetencies.map(missingName => {
      const rowsWithThisCompetency = data.filter(row => {
        const rowCompetencyName = String(row[competencyNameKey] || '').trim();
        return rowCompetencyName.toLowerCase() === missingName.toLowerCase();
      });
      
      // Find job code column
      const jobCodeKey = Object.keys(data[0] || {}).find(k => 
        k.toLowerCase().includes('job') && 
        (k.toLowerCase().includes('code') || k.toLowerCase().includes('id'))
      );
      
      const jobCodes = [...new Set(rowsWithThisCompetency.map(row => {
        return jobCodeKey ? String(row[jobCodeKey] || '').trim() : null;
      }).filter(Boolean))];
      
      return {
        name: missingName,
        jobCodes: jobCodes,
        rowCount: rowsWithThisCompetency.length
      };
    });
    
    console.log('='.repeat(80));
    console.log(`MISSING COMPETENCIES FROM JCP MAPPING FILE: ${missingCompetencies.length}`);
    console.log('='.repeat(80));
    console.log();
    
    if (missingCompetencies.length === 0) {
      console.log('✅ All competencies in the mapping file are already in the database!');
    } else {
      console.log('The following competencies are in the JCP mapping file but NOT in the database:\n');
      
      missingCompetencyDetails.forEach((comp, idx) => {
        console.log(`${idx + 1}. ${comp.name}`);
        console.log(`   Referenced in ${comp.rowCount} mapping(s)`);
        console.log(`   Used by ${comp.jobCodes.length} job(s): ${comp.jobCodes.slice(0, 5).join(', ')}${comp.jobCodes.length > 5 ? '...' : ''}`);
        console.log();
      });
      
      // Also create a simple list
      console.log('='.repeat(80));
      console.log('SIMPLE LIST (for easy copy-paste):');
      console.log('='.repeat(80));
      missingCompetencies.forEach((comp, idx) => {
        console.log(`${idx + 1}. ${comp}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Total unique competencies in mapping file: ${excelCompetencies.length}`);
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

findMissingCompetenciesFromJCP();

