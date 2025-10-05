const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = new PrismaClient();
const router = express.Router();

// List paths with de-duplicated employee counts
router.get('/', async (req, res) => {
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT 
        p.*,
        -- effective unique employees covered, via direct and groups (de-duplicated)
        (
          SELECT COUNT(*) FROM (
            SELECT DISTINCT e_id FROM (
              SELECT pa.employee_id AS e_id
              FROM path_assignments pa
              WHERE pa.path_id = p.id AND pa.employee_id IS NOT NULL
              UNION
              SELECT gm.employee_id AS e_id
              FROM path_assignments pa
              JOIN group_members gm ON gm.group_id = pa.group_id
              WHERE pa.path_id = p.id AND pa.group_id IS NOT NULL
            ) all_e
          ) uniq_e
        )::int AS employee_assignments,
        -- number of group assignment rows (for visibility)
        (
          SELECT COUNT(*) FROM path_assignments pa
          WHERE pa.path_id = p.id AND pa.group_id IS NOT NULL
        )::int AS group_assignments
      FROM development_paths p
      ORDER BY p.created_at DESC
    `);
    res.json({ paths: rows });
  } catch (err) {
    console.error('List paths error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a path
router.post('/', async (req, res) => {
  try {
    const { name, description, start_date, end_date } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    const id = `DP-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO development_paths (id, name, description, start_date, end_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4::date, $5::date, NOW(), NOW()) RETURNING *`,
      id, name.trim(), description || null, start_date || null, end_date || null
    );
    res.status(201).json({ message: 'Path created', path: rows[0] });
  } catch (err) {
    console.error('Create path error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Assign to employees or group
router.post('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeIds = [], groupId = null, assigned_by = null } = req.body;

    const pathRow = await prisma.$queryRawUnsafe('SELECT id FROM development_paths WHERE id = $1', id);
    if (pathRow.length === 0) return res.status(404).json({ message: 'Path not found' });

    const inserted = [];
    if (groupId) {
      const aid = `PA-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      const row = await prisma.$queryRawUnsafe(
        `INSERT INTO path_assignments (id, path_id, group_id, assigned_by) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING RETURNING *`,
        aid, id, groupId, assigned_by
      );
      if (row[0]) inserted.push(row[0]);
    }

    for (const empId of employeeIds) {
      const aid = `PA-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      const row = await prisma.$queryRawUnsafe(
        `INSERT INTO path_assignments (id, path_id, employee_id, assigned_by) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING RETURNING *`,
        aid, id, empId, assigned_by
      );
      if (row[0]) inserted.push(row[0]);
    }

    res.json({ message: 'Assignments saved', assignments: inserted });
  } catch (err) {
    console.error('Assign path error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Replace assignments (idempotent): direct employees and optional single group
router.put('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_ids = [], group_id = null, assigned_by = null } = req.body;

    const pathRow = await prisma.$queryRawUnsafe('SELECT id FROM development_paths WHERE id = $1', id);
    if (pathRow.length === 0) return res.status(404).json({ message: 'Path not found' });

    await prisma.$transaction(async (tx) => {
      // Replace direct employee assignments (deduplicated across direct list and group expansion)
      await tx.$executeRawUnsafe('DELETE FROM path_assignments WHERE path_id = $1 AND employee_id IS NOT NULL', id);

      // Replace group assignment (assume at most one group for simplicity)
      await tx.$executeRawUnsafe('DELETE FROM path_assignments WHERE path_id = $1 AND group_id IS NOT NULL', id);
      let effectiveEmpIds = new Set(employee_ids);
      if (group_id) {
        // Track the group assignment record
        const gid = `PA-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
        await tx.$executeRawUnsafe(
          'INSERT INTO path_assignments (id, path_id, group_id, assigned_by) VALUES ($1, $2, $3, $4)',
          gid, id, group_id, assigned_by
        );

        // Expand group members, but only add unique employee ids
        const members = await tx.$queryRawUnsafe(
          'SELECT employee_id FROM group_members WHERE group_id = $1',
          group_id
        );
        for (const row of members) {
          if (row.employee_id) effectiveEmpIds.add(row.employee_id);
        }
      }

      // Insert unique direct employee assignments
      for (const empId of Array.from(effectiveEmpIds)) {
        const aid = `PA-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
        await tx.$executeRawUnsafe(
          'INSERT INTO path_assignments (id, path_id, employee_id, assigned_by) VALUES ($1, $2, $3, $4)',
          aid, id, empId, assigned_by
        );
      }
    });

    res.json({ message: 'Assignments updated' });
  } catch (err) {
    console.error('Replace assignments error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current assignments (direct employees and group)
router.get('/:id/assignments', async (req, res) => {
  try {
    const { id } = req.params;
    const employees = await prisma.$queryRawUnsafe(
      `SELECT e.id, e.sid, e.first_name, e.last_name, e.email, e.photo_url
       FROM path_assignments pa
       JOIN employees e ON e.sid = pa.employee_id
       WHERE pa.path_id = $1 AND pa.employee_id IS NOT NULL
       ORDER BY e.first_name`, id
    );
    const groups = await prisma.$queryRawUnsafe(
      `SELECT g.id, g.name
       FROM path_assignments pa
       JOIN groups g ON g.id = pa.group_id
       WHERE pa.path_id = $1 AND pa.group_id IS NOT NULL
       ORDER BY g.name`, id
    );
    res.json({ employees, groups });
  } catch (err) {
    console.error('Get assignments error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update Development Path details
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, start_date, end_date } = req.body;

    console.log('Updating path:', { id, name, description, start_date, end_date });

    const rows = await prisma.$queryRawUnsafe(
      `UPDATE development_paths SET
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        start_date = COALESCE($4::date, start_date),
        end_date = COALESCE($5::date, end_date),
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      id, name || null, description || null, start_date || null, end_date || null
    );

    if (rows.length === 0) return res.status(404).json({ message: 'Path not found' });
    console.log('Path updated successfully:', rows[0]);
    res.json({ message: 'Path updated', path: rows[0] });
  } catch (error) {
    console.error('Update path error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get path details including interventions and assignments summary
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pathRows = await prisma.$queryRawUnsafe('SELECT * FROM development_paths WHERE id = $1', id);
    if (pathRows.length === 0) return res.status(404).json({ message: 'Path not found' });

    const interventions = await prisma.$queryRawUnsafe(
      'SELECT * FROM path_interventions WHERE path_id = $1 ORDER BY created_at ASC', id
    );

    const counts = await prisma.$queryRawUnsafe(`
      SELECT 
        COALESCE((SELECT COUNT(*) FROM path_assignments WHERE path_id = $1 AND employee_id IS NOT NULL),0)::int AS direct_emp,
        COALESCE((SELECT COUNT(*) FROM path_assignments WHERE path_id = $1 AND group_id IS NOT NULL),0)::int AS groups
    `, id);

    res.json({ path: pathRows[0], interventions, summary: counts[0] });
  } catch (err) {
    console.error('Path details error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Storage for attachments (reusing backend/uploads)
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `attachment-${Date.now()}-${Math.random().toString(36).slice(2,8)}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// List comments for an intervention
router.get('/interventions/:iid/comments', async (req, res) => {
  try {
    const { iid } = req.params;
    const rows = await prisma.$queryRawUnsafe(
      `SELECT c.*, e.first_name, e.last_name
       FROM path_intervention_comments c
       LEFT JOIN employees e ON e.sid = c.author_sid
       WHERE c.intervention_id = $1
       ORDER BY c.created_at DESC`, iid
    );
    res.json({ comments: rows });
  } catch (err) {
    console.error('List intervention comments error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create comment with optional attachment
router.post('/interventions/:iid/comments', upload.single('attachment'), async (req, res) => {
  try {
    const { iid } = req.params;
    const { author_sid, comment } = req.body;
    if (!author_sid || (!comment && !req.file)) {
      return res.status(400).json({ message: 'author_sid and at least comment or attachment are required' });
    }
    const id = `PIC-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const attachmentUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO path_intervention_comments (id, intervention_id, author_sid, comment, attachment_url, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      id, iid, author_sid, comment || null, attachmentUrl
    );
    res.status(201).json({ message: 'Comment added', comment: rows[0] });
  } catch (err) {
    console.error('Create intervention comment error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create intervention
router.post('/:id/interventions', async (req, res) => {
  try {
    const { id } = req.params;
    const { intervention_type_id, title, description, instructor, location, start_date, end_date, duration_hours, managed_by } = req.body;
    if (!intervention_type_id || !title) return res.status(400).json({ message: 'intervention_type_id and title are required' });
    const iid = `PI-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO path_interventions (id, path_id, intervention_type, intervention_name, description, start_date, end_date, duration_hours, managed_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, $8::int, $9, NOW(), NOW()) RETURNING *`,
      iid, id, intervention_type_id, title, description || null, start_date || null, end_date || null, duration_hours || null, managed_by || null
    );
    res.status(201).json({ message: 'Intervention created', intervention: rows[0] });
  } catch (err) {
    console.error('Create intervention error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update intervention
router.put('/interventions/:iid', async (req, res) => {
  try {
    const { iid } = req.params;
    const { intervention_type, intervention_name, description, start_date, end_date, duration_hours, managed_by } = req.body;
    const rows = await prisma.$queryRawUnsafe(
      `UPDATE path_interventions SET 
        intervention_type = COALESCE($2, intervention_type),
        intervention_name = COALESCE($3, intervention_name),
        description = COALESCE($4, description),
        start_date = COALESCE($5::date, start_date),
        end_date = COALESCE($6::date, end_date),
        duration_hours = COALESCE($7::int, duration_hours),
        managed_by = COALESCE($8, managed_by),
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      iid, intervention_type || null, intervention_name || null, description || null, start_date || null, end_date || null, duration_hours || null, managed_by || null
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Intervention not found' });
    res.json({ message: 'Intervention updated', intervention: rows[0] });
  } catch (err) {
    console.error('Update intervention error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete intervention
router.delete('/interventions/:iid', async (req, res) => {
  try {
    const { iid } = req.params;
    const rows = await prisma.$queryRawUnsafe('DELETE FROM path_interventions WHERE id = $1 RETURNING id', iid);
    if (rows.length === 0) return res.status(404).json({ message: 'Intervention not found' });
    res.json({ message: 'Intervention deleted' });
  } catch (err) {
    console.error('Delete intervention error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get assignments for a user
router.get('/user/:sid', async (req, res) => {
  try {
    const { sid } = req.params;
    const empRows = await prisma.$queryRawUnsafe('SELECT sid, first_name, last_name FROM employees WHERE sid = $1', sid);
    if (empRows.length === 0) return res.json({ assignments: [] });

    const rows = await prisma.$queryRawUnsafe(`
      SELECT pa.id as assignment_id, p.*
      FROM path_assignments pa
      JOIN development_paths p ON p.id = pa.path_id
      WHERE pa.employee_id = $1
      ORDER BY p.start_date NULLS LAST, p.created_at DESC
    `, sid);
    res.json({ assignments: rows });
  } catch (err) {
    console.error('Get user assignments error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;


