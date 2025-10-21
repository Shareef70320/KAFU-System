const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/progress-attachments');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document and image types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only documents and images are allowed'));
    }
  }
});

// Helper to compare levels by rank
const levelRank = (lvl) => {
  if (!lvl) return -1;
  const L = String(lvl).toUpperCase();
  return { BASIC: 0, INTERMEDIATE: 1, ADVANCED: 2, MASTERY: 3 }[L] ?? -1;
};

// POST /api/idp - create IDP entry if gap exists (manager action)
router.post('/', async (req, res) => {
  try {
    // First, ensure the idp_entries table exists
    try {
      await prisma.$queryRaw`SELECT 1 FROM idp_entries LIMIT 1`;
    } catch (tableError) {
      if (tableError.code === 'P2010' && tableError.meta?.code === '42P01') {
        // Table doesn't exist, create it
        console.log('Creating idp_entries table...');
        await prisma.$queryRaw`
          CREATE TABLE IF NOT EXISTS idp_entries (
            id TEXT PRIMARY KEY,
            employee_id TEXT NOT NULL,
            competency_id TEXT NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
            required_level TEXT NOT NULL,
            employee_level TEXT,
            system_level TEXT,
            manager_level TEXT,
            intervention_id TEXT,
            intervention_type_id TEXT,
            custom_intervention_name TEXT,
            target_date DATE,
            priority TEXT NOT NULL DEFAULT 'MEDIUM',
            status TEXT NOT NULL DEFAULT 'OPEN',
            notes TEXT,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
          )
        `;
        
        // Create indexes
        await prisma.$queryRaw`CREATE INDEX IF NOT EXISTS idx_idp_entries_employee_id ON idp_entries(employee_id)`;
        await prisma.$queryRaw`CREATE INDEX IF NOT EXISTS idx_idp_entries_competency_id ON idp_entries(competency_id)`;
        await prisma.$queryRaw`CREATE INDEX IF NOT EXISTS idx_idp_entries_status ON idp_entries(status)`;
        
        console.log('idp_entries table created successfully');
      } else {
        throw tableError;
      }
    }

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

    // Check if new columns exist, if not use basic insert
    try {
      // Try to insert with all new columns first
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
    } catch (columnError) {
      // If new columns don't exist, use basic insert
      console.log('New columns not available, using basic insert:', columnError.message);
      await prisma.$queryRaw`
        INSERT INTO idp_entries (
          id, employee_id, competency_id, required_level, employee_level, system_level, manager_level, 
          intervention_id, status, notes, created_at, updated_at
        )
        VALUES (
          ${id}, ${employeeId}, ${competencyId}, ${requiredLevel}, 
          ${employeeLevel || null}, ${systemLevel || null}, ${managerLevel || null}, 
          ${interventionId || null}, 'PLANNED', ${notes || null}, NOW(), NOW()
        )
      `;
    }

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
    
    // First, check if the idp_entries table exists
    try {
      await prisma.$queryRaw`SELECT 1 FROM idp_entries LIMIT 1`;
    } catch (tableError) {
      if (tableError.code === 'P2010' && tableError.meta?.code === '42P01') {
        // Table doesn't exist, return empty array
        return res.json({ success: true, idps: [] });
      } else {
        throw tableError;
      }
    }
    
    // Try enhanced query first, fallback to basic query if columns don't exist
    let rows;
    try {
      rows = await prisma.$queryRaw`
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
    } catch (queryError) {
      // Fallback to basic query if new columns don't exist
      console.log('Enhanced query failed, using basic query:', queryError.message);
      rows = await prisma.$queryRaw`
        SELECT 
          i.*, 
          c.name as competency_name
        FROM idp_entries i
        JOIN competencies c ON c.id = i.competency_id
        WHERE i.employee_id = ${employeeId}
        ORDER BY i.created_at DESC
      `;
    }
    res.json({ success: true, idps: rows });
  } catch (error) {
    console.error('Error fetching IDPs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch IDPs' });
  }
});

// PUT /api/idp/:id/progress - update IDP progress (user action)
router.put('/:id/progress', upload.array('attachments', 5), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Handle both JSON and FormData
    let progressPercentage, progressNotes, status, completionDate;
    
    if (req.body.progressPercentage !== undefined) {
      // FormData
      progressPercentage = parseInt(req.body.progressPercentage);
      progressNotes = req.body.progressNotes;
      status = req.body.status;
      completionDate = req.body.completionDate;
    } else {
      // JSON
      progressPercentage = req.body.progressPercentage;
      progressNotes = req.body.progressNotes;
      status = req.body.status;
      completionDate = req.body.completionDate;
    }

    // Validate progress percentage
    if (progressPercentage !== undefined && (progressPercentage < 0 || progressPercentage > 100)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Progress percentage must be between 0 and 100' 
      });
    }

    // Validate status
    const validStatuses = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      });
    }

    // Check if IDP exists
    const existingIdp = await prisma.$queryRaw`
      SELECT id, employee_id, status FROM idp_entries WHERE id = ${id}
    `;

    if (!existingIdp || existingIdp.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'IDP not found' 
      });
    }

    // Handle file attachments
    let attachmentPaths = [];
    let attachmentNames = [];
    
    if (req.files && req.files.length > 0) {
      attachmentPaths = req.files.map(file => `/uploads/progress-attachments/${file.filename}`);
      attachmentNames = req.files.map(file => file.originalname);
    }

    // Prepare update data
    const updateData = {
      last_progress_update: new Date()
    };

    if (progressPercentage !== undefined) {
      updateData.progress_percentage = progressPercentage;
    }

    if (progressNotes !== undefined) {
      updateData.progress_notes = progressNotes;
    }

    if (status) {
      updateData.status = status;
      
      // Set started_date when moving to IN_PROGRESS
      if (status === 'IN_PROGRESS' && existingIdp[0].status === 'PLANNED') {
        updateData.started_date = new Date();
      }
      
      // Set completion_date when moving to COMPLETED
      if (status === 'COMPLETED') {
        updateData.completion_date = completionDate ? new Date(completionDate) : new Date();
        updateData.progress_percentage = 100;
      }
    }

    // Handle attachments (append to existing ones)
    if (attachmentPaths.length > 0) {
      const existingAttachments = existingIdp[0].progress_attachments || [];
      const existingNames = existingIdp[0].attachment_names || [];
      updateData.progress_attachments = [...existingAttachments, ...attachmentPaths];
      updateData.attachment_names = [...existingNames, ...attachmentNames];
    }

    // Update the IDP
    await prisma.$queryRaw`
      UPDATE idp_entries 
      SET 
        progress_percentage = ${updateData.progress_percentage || existingIdp[0].progress_percentage || 0},
        progress_notes = ${updateData.progress_notes || existingIdp[0].progress_notes || null},
        status = ${updateData.status || existingIdp[0].status},
        last_progress_update = ${updateData.last_progress_update},
        started_date = ${updateData.started_date || existingIdp[0].started_date || null},
        completion_date = ${updateData.completion_date || existingIdp[0].completion_date || null},
        progress_attachments = ${updateData.progress_attachments || existingIdp[0].progress_attachments || null},
        attachment_names = ${updateData.attachment_names || existingIdp[0].attachment_names || null},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    res.json({ 
      success: true, 
      message: 'IDP progress updated successfully' 
    });

  } catch (error) {
    console.error('Error updating IDP progress:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update IDP progress' 
    });
  }
});

// GET /api/idp/:id/progress-history - get progress history for an IDP
router.get('/:id/progress-history', async (req, res) => {
  try {
    const { id } = req.params;

    // For now, we'll return the current progress data
    // In a full implementation, you might want a separate progress_history table
    const idpData = await prisma.$queryRaw`
      SELECT 
        id,
        progress_percentage,
        progress_notes,
        status,
        last_progress_update,
        started_date,
        completion_date,
        created_at,
        updated_at
      FROM idp_entries 
      WHERE id = ${id}
    `;

    if (!idpData || idpData.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'IDP not found' 
      });
    }

    res.json({ 
      success: true, 
      progressHistory: idpData[0] 
    });

  } catch (error) {
    console.error('Error fetching IDP progress history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch IDP progress history' 
    });
  }
});

module.exports = router;
