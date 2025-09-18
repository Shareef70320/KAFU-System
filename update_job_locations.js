const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Employee locations from the HR data
const employeeLocations = [
  '9', '9A', '9B', 'Al Duqm', 'Fahud', 'Marmul', 
  'Muscat', 'Qarn Alam', 'Salalah', 'Sohar'
];

async function updateJobLocations() {
  try {
    console.log('Starting to update job locations...');
    
    // Get all jobs
    const jobs = await prisma.$queryRawUnsafe('SELECT id, title, division FROM jobs ORDER BY title');
    console.log(`Found ${jobs.length} jobs to update`);
    
    let updatedCount = 0;
    
    // Update each job with a random location from employee locations
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const randomLocation = employeeLocations[i % employeeLocations.length];
      
      await prisma.$queryRawUnsafe(
        'UPDATE jobs SET location = $1 WHERE id = $2',
        randomLocation,
        job.id
      );
      
      updatedCount++;
      console.log(`Updated ${job.title} (${job.division}) -> ${randomLocation}`);
    }
    
    console.log(`\nSuccessfully updated ${updatedCount} jobs with employee locations`);
    
    // Verify the update
    const sampleJobs = await prisma.$queryRawUnsafe(
      'SELECT title, division, location FROM jobs WHERE location IS NOT NULL LIMIT 10'
    );
    
    console.log('\nSample updated jobs:');
    sampleJobs.forEach(job => {
      console.log(`${job.title} (${job.division}) -> ${job.location}`);
    });
    
  } catch (error) {
    console.error('Error updating job locations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateJobLocations();

