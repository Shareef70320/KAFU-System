const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Get all assessors with their competencies
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, competencyId = '', level = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {
      AND: [
        competencyId ? { competency_id: competencyId } : {},
        level ? { competency_level: level } : {},
        { is_active: true }
      ]
    };

    const [assessorCompetencies, total] = await Promise.all([
      prisma.$queryRaw`
        SELECT 
          ac.id,
          ac.assessor_sid,
          ac.competency_id,
          ac.competency_level,
          ac.is_active,
          ac.created_at,
          ac.updated_at,
          e.first_name,
          e.last_name,
          e.email,
          e.job_title,
          e.division,
          c.name as competency_name,
          c.family as competency_family,
          c.type as competency_type
        FROM assessor_competencies ac
        JOIN employees e ON ac.assessor_sid = e.sid
        JOIN competencies c ON ac.competency_id = c.id
        WHERE ac.is_active = true
        ${competencyId ? `AND ac.competency_id = '${competencyId}'` : ''}
        ${level ? `AND ac.competency_level = '${level}'` : ''}
        ORDER BY e.first_name, e.last_name, c.name
        LIMIT ${take} OFFSET ${skip}
      `,
      prisma.$queryRaw`
        SELECT COUNT(*)::int as count 
        FROM assessor_competencies ac
        WHERE ac.is_active = true
        ${competencyId ? `AND ac.competency_id = '${competencyId}'` : ''}
        ${level ? `AND ac.competency_level = '${level}'` : ''}
      `
    ]);

    res.json({
      assessors: assessorCompetencies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total[0]?.count || 0,
        pages: Math.ceil((total[0]?.count || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching assessors:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get assessors for a specific competency and level
router.get('/competency/:competencyId/:level', async (req, res) => {
  try {
    const { competencyId, level } = req.params;

    const assessors = await prisma.$queryRaw`
      SELECT 
        ac.id,
        ac.assessor_sid,
        ac.competency_level,
        e.first_name,
        e.last_name,
        e.email,
        e.job_title,
        e.division,
        c.name as competency_name
      FROM assessor_competencies ac
      JOIN employees e ON ac.assessor_sid = e.sid
      JOIN competencies c ON ac.competency_id = c.id
      WHERE ac.competency_id = ${competencyId}
        AND ac.competency_level = ${level}
        AND ac.is_active = true
      ORDER BY e.first_name, e.last_name
    `;

    res.json({ assessors });
  } catch (error) {
    console.error('Error fetching assessors for competency:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add assessor competency
router.post('/', async (req, res) => {
  try {
    const { assessorSid, competencyId, competencyLevel } = req.body;

    // Validate required fields
    if (!assessorSid || !competencyId || !competencyLevel) {
      return res.status(400).json({ message: 'assessorSid, competencyId, and competencyLevel are required' });
    }

    // Validate competency level
    const validLevels = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'];
    if (!validLevels.includes(competencyLevel)) {
      return res.status(400).json({ message: 'Invalid competency level' });
    }

    // Check if assessor exists
    const assessor = await prisma.$queryRaw`
      SELECT sid, first_name, last_name FROM employees WHERE sid = ${assessorSid} LIMIT 1
    `;

    if (!assessor || assessor.length === 0) {
      return res.status(404).json({ message: 'Assessor not found' });
    }

    // Check if competency exists
    const competency = await prisma.$queryRaw`
      SELECT id, name FROM competencies WHERE id = ${competencyId} LIMIT 1
    `;

    if (!competency || competency.length === 0) {
      return res.status(404).json({ message: 'Competency not found' });
    }

    // Check if assessor-competency combination already exists
    const existing = await prisma.$queryRaw`
      SELECT id FROM assessor_competencies 
      WHERE assessor_sid = ${assessorSid} AND competency_id = ${competencyId} AND competency_level = ${competencyLevel}
      LIMIT 1
    `;

    if (existing && existing.length > 0) {
      return res.status(400).json({ message: 'Assessor competency combination already exists' });
    }

    // Create assessor competency
    const newAssessorCompetency = await prisma.$queryRaw`
      INSERT INTO assessor_competencies (assessor_sid, competency_id, competency_level, is_active, created_at, updated_at)
      VALUES (${assessorSid}, ${competencyId}, ${competencyLevel}, true, NOW(), NOW())
      RETURNING *
    `;

    res.status(201).json({
      message: 'Assessor competency added successfully',
      assessorCompetency: newAssessorCompetency[0]
    });
  } catch (error) {
    console.error('Error adding assessor competency:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update assessor competency
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { competencyLevel, isActive } = req.body;

    // Validate competency level if provided
    if (competencyLevel) {
      const validLevels = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'];
      if (!validLevels.includes(competencyLevel)) {
        return res.status(400).json({ message: 'Invalid competency level' });
      }
    }

    // Build update query
    const updateFields = [];
    if (competencyLevel) updateFields.push(`competency_level = '${competencyLevel}'`);
    if (isActive !== undefined) updateFields.push(`is_active = ${isActive}`);
    updateFields.push('updated_at = NOW()');

    const updatedAssessorCompetency = await prisma.$queryRaw`
      UPDATE assessor_competencies 
      SET ${updateFields.join(', ')}
      WHERE id = ${id}
      RETURNING *
    `;

    if (!updatedAssessorCompetency || updatedAssessorCompetency.length === 0) {
      return res.status(404).json({ message: 'Assessor competency not found' });
    }

    res.json({
      message: 'Assessor competency updated successfully',
      assessorCompetency: updatedAssessorCompetency[0]
    });
  } catch (error) {
    console.error('Error updating assessor competency:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete assessor competency
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedAssessorCompetency = await prisma.$queryRaw`
      DELETE FROM assessor_competencies 
      WHERE id = ${id}
      RETURNING *
    `;

    if (!deletedAssessorCompetency || deletedAssessorCompetency.length === 0) {
      return res.status(404).json({ message: 'Assessor competency not found' });
    }

    res.json({
      message: 'Assessor competency deleted successfully',
      assessorCompetency: deletedAssessorCompetency[0]
    });
  } catch (error) {
    console.error('Error deleting assessor competency:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get assessor statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT assessor_sid) as total_assessors,
        COUNT(*) as total_competency_assignments,
        COUNT(CASE WHEN competency_level = 'BASIC' THEN 1 END) as basic_levels,
        COUNT(CASE WHEN competency_level = 'INTERMEDIATE' THEN 1 END) as intermediate_levels,
        COUNT(CASE WHEN competency_level = 'ADVANCED' THEN 1 END) as advanced_levels,
        COUNT(CASE WHEN competency_level = 'MASTERY' THEN 1 END) as mastery_levels
      FROM assessor_competencies 
      WHERE is_active = true
    `;

    res.json({ stats: stats[0] });
  } catch (error) {
    console.error('Error fetching assessor stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
