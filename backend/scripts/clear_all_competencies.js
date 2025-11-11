#!/usr/bin/env node

/**
 * Clear All Competencies Script
 * 
 * This script clears all competencies and their related data:
 * - Competency Levels
 * - Competency Elements
 * - Competency Documents
 * - Competency Assessments
 * - Job Competencies
 * - Questions
 * - Assessments
 * 
 * WARNING: This will delete all competency-related data!
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearAllCompetencies() {
  try {
    console.log('Starting to clear all competencies and related data...\n');
    
    // Get counts before deletion
    const counts = {
      competencies: await prisma.competency.count(),
      levels: await prisma.competencyLevel.count(),
      elements: await prisma.competencyElement.count(),
      documents: await prisma.competencyDocument.count(),
      assessments: await prisma.competencyAssessment.count(),
      jobCompetencies: await prisma.jobCompetency.count(),
      questions: await prisma.question.count(),
      assessments_new: await prisma.assessment.count()
    };
    
    console.log('Current counts:');
    console.log(`  Competencies: ${counts.competencies}`);
    console.log(`  Levels: ${counts.levels}`);
    console.log(`  Elements: ${counts.elements}`);
    console.log(`  Documents: ${counts.documents}`);
    console.log(`  Assessments: ${counts.assessments}`);
    console.log(`  Job Competencies: ${counts.jobCompetencies}`);
    console.log(`  Questions: ${counts.questions}`);
    console.log(`  Assessments (new): ${counts.assessments_new}\n`);
    
    // Delete in order (respecting foreign key constraints)
    console.log('Deleting data...');
    
    // Delete assessments (new) - references competency
    const deletedAssessmentsNew = await prisma.assessment.deleteMany({});
    console.log(`  ✓ Deleted ${deletedAssessmentsNew.count} assessments (new)`);
    
    // Delete questions - references competency
    const deletedQuestions = await prisma.question.deleteMany({});
    console.log(`  ✓ Deleted ${deletedQuestions.count} questions`);
    
    // Delete job competencies - references competency
    const deletedJobCompetencies = await prisma.jobCompetency.deleteMany({});
    console.log(`  ✓ Deleted ${deletedJobCompetencies.count} job competencies`);
    
    // Delete competency assessments - references competency
    const deletedAssessments = await prisma.competencyAssessment.deleteMany({});
    console.log(`  ✓ Deleted ${deletedAssessments.count} competency assessments`);
    
    // Delete competency documents - references competency (cascade)
    const deletedDocuments = await prisma.competencyDocument.deleteMany({});
    console.log(`  ✓ Deleted ${deletedDocuments.count} competency documents`);
    
    // Delete competency elements - references competency (cascade)
    const deletedElements = await prisma.competencyElement.deleteMany({});
    console.log(`  ✓ Deleted ${deletedElements.count} competency elements`);
    
    // Delete competency levels - references competency (cascade)
    const deletedLevels = await prisma.competencyLevel.deleteMany({});
    console.log(`  ✓ Deleted ${deletedLevels.count} competency levels`);
    
    // Finally, delete competencies
    const deletedCompetencies = await prisma.competency.deleteMany({});
    console.log(`  ✓ Deleted ${deletedCompetencies.count} competencies\n`);
    
    // Verify deletion
    const remainingCounts = {
      competencies: await prisma.competency.count(),
      levels: await prisma.competencyLevel.count(),
      elements: await prisma.competencyElement.count()
    };
    
    console.log('Verification:');
    console.log(`  Remaining Competencies: ${remainingCounts.competencies}`);
    console.log(`  Remaining Levels: ${remainingCounts.levels}`);
    console.log(`  Remaining Elements: ${remainingCounts.elements}\n`);
    
    if (remainingCounts.competencies === 0) {
      console.log('✓ All competencies and related data cleared successfully!');
    } else {
      console.log('⚠️  Warning: Some data may still remain');
    }
    
  } catch (error) {
    console.error('Error clearing competencies:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  clearAllCompetencies()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Clear failed:', error);
      process.exit(1);
    });
}

module.exports = { clearAllCompetencies };

