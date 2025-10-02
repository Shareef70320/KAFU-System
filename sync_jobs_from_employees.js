const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function syncJobsFromEmployees() {
  try {
    console.log('🔄 Starting job synchronization from employees table...');
    
    // Step 1: Clear existing jobs table
    console.log('🗑️  Clearing existing jobs table...');
    await prisma.$executeRaw`DELETE FROM jobs`;
    console.log('✅ Jobs table cleared');
    
    // Step 2: Get unique job data from employees table
    console.log('📊 Extracting unique job data from employees...');
    const uniqueJobs = await prisma.$queryRaw`
      SELECT DISTINCT 
        job_code,
        job_title,
        division,
        department,
        unit,
        section,
        location,
        grade
      FROM employees 
      WHERE job_code IS NOT NULL 
        AND job_code != ''
        AND job_title IS NOT NULL
      ORDER BY job_code
    `;
    
    console.log(`📋 Found ${uniqueJobs.length} unique jobs to sync`);
    
    // Step 3: Insert jobs into jobs table
    console.log('💾 Inserting jobs into jobs table...');
    let insertedCount = 0;
    let errorCount = 0;
    
    for (const job of uniqueJobs) {
      try {
        // Generate a unique ID for the job
        const jobId = `JOB-${job.job_code}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        await prisma.$executeRaw`
          INSERT INTO jobs (
            id,
            title,
            code,
            unit,
            division,
            department,
            section,
            location,
            "isActive",
            "createdAt",
            "updatedAt"
          ) VALUES (
            ${jobId},
            ${job.job_title || 'N/A'},
            ${job.job_code},
            ${job.unit || 'N/A'},
            ${job.division || 'N/A'},
            ${job.department || 'N/A'},
            ${job.section || 'N/A'},
            ${job.location || 'N/A'},
            true,
            NOW(),
            NOW()
          )
        `;
        
        insertedCount++;
        
        if (insertedCount % 50 === 0) {
          console.log(`   📝 Inserted ${insertedCount}/${uniqueJobs.length} jobs...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error inserting job ${job.job_code}:`, error.message);
      }
    }
    
    console.log(`✅ Job synchronization completed!`);
    console.log(`   📊 Total jobs processed: ${uniqueJobs.length}`);
    console.log(`   ✅ Successfully inserted: ${insertedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    // Step 4: Verify the sync
    console.log('🔍 Verifying synchronization...');
    const jobCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM jobs`;
    const employeeJobCount = await prisma.$queryRaw`SELECT COUNT(DISTINCT job_code) as count FROM employees WHERE job_code IS NOT NULL AND job_code != ''`;
    
    console.log(`📊 Jobs table count: ${jobCount[0].count}`);
    console.log(`📊 Unique employee job codes: ${employeeJobCount[0].count}`);
    
    if (jobCount[0].count === employeeJobCount[0].count) {
      console.log('🎉 Synchronization successful! Job counts match.');
    } else {
      console.log('⚠️  Warning: Job counts do not match. Please review.');
    }
    
    // Step 5: Show sample of synced jobs
    console.log('📋 Sample of synced jobs:');
    const sampleJobs = await prisma.$queryRaw`
      SELECT code, title, division, department 
      FROM jobs 
      ORDER BY code 
      LIMIT 5
    `;
    
    sampleJobs.forEach(job => {
      console.log(`   ${job.code} - ${job.title} (${job.division})`);
    });
    
  } catch (error) {
    console.error('❌ Error during job synchronization:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the synchronization
syncJobsFromEmployees();
