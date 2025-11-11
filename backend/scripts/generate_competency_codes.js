#!/usr/bin/env node

/**
 * Generate Competency Codes Script
 * 
 * Generates unique codes for all existing competencies that don't have codes yet
 * Format: COMP-{SEQUENCE} (e.g., COMP-001, COMP-002)
 * 
 * This script can be run multiple times safely - it only generates codes for competencies without codes
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Generate a suggested code based on type and family
function generateSuggestedCode(type, family, sequence) {
  // Get type prefix (first 3-4 chars)
  const typePrefix = type.substring(0, 4).toUpperCase();
  
  // Get family prefix (first 3-4 chars, remove spaces/special chars)
  const familyPrefix = family
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 4)
    .toUpperCase();
  
  // Format: TYPE-FAMILY-{SEQUENCE}
  // e.g., TECH-ICT-001, NON-LEAD-001
  const code = `${typePrefix}-${familyPrefix}-${String(sequence).padStart(3, '0')}`;
  return code;
}

// Generate simple sequential code
function generateSimpleCode(sequence) {
  return `COMP-${String(sequence).padStart(3, '0')}`;
}

async function generateCompetencyCodes() {
  try {
    console.log('Generating competency codes for existing competencies...\n');
    
    // Get all competencies without codes, ordered by type, family, name
    const competenciesWithoutCodes = await prisma.competency.findMany({
      where: {
        code: null
      },
      orderBy: [
        { type: 'asc' },
        { family: 'asc' },
        { name: 'asc' }
      ]
    });
    
    console.log(`Found ${competenciesWithoutCodes.length} competencies without codes\n`);
    
    if (competenciesWithoutCodes.length === 0) {
      console.log('✅ All competencies already have codes!');
      return;
    }
    
    // Get all existing codes to avoid duplicates
    const existingCodes = await prisma.competency.findMany({
      where: {
        code: { not: null }
      },
      select: {
        code: true
      }
    });
    
    const existingCodeSet = new Set(existingCodes.map(c => c.code));
    
    // Group by type-family for sequential numbering within groups
    const groups = {};
    competenciesWithoutCodes.forEach(comp => {
      const groupKey = `${comp.type}-${comp.family}`;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(comp);
    });
    
    let totalGenerated = 0;
    let totalSkipped = 0;
    
    // Generate codes for each group
    for (const [groupKey, comps] of Object.entries(groups)) {
      console.log(`\nProcessing group: ${groupKey} (${comps.length} competencies)`);
      
      let sequence = 1;
      for (const comp of comps) {
        // Try to generate a code
        let suggestedCode = generateSuggestedCode(comp.type, comp.family, sequence);
        
        // If code exists, try simple format
        if (existingCodeSet.has(suggestedCode)) {
          suggestedCode = generateSimpleCode(totalGenerated + sequence);
        }
        
        // If still exists, keep incrementing
        let attempts = 0;
        while (existingCodeSet.has(suggestedCode) && attempts < 100) {
          sequence++;
          suggestedCode = generateSuggestedCode(comp.type, comp.family, sequence);
          attempts++;
        }
        
        if (attempts >= 100) {
          // Fallback to simple code
          suggestedCode = generateSimpleCode(totalGenerated + sequence);
          while (existingCodeSet.has(suggestedCode)) {
            totalGenerated++;
            suggestedCode = generateSimpleCode(totalGenerated + sequence);
          }
        }
        
        // Update competency with code
        try {
          await prisma.competency.update({
            where: { id: comp.id },
            data: { code: suggestedCode }
          });
          
          existingCodeSet.add(suggestedCode);
          console.log(`  ✓ ${comp.name} → ${suggestedCode}`);
          totalGenerated++;
          sequence++;
        } catch (error) {
          console.error(`  ✗ Error updating ${comp.name}: ${error.message}`);
          totalSkipped++;
        }
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Total competencies processed: ${competenciesWithoutCodes.length}`);
    console.log(`Codes generated: ${totalGenerated}`);
    console.log(`Skipped (errors): ${totalSkipped}`);
    console.log();
    
    // Verify all have codes now
    const remaining = await prisma.competency.count({
      where: { code: null }
    });
    
    if (remaining === 0) {
      console.log('✅ All competencies now have codes!');
    } else {
      console.log(`⚠️  ${remaining} competencies still without codes`);
    }
    
  } catch (error) {
    console.error('Error generating competency codes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

generateCompetencyCodes();

