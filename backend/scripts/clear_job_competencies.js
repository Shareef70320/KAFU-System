const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearJobCompetencies() {
  try {
    console.log('Starting to clear job competency mappings...');
    
    // Get count before deletion
    const countBefore = await prisma.jobCompetency.count();
    console.log(`Found ${countBefore} existing mappings`);
    
    if (countBefore === 0) {
      console.log('No mappings to clear.');
      return;
    }
    
    // Delete all mappings
    const result = await prisma.jobCompetency.deleteMany({});
    
    console.log(`\n✓ Successfully deleted ${result.count} job competency mappings`);
    console.log('Job competency profiles have been cleared.');
    
  } catch (error) {
    console.error('Error clearing job competencies:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  clearJobCompetencies()
    .then(() => {
      console.log('Clear operation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Clear operation failed:', error);
      process.exit(1);
    });
}

module.exports = { clearJobCompetencies };

