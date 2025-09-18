const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Get all job criticality criteria
router.get('/', async (req, res) => {
  try {
    const criteria = await prisma.$queryRaw`
      SELECT * FROM job_criticality_criteria 
      WHERE is_active = true 
      ORDER BY id ASC
    `;
    
    res.json({
      success: true,
      criteria
    });
  } catch (error) {
    console.error('Error fetching job criticality criteria:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job criticality criteria',
      error: error.message
    });
  }
});

// Update job criticality criteria
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { definition, weight } = req.body;

    // Validate input
    if (weight !== undefined && (weight < 0 || weight > 1)) {
      return res.status(400).json({
        success: false,
        message: 'Weight must be between 0 and 1'
      });
    }

    const updatedCriteria = await prisma.$queryRaw`
      UPDATE job_criticality_criteria 
      SET definition = ${definition || ''}, 
          weight = ${weight !== undefined ? weight : 0},
          updated_at = NOW()
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    res.json({
      success: true,
      criteria: updatedCriteria[0],
      message: 'Criteria updated successfully'
    });
  } catch (error) {
    console.error('Error updating job criticality criteria:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update criteria',
      error: error.message
    });
  }
});

// Update multiple criteria at once
router.put('/bulk', async (req, res) => {
  try {
    const { criteria } = req.body;

    if (!Array.isArray(criteria)) {
      return res.status(400).json({
        success: false,
        message: 'Criteria must be an array'
      });
    }

    const updatePromises = criteria.map(criterion => 
      prisma.$queryRaw`
        UPDATE job_criticality_criteria 
        SET definition = ${criterion.definition || ''}, 
            weight = ${criterion.weight !== undefined ? criterion.weight : 0},
            updated_at = NOW()
        WHERE id = ${criterion.id}
        RETURNING *
      `
    );

    const updatedCriteria = await Promise.all(updatePromises);

    res.json({
      success: true,
      criteria: updatedCriteria.map(result => result[0]),
      message: 'All criteria updated successfully'
    });
  } catch (error) {
    console.error('Error updating job criticality criteria:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update criteria',
      error: error.message
    });
  }
});

module.exports = router;
