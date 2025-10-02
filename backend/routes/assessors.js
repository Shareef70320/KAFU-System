const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();

const prisma = new PrismaClient();

// Get assessors for a specific competency
router.get('/competency/:competencyId', async (req, res) => {
  try {
    const { competencyId } = req.params;

    const assessors = await prisma.$queryRaw`
      SELECT 
        ac.id,
        ac.assessor_sid,
        ac.competency_id,
        ac.competency_level,
        ac.created_at,
        e.first_name,
        e.last_name,
        e.email,
        e.job_title,
        e.division,
        c.name as competency_name,
        c.type as competency_type,
        c.family as competency_family
      FROM assessor_competencies ac
      LEFT JOIN employees e ON ac.assessor_sid = e.sid
      LEFT JOIN competencies c ON ac.competency_id = c.id
      WHERE ac.competency_id = ${competencyId}
      ORDER BY e.first_name, e.last_name, ac.competency_level
    `;

    res.json({
      success: true,
      assessors: assessors || []
    });
  } catch (error) {
    console.error('Error fetching assessors for competency:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assessors for competency'
    });
  }
});

// Get all assessor-competency mappings
router.get('/', async (req, res) => {
  try {
    const mappings = await prisma.$queryRaw`
      SELECT 
        ac.id,
        ac.assessor_sid,
        ac.competency_id,
        ac.competency_level,
        ac.created_at,
        e.first_name,
        e.last_name,
        e.email,
        e.job_title,
        e.division,
        c.name as competency_name,
        c.type as competency_type,
        c.family as competency_family
      FROM assessor_competencies ac
      LEFT JOIN employees e ON ac.assessor_sid = e.sid
      LEFT JOIN competencies c ON ac.competency_id = c.id
      ORDER BY e.first_name, e.last_name, c.name, ac.competency_level
    `;

    res.json({
      success: true,
      mappings: mappings
    });
  } catch (error) {
    console.error('Error fetching assessor mappings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assessor mappings'
    });
  }
});

// Get assessors for a specific competency
router.get('/competency/:competencyId', async (req, res) => {
  try {
    const { competencyId } = req.params;
    
    const assessors = await prisma.$queryRaw`
      SELECT 
        ac.id,
        ac.assessor_sid,
        ac.competency_level,
        ac.is_active,
        e.first_name,
        e.last_name,
        e.email,
        e.job_title,
        e.division
      FROM assessor_competencies ac
      LEFT JOIN employees e ON ac.assessor_sid = e.sid
      WHERE ac.competency_id = ${competencyId}
      ORDER BY e.first_name, e.last_name, ac.competency_level
    `;

    res.json({
      success: true,
      assessors: assessors
    });
  } catch (error) {
    console.error('Error fetching assessors for competency:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assessors for competency'
    });
  }
});

// Get competencies for a specific assessor
router.get('/assessor/:assessorSid', async (req, res) => {
  try {
    const { assessorSid } = req.params;
    
    const competencies = await prisma.$queryRaw`
      SELECT 
        ac.id,
        ac.competency_id,
        ac.competency_level,
        ac.is_active,
        c.name as competency_name,
        c.type as competency_type,
        c.family as competency_family,
        c.definition
      FROM assessor_competencies ac
      LEFT JOIN competencies c ON ac.competency_id = c.id
      WHERE ac.assessor_sid = ${assessorSid}
      ORDER BY c.name, ac.competency_level
    `;

    res.json({
      success: true,
      competencies: competencies
    });
  } catch (error) {
    console.error('Error fetching competencies for assessor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch competencies for assessor'
    });
  }
});

