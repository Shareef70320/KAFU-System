const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMissingJcpCodes() {
  try {
    console.log('Starting to fix missing JCP codes...');
    
    // Find all jobs that have competencies but no JCP code
    const jobsWithCompetenciesButNoJcp = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT j.id, j.code, j.jcp_code
      FROM jobs j
      INNER JOIN job_competencies jc ON jc."jobId" = j.id
      WHERE j.jcp_code IS NULL OR j.jcp_code = ''
      ORDER BY j.code
    `);
    
    console.log(`Found ${jobsWithCompetenciesButNoJcp.length} jobs with competencies but no JCP code`);
    
    if (jobsWithCompetenciesButNoJcp.length === 0) {
      console.log('No jobs need fixing. All jobs with competencies have JCP codes.');
      return;
    }
    
    // Update each job to set JCP code = job code
    let updated = 0;
    let errors = 0;
    
    for (const job of jobsWithCompetenciesButNoJcp) {
      try {
        await prisma.$executeRawUnsafe(`
          UPDATE jobs 
          SET jcp_code = $1
          WHERE id = $2
        `, job.code, job.id);
        
        updated++;
        console.log(`✓ Updated ${job.code}: JCP code set to ${job.code}`);
      } catch (error) {
        errors++;
        console.error(`✗ Error updating ${job.code}:`, error.message);
      }
    }
    
    console.log(`\nCompleted!`);
    console.log(`- Updated: ${updated} jobs`);
    console.log(`- Errors: ${errors} jobs`);
    
  } catch (error) {
    console.error('Error fixing missing JCP codes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixMissingJcpCodes()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

