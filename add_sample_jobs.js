const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sampleJobs = [
  {
    title: 'Chief Executive Officer',
    description: 'Responsible for overall strategic direction and leadership of the organization.',
    code: 'CEO-001',
    unit: 'Executive Office',
    division: 'Corporate',
    department: 'Executive',
    section: 'Leadership'
  },
  {
    title: 'Chief Operating Officer',
    description: 'Oversees daily operations and ensures organizational efficiency.',
    code: 'COO-001',
    unit: 'Operations',
    division: 'Corporate',
    department: 'Operations',
    section: 'Leadership'
  },
  {
    title: 'Chief Financial Officer',
    description: 'Manages financial planning, analysis, and reporting.',
    code: 'CFO-001',
    unit: 'Finance',
    division: 'Corporate',
    department: 'Finance',
    section: 'Leadership'
  },
  {
    title: 'Human Resources Director',
    description: 'Leads HR strategy, talent acquisition, and employee development.',
    code: 'HRD-001',
    unit: 'Human Resources',
    division: 'Corporate',
    department: 'HR & Admin',
    section: 'Management'
  },
  {
    title: 'IT Director',
    description: 'Oversees information technology strategy and infrastructure.',
    code: 'ITD-001',
    unit: 'Information Technology',
    division: 'Corporate',
    department: 'ICT',
    section: 'Management'
  },
  {
    title: 'Operations Manager',
    description: 'Manages daily operational activities and process improvement.',
    code: 'OM-001',
    unit: 'Operations',
    division: 'Operations',
    department: 'Operations',
    section: 'Management'
  },
  {
    title: 'Maintenance Manager',
    description: 'Oversees maintenance operations and equipment reliability.',
    code: 'MM-001',
    unit: 'Maintenance',
    division: 'Operations',
    department: 'Maintenance',
    section: 'Management'
  },
  {
    title: 'Safety Manager',
    description: 'Ensures workplace safety compliance and risk management.',
    code: 'SM-001',
    unit: 'Safety',
    division: 'Operations',
    department: 'HSE',
    section: 'Management'
  },
  {
    title: 'Quality Manager',
    description: 'Maintains quality standards and continuous improvement.',
    code: 'QM-001',
    unit: 'Quality',
    division: 'Operations',
    department: 'Quality',
    section: 'Management'
  },
  {
    title: 'Procurement Manager',
    description: 'Manages purchasing and vendor relationships.',
    code: 'PM-001',
    unit: 'Procurement',
    division: 'Corporate',
    department: 'Finance & Procurement',
    section: 'Management'
  },
  {
    title: 'Marketing Manager',
    description: 'Develops and executes marketing strategies.',
    code: 'MKT-001',
    unit: 'Marketing',
    division: 'Commercial',
    department: 'Commercial',
    section: 'Management'
  },
  {
    title: 'Legal Counsel',
    description: 'Provides legal advice and ensures compliance.',
    code: 'LC-001',
    unit: 'Legal',
    division: 'Corporate',
    department: 'Legal & Regulatory',
    section: 'Professional'
  },
  {
    title: 'Internal Auditor',
    description: 'Conducts internal audits and risk assessments.',
    code: 'IA-001',
    unit: 'Audit',
    division: 'Corporate',
    department: 'Internal Audit',
    section: 'Professional'
  },
  {
    title: 'Senior Engineer',
    description: 'Provides technical expertise and engineering solutions.',
    code: 'SE-001',
    unit: 'Engineering',
    division: 'Technical Services',
    department: 'Technical Services',
    section: 'Professional'
  },
  {
    title: 'Project Manager',
    description: 'Manages projects from initiation to completion.',
    code: 'PRJ-001',
    unit: 'Projects',
    division: 'Operations',
    department: 'Operations',
    section: 'Professional'
  },
  {
    title: 'Financial Analyst',
    description: 'Analyzes financial data and provides insights.',
    code: 'FA-001',
    unit: 'Finance',
    division: 'Corporate',
    department: 'Finance & Procurement',
    section: 'Professional'
  },
  {
    title: 'HR Specialist',
    description: 'Supports HR operations and employee relations.',
    code: 'HRS-001',
    unit: 'Human Resources',
    division: 'Corporate',
    department: 'HR & Admin',
    section: 'Professional'
  },
  {
    title: 'IT Systems Administrator',
    description: 'Maintains IT systems and provides technical support.',
    code: 'SA-001',
    unit: 'Information Technology',
    division: 'Corporate',
    department: 'ICT',
    section: 'Technical'
  },
  {
    title: 'Maintenance Technician',
    description: 'Performs equipment maintenance and repairs.',
    code: 'MT-001',
    unit: 'Maintenance',
    division: 'Operations',
    department: 'Maintenance',
    section: 'Technical'
  },
  {
    title: 'Safety Officer',
    description: 'Implements safety programs and conducts inspections.',
    code: 'SO-001',
    unit: 'Safety',
    division: 'Operations',
    department: 'HSE',
    section: 'Technical'
  },
  {
    title: 'Quality Inspector',
    description: 'Conducts quality inspections and testing.',
    code: 'QI-001',
    unit: 'Quality',
    division: 'Operations',
    department: 'Quality',
    section: 'Technical'
  },
  {
    title: 'Operations Coordinator',
    description: 'Coordinates daily operational activities.',
    code: 'OC-001',
    unit: 'Operations',
    division: 'Operations',
    department: 'Operations',
    section: 'Support'
  },
  {
    title: 'Administrative Assistant',
    description: 'Provides administrative support to management.',
    code: 'AA-001',
    unit: 'Administration',
    division: 'Corporate',
    department: 'HR & Admin',
    section: 'Support'
  },
  {
    title: 'Customer Service Representative',
    description: 'Handles customer inquiries and support requests.',
    code: 'CSR-001',
    unit: 'Customer Service',
    division: 'Commercial',
    department: 'Commercial',
    section: 'Support'
  },
  {
    title: 'Data Entry Clerk',
    description: 'Performs data entry and record keeping tasks.',
    code: 'DEC-001',
    unit: 'Administration',
    division: 'Corporate',
    department: 'HR & Admin',
    section: 'Support'
  }
];

async function addSampleJobs() {
  console.log('🚀 Adding sample jobs...\n');

  try {
    // Clear existing jobs
    console.log('🗑️  Clearing existing jobs...');
    await prisma.job.deleteMany();
    console.log('✅ Existing jobs cleared\n');

    // Add sample jobs
    console.log('📝 Adding sample jobs...');
    for (const job of sampleJobs) {
      await prisma.job.create({
        data: job
      });
      console.log(`✅ Created: ${job.title} (${job.code})`);
    }

    // Get final count
    const finalCount = await prisma.job.count();
    console.log(`\n🎉 Successfully added ${finalCount} jobs!`);

  } catch (error) {
    console.error('❌ Error adding sample jobs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleJobs()
  .then(() => console.log('🎯 All done!'))
  .catch((e) => {
    console.error('Unhandled error:', e);
    process.exit(1);
  });