// Create new assessor-competency mapping
router.post('/', async (req, res) => {
  try {
    const { assessorSid, competencyId, competencyLevel } = req.body;

    // Validate required fields
    if (!assessorSid || !competencyId || !competencyLevel) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: assessorSid, competencyId, competencyLevel'
      });
    }

    // Validate competency level
    if (!['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'].includes(competencyLevel)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid competency level. Must be BASIC, INTERMEDIATE, ADVANCED, or MASTERY'
      });
    }

    // Check if assessor exists
    const assessor = await prisma.$queryRaw`
      SELECT sid FROM employees WHERE sid = ${assessorSid}
    `;

    if (assessor.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Assessor not found'
      });
    }

    // Check if competency exists
    const competency = await prisma.$queryRaw`
      SELECT id FROM competencies WHERE id = ${competencyId}
    `;

    if (competency.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Competency not found'
      });
    }

    // Create the mapping
    const newMapping = await prisma.$queryRaw`
      INSERT INTO assessor_competencies (id, assessor_sid, competency_id, competency_level)
      VALUES (gen_random_uuid()::text, ${assessorSid}, ${competencyId}, ${competencyLevel})
      RETURNING *
    `;

    res.status(201).json({
      success: true,
      mapping: newMapping[0]
    });
  } catch (error) {
    console.error('Error creating assessor mapping:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'This assessor is already assigned to this competency at this level'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create assessor mapping'
    });
  }
});

// Update assessor-competency mapping
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { competencyLevel, isActive } = req.body;

    // Validate competency level if provided
    if (competencyLevel && !['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'].includes(competencyLevel)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid competency level. Must be BASIC, INTERMEDIATE, ADVANCED, or MASTERY'
      });
    }

    // Build update query dynamically
    let updateFields = [];
    let updateValues = [];

    if (competencyLevel !== undefined) {
      updateFields.push('competency_level = $' + (updateValues.length + 1));
      updateValues.push(competencyLevel);
    }

    if (isActive !== undefined) {
      updateFields.push('is_active = $' + (updateValues.length + 1));
      updateValues.push(isActive);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(parseInt(id));

    const query = `
      UPDATE assessor_competencies 
      SET ${updateFields.join(', ')}
      WHERE id = $${updateValues.length}
      RETURNING *
    `;

    const updatedMapping = await prisma.$queryRawUnsafe(query, ...updateValues);

    if (updatedMapping.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assessor mapping not found'
      });
    }

    res.json({
      success: true,
      mapping: updatedMapping[0]
    });
  } catch (error) {
    console.error('Error updating assessor mapping:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update assessor mapping'
    });
  }
});

// Delete assessor-competency mapping
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedMapping = await prisma.$queryRaw`
      DELETE FROM assessor_competencies 
      WHERE id = ${id}
      RETURNING *
    `;

    if (deletedMapping.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assessor mapping not found'
      });
    }

    res.json({
      success: true,
      message: 'Assessor mapping deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting assessor mapping:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete assessor mapping'
    });
  }
});

// Get statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_mappings,
        COUNT(DISTINCT assessor_sid) as total_assessors,
        COUNT(DISTINCT competency_id) as total_competencies,
        COUNT(*) as total_mappings
      FROM assessor_competencies
    `;

    const levelStats = await prisma.$queryRaw`
      SELECT 
        competency_level,
        COUNT(*) as count
      FROM assessor_competencies
      GROUP BY competency_level
      ORDER BY competency_level
    `;

    // Convert BigInt values to numbers
    const convertedStats = {
      total_mappings: Number(stats[0].total_mappings),
      total_assessors: Number(stats[0].total_assessors),
      total_competencies: Number(stats[0].total_competencies),
      active_mappings: Number(stats[0].active_mappings)
    };

    const convertedLevelStats = levelStats.map(stat => ({
      competency_level: stat.competency_level,
      count: Number(stat.count)
    }));

    res.json({
      success: true,
      stats: {
        ...convertedStats,
        levelBreakdown: convertedLevelStats
      }
    });
  } catch (error) {
    console.error('Error fetching assessor stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assessor statistics'
    });
  }
});

module.exports = router;
