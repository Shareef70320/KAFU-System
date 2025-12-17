const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Get all job evaluations
router.get('/', async (req, res) => {
  try {
    const evaluations = await prisma.jobEvaluation.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      evaluations
    });
  } catch (error) {
    console.error('Error fetching job evaluations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job evaluations',
      error: error.message
    });
  }
});

// Get evaluation by job ID
router.get('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const evaluation = await prisma.jobEvaluation.findFirst({
      where: { jobId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      evaluation: evaluation || null
    });
  } catch (error) {
    console.error('Error fetching job evaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job evaluation',
      error: error.message
    });
  }
});

// Create or update job evaluation
router.post('/', async (req, res) => {
  try {
    const {
      jobId,
      // evaluatorId, // Ignore external evaluatorId for now to avoid FK issues
      decisionMakingPower,
      riskOfAbsence,
      regulatoryResponsibility,
      revenueBudgetImpact,
      talentScarcity,
      numberOfReportees
    } = req.body;

    // Calculate weighted score using current criteria weights
    const criteria = await prisma.jobCriticalityCriteria.findMany({
      where: { is_active: true },
      orderBy: { id: 'asc' }
    });

    // criteria.weight is stored as 0..100 percentages; use directly
    const weights = {
      decisionMakingPower: parseFloat(criteria[0]?.weight || 0),
      riskOfAbsence: parseFloat(criteria[1]?.weight || 0),
      regulatoryResponsibility: parseFloat(criteria[2]?.weight || 0),
      revenueBudgetImpact: parseFloat(criteria[3]?.weight || 0),
      talentScarcity: parseFloat(criteria[4]?.weight || 0),
      numberOfReportees: parseFloat(criteria[5]?.weight || 0)
    };

    const weightedScore = 
      (decisionMakingPower * weights.decisionMakingPower) +
      (riskOfAbsence * weights.riskOfAbsence) +
      (regulatoryResponsibility * weights.regulatoryResponsibility) +
      (revenueBudgetImpact * weights.revenueBudgetImpact) +
      (talentScarcity * weights.talentScarcity) +
      (numberOfReportees * weights.numberOfReportees);

    // Determine criticality level
    // New thresholds: <=250 = Low, >250 and <370 = Medium, >=370 = High
    let criticalityLevel = 'Low';
    if (weightedScore >= 370) {
      criticalityLevel = 'High';
    } else if (weightedScore > 250) {
      criticalityLevel = 'Medium';
    }

    // Resolve evaluator ID: if not provided, fall back to any existing employee (to satisfy FK / NOT NULL)
    let effectiveEvaluatorId = null;
    try {
      const anyEmployee = await prisma.employee.findFirst({
        select: { id: true }
      });
      if (anyEmployee?.id) {
        effectiveEvaluatorId = anyEmployee.id;
      }
    } catch (err) {
      console.warn('Could not resolve fallback evaluatorId:', err.message);
    }

    // Check if evaluation exists for this job
    const existingEvaluation = await prisma.jobEvaluation.findUnique({
      where: { jobId }
    });

    let evaluation;
    if (existingEvaluation) {
      // Update existing evaluation
      evaluation = await prisma.jobEvaluation.update({
        where: { jobId },
        data: {
          decisionMakingPower: decisionMakingPower || 0,
          riskOfAbsence: riskOfAbsence || 0,
          regulatoryResponsibility: regulatoryResponsibility || 0,
          revenueBudgetImpact: revenueBudgetImpact || 0,
          talentScarcity: talentScarcity || 0,
          numberOfReportees: numberOfReportees || 0,
          weightedScore,
          criticalityLevel,
          evaluatorId: effectiveEvaluatorId || existingEvaluation.evaluatorId
        }
      });
    } else {
      // Create new evaluation
      evaluation = await prisma.jobEvaluation.create({
        data: {
          jobId,
          evaluatorId: effectiveEvaluatorId,
          decisionMakingPower: decisionMakingPower || 0,
          riskOfAbsence: riskOfAbsence || 0,
          regulatoryResponsibility: regulatoryResponsibility || 0,
          revenueBudgetImpact: revenueBudgetImpact || 0,
          talentScarcity: talentScarcity || 0,
          numberOfReportees: numberOfReportees || 0,
          weightedScore,
          criticalityLevel
        }
      });
    }

    res.json({
      success: true,
      evaluation,
      message: 'Job evaluation saved successfully'
    });
  } catch (error) {
    console.error('Error saving job evaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save job evaluation',
      error: error.message
    });
  }
});

// Delete job evaluation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.jobEvaluation.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Job evaluation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting job evaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete job evaluation',
      error: error.message
    });
  }
});

module.exports = router;

