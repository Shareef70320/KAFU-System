const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Get available assessors for a competency and required level
router.get('/assessors', async (req, res) => {
  try {
    const { competencyId, requiredLevel } = req.query;
    
    if (!competencyId || !requiredLevel) {
      return res.status(400).json({ message: 'competencyId and requiredLevel are required' });
    }

    // Define level hierarchy for comparison
    const levelHierarchy = {
      'BASIC': 1,
      'INTERMEDIATE': 2,
      'ADVANCED': 3,
      'MASTERY': 4
    };

    const requiredLevelValue = levelHierarchy[requiredLevel];
    if (!requiredLevelValue) {
      return res.status(400).json({ message: 'Invalid required level' });
    }

    // Find assessors who can evaluate this competency at the required level or higher
    const assessors = await prisma.$queryRaw`
      SELECT 
        ac.id,
        ac.assessor_sid,
        ac.competency_id,
        ac.competency_level,
        ac.is_active,
        e.first_name,
        e.last_name,
        e.email,
        e.job_code
      FROM assessor_competencies ac
      JOIN employees e ON ac.assessor_sid = e.sid
      WHERE ac.competency_id = ${competencyId}
        AND ac.is_active = true
        AND (
          ac.competency_level = 'BASIC' AND ${requiredLevelValue} <= 1 OR
          ac.competency_level = 'INTERMEDIATE' AND ${requiredLevelValue} <= 2 OR
          ac.competency_level = 'ADVANCED' AND ${requiredLevelValue} <= 3 OR
          ac.competency_level = 'MASTERY' AND ${requiredLevelValue} <= 4
        )
      ORDER BY 
        CASE ac.competency_level
          WHEN 'MASTERY' THEN 4
          WHEN 'ADVANCED' THEN 3
          WHEN 'INTERMEDIATE' THEN 2
          WHEN 'BASIC' THEN 1
        END DESC,
        e.first_name ASC
    `;

    // Transform the data to match frontend expectations
    const transformedAssessors = assessors.map(assessor => ({
      id: assessor.id,
      competencyLevel: assessor.competency_level,
      assessor: {
        sid: assessor.assessor_sid,
        firstName: assessor.first_name,
        lastName: assessor.last_name,
        email: assessor.email,
        jobCode: assessor.job_code
      }
    }));

    res.json(transformedAssessors);
  } catch (error) {
    console.error('Error fetching available assessors:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all review requests with filtering
router.get('/requests', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      employeeId = '', 
      assessorId = '', 
      status = '',
      competencyId = ''
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause with proper parameterization
    let whereClause = '';
    const params = [];
    let paramIndex = 1;

    if (employeeId) {
      whereClause += `WHERE rr.employee_id = $${paramIndex}`;
      params.push(employeeId);
      paramIndex++;
    }
    if (assessorId) {
      whereClause += whereClause ? ` AND rr.assessor_id = $${paramIndex}` : `WHERE rr.assessor_id = $${paramIndex}`;
      params.push(assessorId);
      paramIndex++;
    }
    if (status) {
      whereClause += whereClause ? ` AND rr.status = $${paramIndex}::review_status` : `WHERE rr.status = $${paramIndex}::review_status`;
      params.push(status);
      paramIndex++;
    }
    if (competencyId) {
      whereClause += whereClause ? ` AND rr.competency_id = $${paramIndex}` : `WHERE rr.competency_id = $${paramIndex}`;
      params.push(competencyId);
      paramIndex++;
    }

    const [requests, total] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT 
          rr.id,
          rr.employee_id,
          rr.competency_id,
          rr.requested_level,
          rr.assessor_id,
          rr.status,
          rr.review_type,
          rr.requested_date,
          rr.scheduled_date,
          rr.completed_date,
          rr.notes,
          rr.created_at,
          rr.updated_at,
          e.first_name as employee_first_name,
          e.last_name as employee_last_name,
          e.email as employee_email,
          e.job_title as employee_job_title,
          e.division as employee_division,
          a.first_name as assessor_first_name,
          a.last_name as assessor_last_name,
          a.email as assessor_email,
          c.name as competency_name,
          c.family as competency_family
        FROM review_requests rr
        JOIN employees e ON rr.employee_id = e.sid
        LEFT JOIN employees a ON rr.assessor_id = a.sid
        JOIN competencies c ON rr.competency_id = c.id
        ${whereClause}
        ORDER BY rr.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, ...params, take, skip),
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int as count 
        FROM review_requests rr
        ${whereClause}
      `, ...params)
    ]);

    res.json({
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total[0]?.count || 0,
        pages: Math.ceil((total[0]?.count || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching review requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create review request
router.post('/requests', async (req, res) => {
  try {
    const { employeeId, competencyId, requestedLevel, notes } = req.body;

    // Validate required fields
    if (!employeeId || !competencyId || !requestedLevel) {
      return res.status(400).json({ message: 'employeeId, competencyId, and requestedLevel are required' });
    }

    // Validate competency level
    const validLevels = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'];
    if (!validLevels.includes(requestedLevel)) {
      return res.status(400).json({ message: 'Invalid requested level' });
    }

    // Check if employee exists
    const employee = await prisma.$queryRaw`
      SELECT sid, first_name, last_name FROM employees WHERE sid = ${employeeId} LIMIT 1
    `;

    if (!employee || employee.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if competency exists
    const competency = await prisma.$queryRaw`
      SELECT id, name FROM competencies WHERE id = ${competencyId} LIMIT 1
    `;

    if (!competency || competency.length === 0) {
      return res.status(404).json({ message: 'Competency not found' });
    }

    // Check if there's already a pending request for this employee-competency combination
    const existingRequest = await prisma.$queryRaw`
      SELECT id FROM review_requests 
      WHERE employee_id = ${employeeId} 
        AND competency_id = ${competencyId} 
        AND status IN ('REQUESTED', 'SCHEDULED', 'IN_PROGRESS')
      LIMIT 1
    `;

    if (existingRequest && existingRequest.length > 0) {
      return res.status(400).json({ message: 'A pending review request already exists for this competency' });
    }

    // Create review request
    const newRequest = await prisma.$queryRaw`
      INSERT INTO review_requests (
        employee_id, competency_id, requested_level, status, review_type, 
        requested_date, notes, created_at, updated_at
      )
      VALUES (
        ${employeeId}, ${competencyId}, ${requestedLevel}, 'REQUESTED', 'COMPETENCY_REVIEW',
        NOW(), ${notes || null}, NOW(), NOW()
      )
      RETURNING *
    `;

    res.status(201).json({
      message: 'Review request created successfully',
      request: newRequest[0]
    });
  } catch (error) {
    console.error('Error creating review request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Assign assessor to review request
router.put('/requests/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { assessorId, scheduledDate } = req.body;

    if (!assessorId) {
      return res.status(400).json({ message: 'assessorId is required' });
    }

    // Check if request exists
    const request = await prisma.$queryRaw`
      SELECT * FROM review_requests WHERE id = ${id} LIMIT 1
    `;

    if (!request || request.length === 0) {
      return res.status(404).json({ message: 'Review request not found' });
    }

    // Check if assessor exists
    const assessor = await prisma.$queryRaw`
      SELECT sid, first_name, last_name FROM employees WHERE sid = ${assessorId} LIMIT 1
    `;

    if (!assessor || assessor.length === 0) {
      return res.status(404).json({ message: 'Assessor not found' });
    }

    // Check if assessor can evaluate this competency at the requested level or higher
    const levelHierarchy = {
      'BASIC': 1,
      'INTERMEDIATE': 2,
      'ADVANCED': 3,
      'MASTERY': 4
    };

    const requestedLevelValue = levelHierarchy[request[0].requested_level];
    if (!requestedLevelValue) {
      return res.status(400).json({ message: 'Invalid requested level' });
    }

    const assessorCompetency = await prisma.$queryRaw`
      SELECT competency_level FROM assessor_competencies 
      WHERE assessor_sid = ${assessorId} 
        AND competency_id = ${request[0].competency_id}
        AND is_active = true
        AND (
          competency_level = 'BASIC' AND ${requestedLevelValue} <= 1 OR
          competency_level = 'INTERMEDIATE' AND ${requestedLevelValue} <= 2 OR
          competency_level = 'ADVANCED' AND ${requestedLevelValue} <= 3 OR
          competency_level = 'MASTERY' AND ${requestedLevelValue} <= 4
        )
      LIMIT 1
    `;

    if (!assessorCompetency || assessorCompetency.length === 0) {
      return res.status(400).json({ message: 'Assessor is not qualified to evaluate this competency at the requested level' });
    }

    // Update request
    const updatedRequest = await prisma.$queryRaw`
      UPDATE review_requests 
      SET assessor_id = ${assessorId}, 
          scheduled_date = ${scheduledDate ? `${scheduledDate}::timestamp` : 'NULL'},
          status = 'SCHEDULED'::review_status,
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    res.json({
      message: 'Assessor assigned successfully',
      request: updatedRequest[0]
    });
  } catch (error) {
    console.error('Error assigning assessor:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Start review (change status to IN_PROGRESS)
router.put('/requests/:id/start', async (req, res) => {
  try {
    const { id } = req.params;

    const updatedRequest = await prisma.$queryRaw`
      UPDATE review_requests 
      SET status = 'IN_PROGRESS', updated_at = NOW()
      WHERE id = ${id} AND status = 'SCHEDULED'
      RETURNING *
    `;

    if (!updatedRequest || updatedRequest.length === 0) {
      return res.status(404).json({ message: 'Review request not found or not in scheduled status' });
    }

    res.json({
      message: 'Review started successfully',
      request: updatedRequest[0]
    });
  } catch (error) {
    console.error('Error starting review:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Complete review
router.post('/requests/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      currentLevel,
      managerSelectedLevel,
      assessorAssignedLevel,
      assessmentScore,
      assessmentPercentage,
      lastAssessmentDate,
      assessorComments,
      strengths,
      gaps,
      recommendations,
      developmentPlan,
      nextReviewDate,
      gapsList = [],
      recommendationsList = []
    } = req.body;

    // Validate required fields
    if (!assessorAssignedLevel) {
      return res.status(400).json({ message: 'assessorAssignedLevel is required' });
    }

    // Validate competency level
    const validLevels = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'];
    if (!validLevels.includes(assessorAssignedLevel)) {
      return res.status(400).json({ message: 'Invalid assessor assigned level' });
    }

    // Get review request
    const request = await prisma.$queryRaw`
      SELECT * FROM review_requests WHERE id = ${id} LIMIT 1
    `;

    if (!request || request.length === 0) {
      return res.status(404).json({ message: 'Review request not found' });
    }

    // Create performance review
    const performanceReview = await prisma.$queryRaw`
      INSERT INTO performance_reviews (
        review_request_id, employee_id, competency_id, assessor_id,
        current_level, manager_selected_level, assessor_assigned_level,
        assessment_score, assessment_percentage, last_assessment_date,
        assessor_comments, strengths, gaps, recommendations, development_plan,
        review_date, next_review_date, is_finalized, created_at, updated_at
      )
      VALUES (
        ${id}, ${request[0].employee_id}, ${request[0].competency_id}, ${request[0].assessor_id},
        ${currentLevel || null}, ${managerSelectedLevel || null}, ${assessorAssignedLevel},
        ${assessmentScore || null}, ${assessmentPercentage || null}, ${lastAssessmentDate || null},
        ${assessorComments || null}, ${strengths || null}, ${gaps || null}, 
        ${recommendations || null}, ${developmentPlan || null},
        NOW(), ${nextReviewDate || null}, true, NOW(), NOW()
      )
      RETURNING *
    `;

    const reviewId = performanceReview[0].id;

    // Add gaps if provided
    if (gapsList && gapsList.length > 0) {
      for (const gap of gapsList) {
        await prisma.$queryRaw`
          INSERT INTO review_gaps (
            review_id, gap_description, gap_category, priority, 
            is_addressed, notes, created_at, updated_at
          )
          VALUES (
            ${reviewId}, ${gap.description}, ${gap.category || null}, ${gap.priority || 'MEDIUM'},
            false, ${gap.notes || null}, NOW(), NOW()
          )
        `;
      }
    }

    // Add recommendations if provided
    if (recommendationsList && recommendationsList.length > 0) {
      for (const rec of recommendationsList) {
        await prisma.$queryRaw`
          INSERT INTO review_recommendations (
            review_id, recommendation, recommendation_type, priority,
            target_completion_date, is_completed, notes, created_at, updated_at
          )
          VALUES (
            ${reviewId}, ${rec.recommendation}, ${rec.type || null}, ${rec.priority || 'MEDIUM'},
            ${rec.targetDate || null}, false, ${rec.notes || null}, NOW(), NOW()
          )
        `;
      }
    }

    // Update review request status
    await prisma.$queryRaw`
      UPDATE review_requests 
      SET status = 'COMPLETED', completed_date = NOW(), updated_at = NOW()
      WHERE id = ${id}
    `;

    res.status(201).json({
      message: 'Review completed successfully',
      review: performanceReview[0]
    });
  } catch (error) {
    console.error('Error completing review:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get review details
router.get('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const review = await prisma.$queryRaw`
      SELECT 
        pr.*,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name,
        e.email as employee_email,
        e.job_title as employee_job_title,
        e.division as employee_division,
        a.first_name as assessor_first_name,
        a.last_name as assessor_last_name,
        a.email as assessor_email,
        c.name as competency_name,
        c.family as competency_family
      FROM performance_reviews pr
      JOIN employees e ON pr.employee_id = e.sid
      JOIN employees a ON pr.assessor_id = a.sid
      JOIN competencies c ON pr.competency_id = c.id
      WHERE pr.id = ${id}
      LIMIT 1
    `;

    if (!review || review.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Get gaps
    const gaps = await prisma.$queryRaw`
      SELECT * FROM review_gaps WHERE review_id = ${id} ORDER BY created_at
    `;

    // Get recommendations
    const recommendations = await prisma.$queryRaw`
      SELECT * FROM review_recommendations WHERE review_id = ${id} ORDER BY created_at
    `;

    res.json({
      review: review[0],
      gaps,
      recommendations
    });
  } catch (error) {
    console.error('Error fetching review details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get employee's review history
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [reviews, total] = await Promise.all([
      prisma.$queryRaw`
        SELECT 
          pr.*,
          a.first_name as assessor_first_name,
          a.last_name as assessor_last_name,
          c.name as competency_name,
          c.family as competency_family
        FROM performance_reviews pr
        JOIN employees a ON pr.assessor_id = a.sid
        JOIN competencies c ON pr.competency_id = c.id
        WHERE pr.employee_id = ${employeeId}
        ORDER BY pr.review_date DESC
        LIMIT ${take} OFFSET ${skip}
      `,
      prisma.$queryRaw`
        SELECT COUNT(*)::int as count 
        FROM performance_reviews 
        WHERE employee_id = ${employeeId}
      `
    ]);

    res.json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total[0]?.count || 0,
        pages: Math.ceil((total[0]?.count || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching employee review history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
