#!/usr/bin/env node

/**
 * Sync Jobs from Employees - Updated Version
 * 
 * This script:
 * 1. Extracts unique jobs from employees table (including new fields)
 * 2. Updates existing jobs or creates new ones
 * 3. Sets up the relationship so employees reference jobs
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncJobsFromEmployees() {
  try {
    console.log('='.repeat(80));
    console.log('SYNC JOBS FROM EMPLOYEES (UPDATED)');
    console.log('='.repeat(80));
    
    // Step 1: Get unique job data from employees table (with new fields)
    console.log('\n📊 Extracting unique job data from employees...');
    const uniqueJobs = await prisma.$queryRaw`
      SELECT DISTINCT ON (job_code)
        job_code,
        job_title,
        jcp_code,
        division,
        division1,
        unit,
        department,
        section,
        location,
        grade,
        chief_office,
        position,
        job
      FROM employees 
      WHERE job_code IS NOT NULL 
        AND job_code != ''
        AND job_title IS NOT NULL
      ORDER BY job_code, updated_at DESC
    `;
    
    console.log(`📋 Found ${uniqueJobs.length} unique jobs to sync`);
    
    // Step 2: Sync jobs (update existing or create new)
    console.log('\n💾 Syncing jobs into jobs table...');
    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const jobData of uniqueJobs) {
      try {
        // Check if job exists by code
        const existingJob = await prisma.job.findUnique({
          where: { code: jobData.job_code }
        });
        
        if (existingJob) {
          // Update existing job with latest data from employees
          await prisma.job.update({
            where: { id: existingJob.id },
            data: {
              title: jobData.job_title || existingJob.title,
              unit: jobData.unit || existingJob.unit,
              division: jobData.division || existingJob.division,
              department: jobData.department || existingJob.department,
              section: jobData.section || existingJob.section,
              location: jobData.location || existingJob.location,
              isActive: true
            }
          });
          updatedCount++;
        } else {
          // Create new job
          await prisma.job.create({
            data: {
              title: jobData.job_title || 'N/A',
              code: jobData.job_code,
              unit: jobData.unit || null,
              division: jobData.division || null,
              department: jobData.department || null,
              section: jobData.section || null,
              location: jobData.location || null,
              isActive: true
            }
          });
          insertedCount++;
        }
        
        if ((insertedCount + updatedCount) % 50 === 0) {
          console.log(`   📝 Processed ${insertedCount + updatedCount}/${uniqueJobs.length} jobs...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error processing job ${jobData.job_code}:`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('SYNC SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total unique jobs found: ${uniqueJobs.length}`);
    console.log(`✅ New jobs created: ${insertedCount}`);
    console.log(`🔄 Existing jobs updated: ${updatedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    // Step 3: Verify the sync
    console.log('\n🔍 Verifying synchronization...');
    const jobCount = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM jobs`;
    const employeeJobCount = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT job_code)::int as count 
      FROM employees 
      WHERE job_code IS NOT NULL AND job_code != ''
    `;
    
    console.log(`📊 Jobs in jobs table: ${jobCount[0].count}`);
    console.log(`📊 Unique job codes in employees: ${employeeJobCount[0].count}`);
    
    if (jobCount[0].count >= employeeJobCount[0].count) {
      console.log('✅ Synchronization successful!');
    } else {
      console.log('⚠️  Warning: Some job codes from employees may not be in jobs table.');
    }
    
    // Step 4: Show sample of synced jobs
    console.log('\n📋 Sample of synced jobs:');
    const sampleJobs = await prisma.$queryRaw`
      SELECT code, title, division, department 
      FROM jobs 
      ORDER BY code 
      LIMIT 5
    `;
    
    sampleJobs.forEach(job => {
      console.log(`   ${job.code} - ${job.title} (${job.division || 'N/A'})`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Job sync completed!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ Error during job synchronization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  syncJobsFromEmployees()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { syncJobsFromEmployees };

