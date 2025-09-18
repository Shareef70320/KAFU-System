const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const criteriaData = [
  {
    name: 'Decision-Making Power',
    definition: 'The level of authority and impact a job has on strategic and operational decisions.',
    weight: 20,
    icon: 'Target',
    color: 'blue',
    min_rating: 1,
    max_rating: 5
  },
  {
    name: 'Risk of Absence',
    definition: 'The potential negative impact on operations if the employee in this role is absent.',
    weight: 15,
    icon: 'AlertTriangle',
    color: 'red',
    min_rating: 1,
    max_rating: 5
  },
  {
    name: 'Regulatory Responsibility',
    definition: 'The extent to which the job involves compliance with laws, regulations, and internal policies.',
    weight: 10,
    icon: 'Shield',
    color: 'purple',
    min_rating: 0,
    max_rating: 5
  },
  {
    name: 'Revenue / Budget Impact',
    definition: 'The direct or indirect influence of the job on the organization\'s revenue generation or budget management.',
    weight: 20,
    icon: 'DollarSign',
    color: 'green',
    min_rating: 1,
    max_rating: 5
  },
  {
    name: 'Talent Scarcity',
    definition: 'The difficulty in finding and recruiting qualified individuals for this job role in the market.',
    weight: 15,
    icon: 'UserCheck',
    color: 'orange',
    min_rating: 1,
    max_rating: 5
  },
  {
    name: 'Number of Reportees',
    definition: 'The number of direct and indirect subordinates managed by this job role.',
    weight: 20,
    icon: 'Users',
    color: 'indigo',
    min_rating: 1,
    max_rating: 5
  }
];

async function initializeJobCriticalityCriteria() {
  try {
    console.log('🚀 Initializing Job Criticality Criteria...');

    // Clear existing criteria
    await prisma.jobCriticalityCriteria.deleteMany({});
    console.log('✅ Cleared existing criteria');

    // Insert new criteria
    for (const criterion of criteriaData) {
      await prisma.jobCriticalityCriteria.create({
        data: criterion
      });
      console.log(`✅ Created criterion: ${criterion.name}`);
    }

    console.log('🎉 Job Criticality Criteria initialized successfully!');
    console.log(`📊 Total criteria: ${criteriaData.length}`);
    console.log(`⚖️ Total weight: ${criteriaData.reduce((sum, c) => sum + c.weight, 0)}%`);

  } catch (error) {
    console.error('❌ Error initializing job criticality criteria:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization
initializeJobCriticalityCriteria()
  .then(() => {
    console.log('✅ Initialization completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  });

