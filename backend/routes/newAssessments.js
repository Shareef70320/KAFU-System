const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Get all assessments with competency and question details
router.get('/', async (req, res) => {
  try {
    const assessments = await prisma.$queryRaw`
      SELECT 
        a.id, a.name, a.description, a.competency_id, a.is_active,
        a.shuffle_questions, a.allow_multiple_attempts, a.max_attempts,
        a.show_timer, a.time_limit_minutes, a.force_time_limit,
        a.show_dashboard, a.show_correct_answers, a.show_incorrect_answers,
        a.num_questions::int, a.apply_to_all,
        a.created_at, a.updated_at,
        c.name as competency_name,
        COUNT(aq.question_id)::int as question_count
      FROM assessments a
      LEFT JOIN competencies c ON a.competency_id = c.id
      LEFT JOIN assessment_questions aq ON a.id = aq.assessment_id
      GROUP BY a.id, c.name
      ORDER BY a.created_at DESC
    `;
    
    res.json({ success: true, assessments });
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assessments' });
  }
});

// Get assessment by ID with questions
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get assessment details
    const assessment = await prisma.$queryRaw`
      SELECT 
        a.id, a.name, a.description, a.competency_id, a.is_active,
        a.shuffle_questions, a.allow_multiple_attempts, a.max_attempts,
        a.show_timer, a.time_limit_minutes, a.force_time_limit,
        a.show_dashboard, a.show_correct_answers, a.show_incorrect_answers,
        a.num_questions::int, a.apply_to_all,
        a.created_at, a.updated_at,
        c.name as competency_name
      FROM assessments a
      LEFT JOIN competencies c ON a.competency_id = c.id
      WHERE a.id = ${id}
      LIMIT 1
    `;
    
    if (!assessment || assessment.length === 0) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }
    
    // Get questions for this assessment
    const questions = await prisma.$queryRaw`
      SELECT 
        q.id, q.text, q.type, q.points, q.explanation,
        q.competency_id, q.competency_level_id,
        aq.order_index, aq.points as question_points,
        c.name as competency_name,
        cl.level as competency_level
      FROM assessment_questions aq
      JOIN questions q ON aq.question_id = q.id
      LEFT JOIN competencies c ON q.competency_id = c.id
      LEFT JOIN competency_levels cl ON q.competency_level_id = cl.id
      WHERE aq.assessment_id = ${id}
      ORDER BY aq.order_index ASC
    `;
    
    res.json({ 
      success: true, 
      assessment: assessment[0],
      questions: questions
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
      name, description, competencyId, isActive = true,
      shuffleQuestions = true, allowMultipleAttempts = true, maxAttempts = 3,
      showTimer = true, timeLimitMinutes = 30, forceTimeLimit = false,
      showDashboard = true, showCorrectAnswers = true, showIncorrectAnswers = true,
      numQuestions = 10, applyToAll = false,
      questionIds = []
    } = req.body;
    
    // Validate required fields
    if (!name || (!applyToAll && !competencyId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and competency are required unless applying to all' 
      });
    }
    
    // Create assessment
    const assessment = await prisma.$queryRaw`
      INSERT INTO assessments (
        id, name, description, competency_id, is_active,
        shuffle_questions, allow_multiple_attempts, max_attempts,
        show_timer, time_limit_minutes, force_time_limit,
        show_dashboard, show_correct_answers, show_incorrect_answers,
        num_questions, apply_to_all,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid()::text, ${name}, ${description || null}, ${applyToAll ? null : competencyId}, ${isActive},
        ${shuffleQuestions}, ${allowMultipleAttempts}, ${maxAttempts},
        ${showTimer}, ${timeLimitMinutes}, ${forceTimeLimit},
        ${showDashboard}, ${showCorrectAnswers}, ${showIncorrectAnswers},
        ${numQuestions}, ${applyToAll},
        NOW(), NOW()
      ) RETURNING *
    `;
    
    const assessmentId = assessment[0].id;
    
    // Add questions to assessment
    if (questionIds && questionIds.length > 0) {
      for (let i = 0; i < questionIds.length; i++) {
        await prisma.$queryRaw`
          INSERT INTO assessment_questions (assessment_id, question_id, order_index, points)
          VALUES (${assessmentId}, ${questionIds[i]}, ${i + 1}, 1)
          ON CONFLICT (assessment_id, question_id) DO NOTHING
        `;
      }
    }
    
    res.json({ success: true, assessment: assessment[0] });
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
      name, description, competencyId, isActive,
      shuffleQuestions, allowMultipleAttempts, maxAttempts,
      showTimer, timeLimitMinutes, forceTimeLimit,
      showDashboard, showCorrectAnswers, showIncorrectAnswers,
      numQuestions, applyToAll,
      questionIds
    } = req.body;
    
    // Update assessment
    const updatedAssessment = await prisma.$queryRaw`
      UPDATE assessments SET
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        competency_id = COALESCE(${applyToAll === true ? null : competencyId}, competency_id),
        is_active = COALESCE(${isActive}, is_active),
        shuffle_questions = COALESCE(${shuffleQuestions}, shuffle_questions),
        allow_multiple_attempts = COALESCE(${allowMultipleAttempts}, allow_multiple_attempts),
        max_attempts = COALESCE(${maxAttempts}, max_attempts),
        show_timer = COALESCE(${showTimer}, show_timer),
        time_limit_minutes = COALESCE(${timeLimitMinutes}, time_limit_minutes),
        force_time_limit = COALESCE(${forceTimeLimit}, force_time_limit),
        show_dashboard = COALESCE(${showDashboard}, show_dashboard),
        show_correct_answers = COALESCE(${showCorrectAnswers}, show_correct_answers),
        show_incorrect_answers = COALESCE(${showIncorrectAnswers}, show_incorrect_answers),
        num_questions = COALESCE(${numQuestions}, num_questions),
        apply_to_all = COALESCE(${applyToAll}, apply_to_all),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    
    if (!updatedAssessment || updatedAssessment.length === 0) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }
    
    // Update questions if provided
    if (questionIds !== undefined) {
      // Remove existing questions
      await prisma.$queryRaw`DELETE FROM assessment_questions WHERE assessment_id = ${id}`;
      
      // Add new questions
      if (questionIds && questionIds.length > 0) {
        for (let i = 0; i < questionIds.length; i++) {
          await prisma.$queryRaw`
            INSERT INTO assessment_questions (assessment_id, question_id, order_index, points)
            VALUES (${id}, ${questionIds[i]}, ${i + 1}, 1)
          `;
        }
      }
    }
    
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
    
    // Delete assessment (cascade will handle assessment_questions)
    const deleted = await prisma.$queryRaw`
      DELETE FROM assessments WHERE id = ${id} RETURNING id
    `;
    
    if (!deleted || deleted.length === 0) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }
    
    res.json({ success: true, message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assessment:', error);
    res.status(500).json({ success: false, error: 'Failed to delete assessment' });
  }
});

// Get available questions for a competency
router.get('/questions/available/:competencyId', async (req, res) => {
  try {
    const { competencyId } = req.params;
    
    const questions = await prisma.$queryRaw`
      SELECT 
        q.id, q.text, q.type, q.points, q.explanation,
        q.competency_id, q.competency_level_id,
        c.name as competency_name,
        cl.level as competency_level
      FROM questions q
      LEFT JOIN competencies c ON q.competency_id = c.id
      LEFT JOIN competency_levels cl ON q.competency_level_id = cl.id
      WHERE q.competency_id = ${competencyId} AND q.is_active = true
      ORDER BY q.created_at DESC
    `;
    
    res.json({ success: true, questions });
  } catch (error) {
    console.error('Error fetching available questions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch questions' });
  }
});

module.exports = router;
