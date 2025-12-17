const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Get all successors for a job
router.get('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const successors = await prisma.$queryRaw`
      SELECT 
        js.*,
        e.sid,
        e.first_name,
        e.last_name,
        e.email,
        e.job_title,
        e.division,
        e.department
      FROM job_successors js
      JOIN employees e ON js.employee_id = e.id
      WHERE js.job_id = ${jobId}
      ORDER BY js.assigned_at DESC
    `;
    
    res.json({
      success: true,
      successors
    });
  } catch (error) {
    console.error('Error fetching job successors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job successors',
      error: error.message
    });
  }
});

// Get all successors (for all jobs)
router.get('/', async (req, res) => {
  try {
    const successors = await prisma.$queryRaw`
      SELECT 
        js.*,
        e.sid,
        e.first_name,
        e.last_name,
        e.email,
        e.job_title,
        e.division,
        e.department,
        j.code as job_code,
        j.title as job_title
      FROM job_successors js
      JOIN employees e ON js.employee_id = e.id
      JOIN jobs j ON js.job_id = j.id
      ORDER BY js.assigned_at DESC
    `;
    
    res.json({
      success: true,
      successors
    });
  } catch (error) {
    console.error('Error fetching successors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch successors',
      error: error.message
    });
  }
});

// Assign one or more successors to a job
router.post('/', async (req, res) => {
  try {
    const { jobId, employeeId, employeeIds, readinessLevel, notes, assignedBy } = req.body;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'Job ID is required'
      });
    }

    const targets = Array.isArray(employeeIds) && employeeIds.length > 0
      ? employeeIds
      : (employeeId ? [employeeId] : []);

    if (!targets.length) {
      return res.status(400).json({
        success: false,
        message: 'At least one Employee ID is required'
      });
    }

    const results = [];

    for (const empId of targets) {
      // Check if successor already exists using raw SQL
      const existing = await prisma.$queryRaw`
        SELECT id FROM job_successors 
        WHERE job_id = ${jobId} AND employee_id = ${empId}
        LIMIT 1
      `;

      if (existing && existing.length > 0) {
        // Update existing
        await prisma.$executeRaw`
          UPDATE job_successors 
          SET readiness_level = ${readinessLevel || null},
              notes = ${notes || null},
              assigned_by = ${assignedBy || null},
              updated_at = NOW()
          WHERE id = ${existing[0].id}
        `;
        
        // Fetch updated record
        const updated = await prisma.$queryRaw`
          SELECT * FROM job_successors WHERE id = ${existing[0].id}
        `;
        results.push(updated[0]);
      } else {
        // Create new
        const newId = await prisma.$queryRaw`
          SELECT gen_random_uuid()::text as id
        `;
        const id = newId[0].id;
        
        await prisma.$executeRaw`
          INSERT INTO job_successors (
            id, job_id, employee_id, readiness_level, notes, assigned_by, assigned_at, created_at, updated_at
          ) VALUES (
            ${id}, ${jobId}, ${empId}, ${readinessLevel || null}, 
            ${notes || null}, ${assignedBy || null}, NOW(), NOW(), NOW()
          )
        `;
        
        // Fetch created record
        const created = await prisma.$queryRaw`
          SELECT * FROM job_successors WHERE id = ${id}
        `;
        results.push(created[0]);
      }
    }

    res.json({
      success: true,
      count: results.length,
      successors: results,
      message: `Successor(s) assigned/updated: ${results.length}`
    });
  } catch (error) {
    console.error('Error assigning successor:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    res.status(500).json({
      success: false,
      message: 'Failed to assign successor',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Remove a successor from a job
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.$queryRaw`
      DELETE FROM job_successors 
      WHERE id = ${id}
    `;
    
    res.json({
      success: true,
      message: 'Successor removed successfully'
    });
  } catch (error) {
    console.error('Error removing successor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove successor',
      error: error.message
    });
  }
});

module.exports = router;

