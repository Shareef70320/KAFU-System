const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// List templates
router.get('/', async (req, res) => {
  try {
    const templates = await prisma.$queryRaw`
      SELECT 
        at.id, at.name, at.description, at.is_active,
        at.num_questions::int, at.time_limit_minutes::int, at.max_attempts::int,
        at.selection_strategy, at.difficulty_filter, at.question_types,
        at.created_at, at.updated_at,
        COALESCE(json_agg(json_build_object('id', c.id, 'name', c.name)) 
          FILTER (WHERE c.id IS NOT NULL), '[]') as competencies
      FROM assessment_templates at
      LEFT JOIN assessment_template_competencies atc ON at.id = atc.template_id
      LEFT JOIN competencies c ON atc.competency_id = c.id
      GROUP BY at.id
      ORDER BY at.created_at DESC
    `;
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({ success: false, error: 'Failed to list templates' });
  }
});

// Create template
router.post('/', async (req, res) => {
  try {
    const {
      name, description, isActive = true,
      numQuestions = 10, timeLimitMinutes = 30, maxAttempts = 1,
      selectionStrategy = 'RANDOM', difficultyFilter = null, questionTypes = null,
      competencyIds = []
    } = req.body;

    const created = await prisma.$queryRaw`
      INSERT INTO assessment_templates (
        id, name, description, is_active, num_questions, time_limit_minutes,
        max_attempts, selection_strategy, difficulty_filter, question_types,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid()::text, ${name}, ${description || null}, ${isActive},
        ${numQuestions}, ${timeLimitMinutes}, ${maxAttempts}, ${selectionStrategy},
        ${difficultyFilter}, ${questionTypes}, NOW(), NOW()
      ) RETURNING *
    `;

    const templateId = created[0].id;

    for (const compId of competencyIds) {
      await prisma.$queryRaw`
        INSERT INTO assessment_template_competencies (template_id, competency_id)
        VALUES (${templateId}, ${compId})
        ON CONFLICT DO NOTHING
      `;
    }

    res.json({ success: true, template: created[0] });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ success: false, error: 'Failed to create template' });
  }
});

// Get template by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const templates = await prisma.$queryRaw`
      SELECT 
        at.id, at.name, at.description, at.is_active,
        at.num_questions::int, at.time_limit_minutes::int, at.max_attempts::int,
        at.selection_strategy, at.difficulty_filter, at.question_types,
        at.created_at, at.updated_at,
        COALESCE(json_agg(json_build_object('id', c.id, 'name', c.name)) 
          FILTER (WHERE c.id IS NOT NULL), '[]') as competencies
      FROM assessment_templates at
      LEFT JOIN assessment_template_competencies atc ON at.id = atc.template_id
      LEFT JOIN competencies c ON atc.competency_id = c.id
      WHERE at.id = ${id}
      GROUP BY at.id
      LIMIT 1
    `;

    if (!templates || templates.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.json({ success: true, template: templates[0] });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch template' });
  }
});

// Update template
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, isActive,
      numQuestions, timeLimitMinutes, maxAttempts,
      selectionStrategy, difficultyFilter, questionTypes,
      competencyIds
    } = req.body;

    const updated = await prisma.$queryRaw`
      UPDATE assessment_templates SET
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        is_active = COALESCE(${isActive}, is_active),
        num_questions = COALESCE(${numQuestions}, num_questions),
        time_limit_minutes = COALESCE(${timeLimitMinutes}, time_limit_minutes),
        max_attempts = COALESCE(${maxAttempts}, max_attempts),
        selection_strategy = COALESCE(${selectionStrategy}, selection_strategy),
        difficulty_filter = COALESCE(${difficultyFilter}, difficulty_filter),
        question_types = COALESCE(${questionTypes}, question_types),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (competencyIds) {
      // reset and re-add
      await prisma.$queryRaw`DELETE FROM assessment_template_competencies WHERE template_id = ${id}`;
      for (const compId of competencyIds) {
        await prisma.$queryRaw`
          INSERT INTO assessment_template_competencies (template_id, competency_id)
          VALUES (${id}, ${compId})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    res.json({ success: true, template: updated[0] });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ success: false, error: 'Failed to update template' });
  }
});

// Delete template
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.$queryRaw`DELETE FROM assessment_templates WHERE id = ${id}`;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ success: false, error: 'Failed to delete template' });
  }
});

module.exports = router;



