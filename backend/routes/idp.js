const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to compare levels by rank
const levelRank = (lvl) => {
  if (!lvl) return -1;
  const L = String(lvl).toUpperCase();
  return { BASIC: 0, INTERMEDIATE: 1, ADVANCED: 2, MASTERY: 3 }[L] ?? -1;
};

// POST /api/idp - create IDP entry if gap exists (manager action)
router.post('/', async (req, res) => {
  try {
    const { 
      employeeId, 
      competencyId, 
      interventionId, 
      interventionTypeId,
      customInterventionName,
      targetDate,
      priority,
      notes 
    } = req.body;
    
    if (!employeeId || !competencyId) {
      return res.status(400).json({ success: false, error: 'employeeId and competencyId are required' });
    }

    // Find employee job and required level for this competency
    const jobRow = await prisma.$queryRaw`SELECT job_code FROM employees WHERE TRIM(UPPER(sid)) = TRIM(UPPER(${employeeId})) LIMIT 1`;
    if (!jobRow || jobRow.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    const job = await prisma.$queryRaw`SELECT id, code FROM jobs WHERE TRIM(UPPER(code)) = TRIM(UPPER(${jobRow[0].job_code})) LIMIT 1`;
    if (!job || job.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee job not found' });
    }
    const jc = await prisma.$queryRaw`SELECT "requiredLevel" FROM job_competencies WHERE "jobId" = ${job[0].id} AND "competencyId" = ${competencyId} LIMIT 1`;
    if (!jc || jc.length === 0) {
      return res.status(400).json({ success: false, error: 'No required level mapping for this job and competency' });
    }

    // Get latest completed assessment session for this employee/competency
    const latest = await prisma.$queryRaw`
      SELECT id, system_level, user_confirmed_level, manager_selected_level
      FROM assessment_sessions
      WHERE user_id = ${employeeId} AND competency_id = ${competencyId} AND status = 'COMPLETED'
      ORDER BY completed_at DESC
      LIMIT 1
    `;
    if (!latest || latest.length === 0) {
      return res.status(400).json({ success: false, error: 'Employee has no completed assessment for this competency' });
    }

    const requiredLevel = jc[0].requiredLevel;
    const employeeLevel = latest[0].user_confirmed_level;
    const systemLevel = latest[0].system_level;
    const managerLevel = latest[0].manager_selected_level;

    // Gap rule: effective is manager > employee > system
    const effectiveEmployee = managerLevel || employeeLevel || systemLevel;
    if (levelRank(effectiveEmployee) >= levelRank(requiredLevel)) {
      return res.status(400).json({ success: false, error: 'No gap: employee meets or exceeds required level' });
    }

    // Generate id
    const gen = await prisma.$queryRaw`SELECT gen_random_uuid()::text as id`;
    const id = gen && gen[0] && gen[0].id ? gen[0].id : `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

    await prisma.$queryRaw`
      INSERT INTO idp_entries (
        id, employee_id, competency_id, required_level, employee_level, system_level, manager_level, 
        intervention_id, intervention_type_id, custom_intervention_name, target_date, priority, 
        status, notes, created_at, updated_at
      )
      VALUES (
        ${id}, ${employeeId}, ${competencyId}, ${requiredLevel}, 
        ${employeeLevel || null}, ${systemLevel || null}, ${managerLevel || null}, 
        ${interventionId || null}, ${interventionTypeId || null}, ${customInterventionName || null}, 
        ${targetDate ? new Date(targetDate) : null}, ${priority || 'MEDIUM'}, 'PLANNED', ${notes || null}, NOW(), NOW()
      )
    `;

    res.json({ 
      success: true, 
      idp: { 
        id, employeeId, competencyId, requiredLevel, employeeLevel, systemLevel, managerLevel, 
        interventionId: interventionId || null, interventionTypeId: interventionTypeId || null,
        customInterventionName: customInterventionName || null, targetDate: targetDate || null,
        priority: priority || 'MEDIUM', status: 'PLANNED', notes: notes || null 
      } 
    });
  } catch (error) {
    console.error('Error creating IDP:', error);
    res.status(500).json({ success: false, error: 'Failed to create IDP' });
  }
});

// GET /api/idp/:employeeId - list IDPs for an employee
router.get('/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const rows = await prisma.$queryRaw`
      SELECT 
        i.*, 
        c.name as competency_name,
        ii.title as intervention_title,
        ii.start_date as intervention_start_date,
        ii.location as intervention_location,
        it.name as intervention_type_name,
        ic.name as intervention_category_name
      FROM idp_entries i
      JOIN competencies c ON c.id = i.competency_id
      LEFT JOIN intervention_instances ii ON ii.id = i.intervention_id
      LEFT JOIN intervention_types it ON it.id = i.intervention_type_id OR it.id = ii.intervention_type_id
      LEFT JOIN intervention_categories ic ON ic.id = it.category_id
      WHERE i.employee_id = ${employeeId}
      ORDER BY i.created_at DESC
    `;
    res.json({ success: true, idps: rows });
  } catch (error) {
    console.error('Error fetching IDPs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch IDPs' });
  }
});

module.exports = router;
