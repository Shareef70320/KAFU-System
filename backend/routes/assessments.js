const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get all assessments with competency and level information
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 1000 } = req.query;
    const offset = (page - 1) * limit;

    const assessments = await prisma.$queryRaw`
      SELECT 
        a.id,
        a.name as title,
        a.description,
        a.competency_id,
        a.competency_level_id,
        a.is_active,
        a.time_limit,
        a.passing_score,
        a.max_attempts,
        a.created_by,
        a.created_at,
        a.updated_at,
        c.name as competency_name,
        c.type as competency_type,
        c.family as competency_family,
        cl.level as level_name,
        cl.title as level_title,
        COUNT(aq.question_id) as question_count
      FROM assessments a
      LEFT JOIN competencies c ON a.competency_id = c.id
      LEFT JOIN competency_levels cl ON a.competency_level_id = cl.id
      LEFT JOIN assessment_questions aq ON a.id = aq.assessment_id
      GROUP BY a.id, a.name, c.name, c.type, c.family, cl.level, cl.title
      ORDER BY a.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;

    const total = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM assessments
    `;

    const totalCount = Number(total[0]?.count || 0);
    res.json({
      success: true,
      assessments: assessments || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assessments' });
  }
});

// Get single assessment with questions
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.$queryRaw`
      SELECT 
        a.id,
        a.name as title,
        a.description,
        a.competency_id,
        a.competency_level_id,
        a.is_active,
        a.time_limit,
        a.passing_score,
        a.max_attempts,
        a.created_by,
        a.created_at,
        a.updated_at,
        c.name as competency_name,
        c.type as competency_type,
        c.family as competency_family,
        cl.level as level_name,
        cl.title as level_title
      FROM assessments a
      LEFT JOIN competencies c ON a.competency_id = c.id
      LEFT JOIN competency_levels cl ON a.competency_level_id = cl.id
      WHERE a.id = ${id}
    `;

    if (!assessment || assessment.length === 0) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }

    // Get questions for this assessment
    const questions = await prisma.$queryRaw`
      SELECT 
        q.id,
        q.text,
        q.type,
        q.points,
        q.explanation,
        aq.order as question_order,
        aq.points as question_points
      FROM assessment_questions aq
      JOIN questions q ON aq.question_id = q.id
      WHERE aq.assessment_id = ${id}
      ORDER BY aq.order
    `;

    res.json({
      success: true,
      assessment: {
        ...assessment[0],
        questions: questions || []
      }
    });
  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assessment' });
  }
});

// Create new assessment
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      competencyId,
      competencyLevelId,
      timeLimit,
      passingScore,
      maxAttempts,
      createdBy
    } = req.body;

    const assessment = await prisma.$queryRaw`
      INSERT INTO assessments (
        name, description, competency_id, competency_level_id, 
        time_limit, passing_score, max_attempts, created_by, 
        is_active, created_at, updated_at
      ) VALUES (
        ${title}, ${description || null}, ${competencyId}, ${competencyLevelId || null},
        ${timeLimit || null}, ${passingScore || 70.0}, ${maxAttempts || null}, ${createdBy || null},
        true, NOW(), NOW()
      ) RETURNING *
    `;

    res.status(201).json({
      success: true,
      assessment: assessment[0]
    });
  } catch (error) {
    console.error('Error creating assessment:', error);
    res.status(500).json({ success: false, error: 'Failed to create assessment' });
  }
});

// Update assessment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      competencyId,
      competencyLevelId,
      timeLimit,
      passingScore,
      maxAttempts,
      isActive
    } = req.body;

    const updateFields = [];
    const updateValues = [];

    if (title !== undefined) {
      updateFields.push(`name = $${updateValues.length + 1}`);
      updateValues.push(title);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${updateValues.length + 1}`);
      updateValues.push(description);
    }
    if (competencyId !== undefined) {
      updateFields.push(`competency_id = $${updateValues.length + 1}`);
      updateValues.push(competencyId);
    }
    if (competencyLevelId !== undefined) {
      updateFields.push(`competency_level_id = $${updateValues.length + 1}`);
      updateValues.push(competencyLevelId);
    }
    if (timeLimit !== undefined) {
      updateFields.push(`time_limit = $${updateValues.length + 1}`);
      updateValues.push(timeLimit);
    }
    if (passingScore !== undefined) {
      updateFields.push(`passing_score = $${updateValues.length + 1}`);
      updateValues.push(passingScore);
    }
    if (maxAttempts !== undefined) {
      updateFields.push(`max_attempts = $${updateValues.length + 1}`);
      updateValues.push(maxAttempts);
    }
    if (isActive !== undefined) {
      updateFields.push(`is_active = $${updateValues.length + 1}`);
      updateValues.push(isActive);
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(parseInt(id));

    const query = `
      UPDATE assessments
      SET ${updateFields.join(', ')}
      WHERE id = $${updateValues.length}
      RETURNING *
    `;

    const updatedAssessment = await prisma.$queryRawUnsafe(query, ...updateValues);

    res.json({
      success: true,
      assessment: updatedAssessment[0]
    });
  } catch (error) {
    console.error('Error updating assessment:', error);
    res.status(500).json({ success: false, error: 'Failed to update assessment' });
  }
});

// Delete assessment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First delete related assessment questions
    await prisma.$queryRaw`
      DELETE FROM assessment_questions WHERE assessment_id = ${id}
    `;

    // Then delete the assessment
    const deletedAssessment = await prisma.$queryRaw`
      DELETE FROM assessments WHERE id = ${id} RETURNING *
    `;

    res.json({
      success: true,
      assessment: deletedAssessment[0]
    });
  } catch (error) {
    console.error('Error deleting assessment:', error);
    res.status(500).json({ success: false, error: 'Failed to delete assessment' });
  }
});

// Get assessment statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive
      FROM assessments
    `;

    const competencyStats = await prisma.$queryRaw`
      SELECT 
        c.name as competency_name,
        COUNT(a.id) as assessment_count
      FROM competencies c
      LEFT JOIN assessments a ON c.id = a.competency_id
      GROUP BY c.id, c.name
      ORDER BY assessment_count DESC
    `;

    res.json({
      success: true,
      stats: stats[0],
      competencyStats: competencyStats || []
    });
  } catch (error) {
    console.error('Error fetching assessment statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

module.exports = router;

