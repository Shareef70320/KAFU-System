#!/usr/bin/env node

/**
 * Clear All Competency Elements Script
 * 
 * Removes all competency elements from all competencies
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearAllCompetencyElements() {
  try {
    console.log('Clearing all competency elements...\n');

    // Get current count
    const currentCount = await prisma.competencyElement.count();
    console.log(`Current competency elements: ${currentCount}\n`);

    if (currentCount === 0) {
      console.log('✅ No competency elements to delete.');
      return;
    }

    // Delete all competency elements
    const result = await prisma.competencyElement.deleteMany({});

    console.log(`✓ Deleted ${result.count} competency elements\n`);

    // Verify deletion
    const remainingCount = await prisma.competencyElement.count();
    console.log(`Remaining competency elements: ${remainingCount}`);

    if (remainingCount === 0) {
      console.log('\n✅ All competency elements cleared successfully!');
    } else {
      console.log(`\n⚠️  Warning: ${remainingCount} elements still remain`);
    }

  } catch (error) {
    console.error('Error clearing competency elements:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllCompetencyElements();

