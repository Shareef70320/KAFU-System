const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// Authentication disabled for now
// router.use(authenticateToken);

// Get all groups with member counts (employees)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = search
      ? `WHERE g.name ILIKE '%' || $1 || '%' OR g.description ILIKE '%' || $1 || '%'
         `
      : '';
    const params = search ? [search, parseInt(limit), offset] : [parseInt(limit), offset];

    const listQuery = `
      SELECT g.id, g.name, g.description, g."createdAt", g."updatedAt",
             COALESCE(mc.member_count, 0)::int AS member_count,
             COALESCE(preview.members, '[]'::json) AS preview_members
      FROM groups g
      LEFT JOIN (
        SELECT gm.group_id, COUNT(*) AS member_count
        FROM group_members gm
        GROUP BY gm.group_id
      ) mc ON mc.group_id = g.id
      LEFT JOIN LATERAL (
        SELECT json_agg(row_to_json(t)) AS members
        FROM (
          SELECT e.id, e.sid, e.first_name, e.last_name, e.photo_url
          FROM group_members gm2
          JOIN employees e ON e.id = gm2.employee_id
          WHERE gm2.group_id = g.id
          ORDER BY e.first_name, e.last_name
          LIMIT 6
        ) t
      ) preview ON true
      ${whereClause}
      ORDER BY g."createdAt" DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS count
      FROM groups g
      ${whereClause}
    `;

    const groups = search
      ? await prisma.$queryRawUnsafe(listQuery, ...params)
      : await prisma.$queryRawUnsafe(listQuery, ...params);

    const totalRows = search
      ? await prisma.$queryRawUnsafe(countQuery, search)
      : await prisma.$queryRawUnsafe(countQuery);

    const total = totalRows[0]?.count || 0;

    res.json({
      groups,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get group by ID with members (employees)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const groupRows = await prisma.$queryRawUnsafe(
      'SELECT id, name, description, "createdAt", "updatedAt" FROM groups WHERE id = $1', id
    );
    if (groupRows.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const members = await prisma.$queryRawUnsafe(
      `SELECT e.id, e.sid, e.first_name, e.last_name, e.email, e.job_title, e.job_code, e.division, e.location
       FROM group_members gm
       JOIN employees e ON e.id = gm.employee_id
       WHERE gm.group_id = $1
       ORDER BY e.first_name, e.last_name`, id
    );
    res.json({ group: { ...groupRows[0], members } });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create group
router.post('/', [
  body('name').trim().notEmpty().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    // Check if name exists
    const existing = await prisma.$queryRawUnsafe('SELECT id FROM groups WHERE name = $1', name);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Group with this name already exists' });
    }

    const id = `GRP-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const insertQuery = `
      INSERT INTO groups (id, name, description, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, name, description, "createdAt", "updatedAt"`;
    const rows = await prisma.$queryRawUnsafe(insertQuery, id, name, description || null);
    res.status(201).json({ message: 'Group created successfully', group: rows[0] });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update group
router.put('/:id', [
  body('name').optional().trim().notEmpty().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Check if group exists
    const existingGroup = await prisma.group.findUnique({
      where: { id }
    });

    if (!existingGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if new name conflicts with existing group
    if (updateData.name && updateData.name !== existingGroup.name) {
      const nameConflict = await prisma.group.findUnique({
        where: { name: updateData.name }
      });

      if (nameConflict) {
        return res.status(400).json({ message: 'Group with this name already exists' });
      }
    }

    const group = await prisma.group.update({
      where: { id },
      data: updateData,
      include: {
        users: {
          where: { isActive: true },
          select: { id: true, firstName: true, lastName: true, email: true, role: true }
        }
      }
    });

    res.json({
      message: 'Group updated successfully',
      group
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete group
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if group has users
    const groupWithUsers = await prisma.group.findUnique({
      where: { id },
      include: {
        users: {
          where: { isActive: true }
        }
      }
    });

    if (!groupWithUsers) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (groupWithUsers.users.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete group with active users. Please reassign users first.' 
      });
    }

    await prisma.group.delete({
      where: { id }
    });

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Assign employees to group
router.post('/:id/members', [
  body('employeeIds').isArray().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { employeeIds } = req.body;

    const group = await prisma.$queryRawUnsafe('SELECT id FROM groups WHERE id = $1', id);

    if (group.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Insert memberships, ignore duplicates
    for (const empId of employeeIds) {
      await prisma.$queryRawUnsafe(
        'INSERT INTO group_members (group_id, employee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        id,
        empId
      );
    }

    const members = await prisma.$queryRawUnsafe(
      `SELECT e.id, e.sid, e.first_name, e.last_name, e.email, e.job_title, e.job_code, e.division, e.location
       FROM group_members gm JOIN employees e ON e.id = gm.employee_id
       WHERE gm.group_id = $1
       ORDER BY e.first_name, e.last_name`, id
    );

    res.json({
      message: 'Members added to group successfully',
      group: { id, members }
    });
  } catch (error) {
    console.error('Add members to group error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove employee from group
router.delete('/:id/members/:employeeId', requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { id, employeeId } = req.params;

    await prisma.$queryRawUnsafe(
      'DELETE FROM group_members WHERE group_id = $1 AND employee_id = $2',
      id,
      employeeId
    );

    res.json({ message: 'Member removed from group successfully' });
  } catch (error) {
    console.error('Remove member from group error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
