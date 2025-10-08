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
        a.title,
        a.description,
        a."competencyId" as "competencyId",
        a."competencyLevelId" as "competencyLevelId",
        a."isActive" as "isActive",
        a."timeLimit" as "timeLimit",
        a."passingScore" as "passingScore",
        a."maxAttempts" as "maxAttempts",
        a."numberOfQuestions" as "numberOfQuestions",
        a."shuffleQuestions" as "shuffleQuestions",
        a."allowMultipleAttempts" as "allowMultipleAttempts",
        a."showTimer" as "showTimer",
        a."forceTimeLimit" as "forceTimeLimit",
        a."showDashboard" as "showDashboard",
        a."showCorrectAnswers" as "showCorrectAnswers",
        a."showIncorrectAnswers" as "showIncorrectAnswers",
        (a."competencyId" IS NULL) as "applyToAll",
        a."createdBy" as "createdBy",
        a."createdAt" as "createdAt",
        a."updatedAt" as "updatedAt",
        c.name as "competencyName",
        c.type as "competencyType",
        c.family as "competencyFamily",
        cl."level" as "levelName",
        cl.title as "levelTitle",
        COUNT(aq."questionId")::int as "questionCount"
      FROM assessments a
      LEFT JOIN competencies c ON a."competencyId" = c.id
      LEFT JOIN competency_levels cl ON a."competencyLevelId" = cl.id
      LEFT JOIN assessment_questions aq ON a.id = aq."assessmentId"
      GROUP BY a.id, a.title, c.name, c.type, c.family, cl."level", cl.title
      ORDER BY a."createdAt" DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;

    const total = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM assessments
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
        a.title,
        a.description,
        a."competencyId" as "competencyId",
        a."competencyLevelId" as "competencyLevelId",
        a."isActive" as "isActive",
        a."timeLimit" as "timeLimit",
        a."passingScore" as "passingScore",
        a."maxAttempts" as "maxAttempts",
        a."numberOfQuestions" as "numberOfQuestions",
        a."shuffleQuestions" as "shuffleQuestions",
        a."allowMultipleAttempts" as "allowMultipleAttempts",
        a."showTimer" as "showTimer",
        a."forceTimeLimit" as "forceTimeLimit",
        a."showDashboard" as "showDashboard",
        a."showCorrectAnswers" as "showCorrectAnswers",
        a."showIncorrectAnswers" as "showIncorrectAnswers",
        (a."competencyId" IS NULL) as "applyToAll",
        a."createdBy" as "createdBy",
        a."createdAt" as "createdAt",
        a."updatedAt" as "updatedAt",
        c.name as "competencyName",
        c.type as "competencyType",
        c.family as "competencyFamily",
        cl."level" as "levelName",
        cl.title as "levelTitle"
      FROM assessments a
      LEFT JOIN competencies c ON a."competencyId" = c.id
      LEFT JOIN competency_levels cl ON a."competencyLevelId" = cl.id
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
        aq."order" as question_order,
        aq.points as question_points
      FROM assessment_questions aq
      JOIN questions q ON aq."questionId" = q.id
      WHERE aq."assessmentId" = ${id}
      ORDER BY aq."order"
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
      createdBy,
      numberOfQuestions,
      shuffleQuestions,
      allowMultipleAttempts,
      showTimer,
      forceTimeLimit,
      showDashboard,
      showCorrectAnswers,
      showIncorrectAnswers
    } = req.body;

    const assessment = await prisma.$queryRaw`
      INSERT INTO assessments (
        id, title, description, "competencyId", "competencyLevelId", 
        "timeLimit", "passingScore", "maxAttempts", "createdBy", 
        "numberOfQuestions", "shuffleQuestions", "allowMultipleAttempts",
        "showTimer", "forceTimeLimit", "showDashboard", "showCorrectAnswers", "showIncorrectAnswers",
        "isActive", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, ${title}, ${description || null}, ${competencyId}, ${competencyLevelId},
        ${timeLimit || null}, ${passingScore || 70.0}, ${maxAttempts || null}, ${createdBy || null},
        ${numberOfQuestions || 10}, ${shuffleQuestions || true}, ${allowMultipleAttempts || true},
        ${showTimer || true}, ${forceTimeLimit || false}, ${showDashboard || true}, ${showCorrectAnswers || true}, ${showIncorrectAnswers || true},
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
    console.log('PUT /assessments/:id payload', req.body);
    const {
      title,
      description,
      competencyId,
      competencyLevelId,
      timeLimit,
      passingScore,
      maxAttempts,
      isActive,
      numberOfQuestions,
      shuffleQuestions,
      allowMultipleAttempts,
      showTimer,
      forceTimeLimit,
      showDashboard,
      showCorrectAnswers,
      showIncorrectAnswers,
      applyToAll
    } = req.body;

    const updateFields = [];
    const updateValues = [];

    if (title !== undefined) { updateFields.push(`title = $${updateValues.length + 1}`); updateValues.push(title); }
    if (description !== undefined) { updateFields.push(`description = $${updateValues.length + 1}`); updateValues.push(description); }
    // Handle competencyId with applyToAll support
    if (applyToAll !== undefined) {
      updateFields.push(`"competencyId" = $${updateValues.length + 1}`);
      updateValues.push(applyToAll ? null : competencyId);
    } else if (competencyId !== undefined) {
      updateFields.push(`"competencyId" = $${updateValues.length + 1}`); updateValues.push(competencyId);
    }
    if (competencyLevelId !== undefined) { updateFields.push(`"competencyLevelId" = $${updateValues.length + 1}`); updateValues.push(competencyLevelId); }
    if (timeLimit !== undefined) { updateFields.push(`"timeLimit" = $${updateValues.length + 1}`); updateValues.push(timeLimit); }
    if (passingScore !== undefined) { updateFields.push(`"passingScore" = $${updateValues.length + 1}`); updateValues.push(passingScore); }
    if (maxAttempts !== undefined) { updateFields.push(`"maxAttempts" = $${updateValues.length + 1}`); updateValues.push(maxAttempts); }
    if (isActive !== undefined) { updateFields.push(`"isActive" = $${updateValues.length + 1}`); updateValues.push(isActive); }
    if (numberOfQuestions !== undefined) { 
      const numQs = parseInt(numberOfQuestions, 10);
      updateFields.push(`"numberOfQuestions" = $${updateValues.length + 1}`); 
      updateValues.push(Number.isFinite(numQs) ? numQs : 10); 
    }
    if (shuffleQuestions !== undefined) { updateFields.push(`"shuffleQuestions" = $${updateValues.length + 1}`); updateValues.push(shuffleQuestions); }
    if (allowMultipleAttempts !== undefined) { updateFields.push(`"allowMultipleAttempts" = $${updateValues.length + 1}`); updateValues.push(allowMultipleAttempts); }
    if (showTimer !== undefined) { updateFields.push(`"showTimer" = $${updateValues.length + 1}`); updateValues.push(showTimer); }
    if (forceTimeLimit !== undefined) { updateFields.push(`"forceTimeLimit" = $${updateValues.length + 1}`); updateValues.push(forceTimeLimit); }
    if (showDashboard !== undefined) { updateFields.push(`"showDashboard" = $${updateValues.length + 1}`); updateValues.push(showDashboard); }
    if (showCorrectAnswers !== undefined) { updateFields.push(`"showCorrectAnswers" = $${updateValues.length + 1}`); updateValues.push(showCorrectAnswers); }
    if (showIncorrectAnswers !== undefined) { updateFields.push(`"showIncorrectAnswers" = $${updateValues.length + 1}`); updateValues.push(showIncorrectAnswers); }

    updateFields.push(`"updatedAt" = NOW()`);
    updateValues.push(id);

    const query = `
      UPDATE assessments
      SET ${updateFields.join(', ')}
      WHERE id = $${updateValues.length}
      RETURNING *
    `;

    console.log('ASSESSMENT UPDATE FIELDS:', updateFields);
    const updatedAssessment = await prisma.$queryRawUnsafe(query, ...updateValues);
    console.log('Updated assessment row', updatedAssessment && updatedAssessment[0]);

    res.json({ success: true, assessment: updatedAssessment[0] });
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
    await prisma.$queryRaw`DELETE FROM assessment_questions WHERE "assessmentId" = ${id}`;

    // Then delete the assessment
    const deletedAssessment = await prisma.$queryRaw`DELETE FROM assessments WHERE id = ${id} RETURNING *`;

    res.json({ success: true, assessment: deletedAssessment[0] });
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
        COUNT(CASE WHEN "isActive" = true THEN 1 END) as active,
        COUNT(CASE WHEN "isActive" = false THEN 1 END) as inactive
      FROM assessments
    `;

    const competencyStats = await prisma.$queryRaw`
      SELECT 
        c.name as competency_name,
        COUNT(a.id) as assessment_count
      FROM competencies c
      LEFT JOIN assessments a ON c.id = a."competencyId"
      GROUP BY c.id, c.name
      ORDER BY assessment_count DESC
    `;

    res.json({ success: true, stats: stats[0], competencyStats: competencyStats || [] });
  } catch (error) {
    console.error('Error fetching assessment statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

module.exports = router;

