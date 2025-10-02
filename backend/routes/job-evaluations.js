const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Get all job evaluations
router.get('/', async (req, res) => {
  try {
    const evaluations = await prisma.$queryRaw`
      SELECT * FROM job_evaluations 
      ORDER BY created_at DESC
    `;
    
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
    
    const evaluation = await prisma.$queryRaw`
      SELECT * FROM job_evaluations 
      WHERE job_id = ${jobId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    res.json({
      success: true,
      evaluation: evaluation[0] || null
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
      evaluatorId,
      decisionMakingPower,
      riskOfAbsence,
      regulatoryResponsibility,
      revenueBudgetImpact,
      talentScarcity,
      numberOfReportees
    } = req.body;

    // Calculate weighted score using current criteria weights
    const criteria = await prisma.$queryRaw`
      SELECT * FROM job_criticality_criteria 
      WHERE is_active = true 
      ORDER BY id ASC
    `;

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
    // With weights 0-100 and ratings 1-5, max possible score is 500 (5 × 100)
    // Thresholds: <=300 = Low, >300 and <450 = Medium, >=450 = High
    let criticalityLevel = 'Low';
    if (weightedScore >= 450) criticalityLevel = 'High';
    else if (weightedScore > 300) criticalityLevel = 'Medium';

    // Check if evaluation exists for this job
    const existingEvaluation = await prisma.$queryRaw`
      SELECT id FROM job_evaluations 
      WHERE job_id = ${jobId}
      LIMIT 1
    `;

    let evaluation;
    if (existingEvaluation.length > 0) {
      // Update existing evaluation
      evaluation = await prisma.$queryRaw`
        UPDATE job_evaluations 
        SET decision_making_power = ${decisionMakingPower || 0},
            risk_of_absence = ${riskOfAbsence || 0},
            regulatory_responsibility = ${regulatoryResponsibility || 0},
            revenue_budget_impact = ${revenueBudgetImpact || 0},
            talent_scarcity = ${talentScarcity || 0},
            number_of_reportees = ${numberOfReportees || 0},
            weighted_score = ${weightedScore},
            criticality_level = ${criticalityLevel},
            evaluator_id = ${evaluatorId || null},
            updated_at = NOW()
        WHERE job_id = ${jobId}
        RETURNING *
      `;
    } else {
      // Create new evaluation
      evaluation = await prisma.$queryRaw`
        INSERT INTO job_evaluations (
          job_id, evaluator_id, decision_making_power, risk_of_absence,
          regulatory_responsibility, revenue_budget_impact, talent_scarcity,
          number_of_reportees, weighted_score, criticality_level
        ) VALUES (
          ${jobId}, ${evaluatorId || null}, ${decisionMakingPower || 0},
          ${riskOfAbsence || 0}, ${regulatoryResponsibility || 0},
          ${revenueBudgetImpact || 0}, ${talentScarcity || 0},
          ${numberOfReportees || 0}, ${weightedScore}, ${criticalityLevel}
        )
        RETURNING *
      `;
    }

    res.json({
      success: true,
      evaluation: evaluation[0],
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
    
    await prisma.$queryRaw`
      DELETE FROM job_evaluations 
      WHERE id = ${parseInt(id)}
    `;
    
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

