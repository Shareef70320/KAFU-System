#!/usr/bin/env node

/**
 * Export Competencies with Codes
 * 
 * Exports all competencies with their codes in CSV format for Excel
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function exportCompetencies() {
  try {
    const competencies = await prisma.competency.findMany({
      select: {
        code: true,
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
    
    console.log('Competency Code,ID,Name,Type,Family,Definition,Division,IsActive');
    
    competencies.forEach(comp => {
      const code = comp.code || '';
      const id = comp.id || '';
      const name = (comp.name || '').replace(/"/g, '""');
      const type = comp.type || '';
      const family = (comp.family || '').replace(/"/g, '""');
      const definition = (comp.definition || '').replace(/"/g, '""');
      const division = comp.related_division || '';
      const isActive = comp.isActive ? 'true' : 'false';
      
      console.log(`"${code}","${id}","${name}","${type}","${family}","${definition}","${division}","${isActive}"`);
    });
    
    console.error(`\nTotal: ${competencies.length} competencies exported`);
    
  } catch (error) {
    console.error('Error exporting competencies:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportCompetencies();

