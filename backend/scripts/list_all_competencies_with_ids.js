#!/usr/bin/env node

/**
 * List All Competencies with IDs
 * 
 * Exports all competencies with their IDs, names, types, and families
 * for adding to Excel file
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllCompetencies() {
  try {
    // Get all competencies from database
    const competencies = await prisma.competency.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        family: true,
        definition: true,
        related_division: true,
        isActive: true
      },
      orderBy: [
        { type: 'asc' },
        { family: 'asc' },
        { name: 'asc' }
      ]
    });
    
    console.log('='.repeat(100));
    console.log(`TOTAL COMPETENCIES: ${competencies.length}`);
    console.log('='.repeat(100));
    console.log();
    
    // Group by type and family for better readability
    const grouped = {};
    competencies.forEach(comp => {
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
      console.log('-'.repeat(100));
      grouped[groupKey].forEach(comp => {
        console.log(`${index}. [${comp.id}] ${comp.name}`);
        index++;
      });
    });
    
    // Also create CSV format for easy Excel import
    console.log('\n' + '='.repeat(100));
    console.log('CSV FORMAT (for Excel):');
    console.log('='.repeat(100));
    console.log('ID,Name,Type,Family,Definition,Division,IsActive');
    competencies.forEach(comp => {
      const definition = (comp.definition || '').replace(/"/g, '""'); // Escape quotes for CSV
      const division = comp.related_division || '';
      console.log(`"${comp.id}","${comp.name}","${comp.type}","${comp.family}","${definition}","${division}","${comp.isActive}"`);
    });
    
    // Simple list with IDs
    console.log('\n' + '='.repeat(100));
    console.log('SIMPLE LIST (ID | Name):');
    console.log('='.repeat(100));
    competencies.forEach((comp, idx) => {
      console.log(`${idx + 1}. ${comp.id} | ${comp.name} (${comp.type} - ${comp.family})`);
    });
    
    console.log('\n' + '='.repeat(100));
    console.log('SUMMARY:');
    console.log('='.repeat(100));
    console.log(`Total competencies: ${competencies.length}`);
    console.log(`Active: ${competencies.filter(c => c.isActive).length}`);
    console.log(`Inactive: ${competencies.filter(c => !c.isActive).length}`);
    
    // Count by type
    const byType = {};
    competencies.forEach(c => {
      byType[c.type] = (byType[c.type] || 0) + 1;
    });
    console.log('\nBy Type:');
    Object.keys(byType).sort().forEach(type => {
      console.log(`  ${type}: ${byType[type]}`);
    });
    
  } catch (error) {
    console.error('Error listing competencies:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

listAllCompetencies();

