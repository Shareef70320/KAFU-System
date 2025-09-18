const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function extractJobsFromEmployees() {
  try {
    console.log('🔄 Starting job extraction from employee data...');

    // Get all unique job combinations from employees
    const uniqueJobsQuery = `
      SELECT DISTINCT 
        job_code as code,
        job_title as title,
        grade,
        division,
        unit,
        department,
        section
      FROM employees 
      WHERE job_code IS NOT NULL 
        AND job_code != ''
        AND job_title IS NOT NULL 
        AND job_title != ''
      ORDER BY job_code, job_title, grade
    `;

    const uniqueJobs = await prisma.$queryRawUnsafe(uniqueJobsQuery);
    
    console.log(`📊 Found ${uniqueJobs.length} unique job combinations`);

    // Clear existing jobs table
    console.log('🗑️  Clearing existing jobs...');
    await prisma.$queryRawUnsafe('DELETE FROM jobs');

    // Insert unique jobs into jobs table
    console.log('💾 Inserting jobs into database...');
    
    let insertedCount = 0;
    let skippedCount = 0;

    for (const job of uniqueJobs) {
      try {
        // Check if job already exists (by code, title, grade combination)
        const existingJob = await prisma.$queryRawUnsafe(
          `SELECT id FROM jobs WHERE code = $1 AND title = $2 AND grade = $3`,
          job.code, job.title, job.grade
        );

        if (existingJob.length === 0) {
          // Insert new job
          const insertQuery = `
            INSERT INTO jobs (
              id, code, title, grade, division, unit, 
              department, section, "isActive", "createdAt", "updatedAt"
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
          `;

          const jobId = `JOB-${job.code}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          await prisma.$queryRawUnsafe(
            insertQuery,
            jobId,
            job.code,
            job.title,
            job.grade,
            job.division,
            job.unit,
            job.department,
            job.section,
            true
          );

          insertedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Error inserting job ${job.job_code}:`, error.message);
      }
    }

    console.log(`✅ Job extraction completed!`);
    console.log(`📈 Inserted: ${insertedCount} jobs`);
    console.log(`⏭️  Skipped: ${skippedCount} duplicate jobs`);

    // Verify the results
    const totalJobs = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM jobs');
    console.log(`📊 Total jobs in database: ${totalJobs[0].count}`);

    // Show some sample jobs
    const sampleJobs = await prisma.$queryRawUnsafe(`
      SELECT code, title, grade, division 
      FROM jobs 
      ORDER BY code 
      LIMIT 10
    `);
    
    console.log('\n📋 Sample jobs:');
    sampleJobs.forEach(job => {
      console.log(`  ${job.code} - ${job.title} (Grade: ${job.grade}) - ${job.division}`);
    });

  } catch (error) {
    console.error('❌ Error extracting jobs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the extraction
extractJobsFromEmployees();
