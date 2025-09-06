const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// Authentication disabled for now
// router.use(authenticateToken);

// Get all groups
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where,
        include: {
          users: {
            where: { isActive: true },
            select: { id: true, firstName: true, lastName: true, email: true, role: true }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.group.count({ where })
    ]);

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

// Get group by ID
router.get('/:id', async (req, res) => {
  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: {
        users: {
          where: { isActive: true },
          select: { id: true, firstName: true, lastName: true, email: true, role: true }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.json({ group });
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

    // Check if group exists
    const existingGroup = await prisma.group.findUnique({
      where: { name }
    });

    if (existingGroup) {
      return res.status(400).json({ message: 'Group with this name already exists' });
    }

    const group = await prisma.group.create({
      data: {
        name,
        description: description || null
      }
    });

    res.status(201).json({
      message: 'Group created successfully',
      group
    });
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

// Add users to group
router.post('/:id/users', [
  body('userIds').isArray().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { userIds } = req.body;

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id }
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Update users to assign them to the group
    await prisma.user.updateMany({
      where: {
        id: { in: userIds },
        isActive: true
      },
      data: { groupId: id }
    });

    // Get updated group with users
    const updatedGroup = await prisma.group.findUnique({
      where: { id },
      include: {
        users: {
          where: { isActive: true },
          select: { id: true, firstName: true, lastName: true, email: true, role: true }
        }
      }
    });

    res.json({
      message: 'Users added to group successfully',
      group: updatedGroup
    });
  } catch (error) {
    console.error('Add users to group error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove user from group
router.delete('/:id/users/:userId', requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { id, userId } = req.params;

    await prisma.user.update({
      where: { id: userId },
      data: { groupId: null }
    });

    res.json({ message: 'User removed from group successfully' });
  } catch (error) {
    console.error('Remove user from group error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
