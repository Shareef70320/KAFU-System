#!/usr/bin/env node

/**
 * Update Strategy Competencies Type Script
 * 
 * Changes the type of Strategy competencies from NON_TECHNICAL to TECHNICAL
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateStrategyCompetenciesType() {
  try {
    console.log('🔄 Updating Strategy competencies type from NON_TECHNICAL to TECHNICAL...\n');
    
    // Find all NON_TECHNICAL Strategy competencies
    const competencies = await prisma.competency.findMany({
      where: {
        type: 'NON_TECHNICAL',
        family: 'Strategy'
      },
      select: {
        id: true,
        name: true,
        code: true
      }
    });
    
    console.log(`📊 Found ${competencies.length} NON_TECHNICAL Strategy competencies to update\n`);
    
    if (competencies.length === 0) {
      console.log('✅ No competencies to update');
      return;
    }
    
    // Update the type to TECHNICAL
    const result = await prisma.competency.updateMany({
      where: {
        type: 'NON_TECHNICAL',
        family: 'Strategy'
      },
      data: {
        type: 'TECHNICAL'
      }
    });
    
    console.log(`✅ Updated ${result.count} competencies to TECHNICAL type\n`);
    
    // Also update the CompetencyFamily if needed
    const strategyFamily = await prisma.$queryRawUnsafe(`
      SELECT id, name, type 
      FROM competency_families 
      WHERE name = $1
      LIMIT 1
    `, 'Strategy');
    
    if (strategyFamily && strategyFamily.length > 0 && strategyFamily[0].type !== 'TECHNICAL') {
      await prisma.$executeRawUnsafe(`
        UPDATE competency_families 
        SET type = $1, updated_at = CURRENT_TIMESTAMP
        WHERE name = $2
      `, 'TECHNICAL', 'Strategy');
      console.log('✅ Updated Strategy family type to TECHNICAL\n');
    }
    
    // Verify the update
    const updated = await prisma.competency.findMany({
      where: {
        type: 'TECHNICAL',
        family: 'Strategy'
      },
      select: {
        name: true,
        code: true,
        type: true
      }
    });
    
    console.log('📋 Updated Competencies:');
    updated.forEach(c => {
      console.log(`   ✓ ${c.name} [${c.code}] - ${c.type}`);
    });
    
    console.log(`\n✅ Total TECHNICAL Strategy competencies: ${updated.length}`);
    
  } catch (error) {
    console.error('❌ Error updating competencies:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateStrategyCompetenciesType()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

