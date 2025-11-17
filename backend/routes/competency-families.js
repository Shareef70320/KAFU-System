const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Get all competency families
router.get('/', async (req, res) => {
  try {
    const { activeOnly = 'false', type } = req.query;
    let where = {};
    if (activeOnly === 'true') {
      where.isActive = true;
    }
    if (type) {
      where.type = type;
    }
    
    const families = await prisma.competencyFamily.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ],
      include: {
        _count: {
          select: { competencies: true }
        }
      }
    });

    res.json(families);
  } catch (error) {
    console.error('Error fetching competency families:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a single competency family by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const family = await prisma.competencyFamily.findUnique({
      where: { id },
      include: {
        _count: {
          select: { competencies: true }
        }
      }
    });

    if (!family) {
      return res.status(404).json({ message: 'Competency family not found' });
    }

    res.json(family);
  } catch (error) {
    console.error('Error fetching competency family:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new competency family
router.post('/', async (req, res) => {
  try {
    const { name, type, description, isActive = true } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Family name is required' });
    }

    // Check if family with same name and type already exists
    const existing = await prisma.competencyFamily.findUnique({
      where: {
        name_type: {
          name: name.trim(),
          type: type || null
        }
      }
    });

    if (existing) {
      return res.status(400).json({ message: 'Competency family with this name and type already exists' });
    }

    const family = await prisma.competencyFamily.create({
      data: {
        name: name.trim(),
        type: type || null,
        description: description?.trim() || null,
        isActive: isActive !== false
      }
    });

    res.status(201).json(family);
  } catch (error) {
    console.error('Error creating competency family:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Competency family with this name and type already exists' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update a competency family
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, description, isActive } = req.body;

    // Check if family exists
    const existing = await prisma.competencyFamily.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Competency family not found' });
    }

    // Check if new name/type combination conflicts with another family
    const newName = name !== undefined ? name.trim() : existing.name;
    const newType = type !== undefined ? (type || null) : existing.type;
    
    if (newName !== existing.name || newType !== existing.type) {
      const duplicate = await prisma.competencyFamily.findUnique({
        where: {
          name_type: {
            name: newName,
            type: newType
          }
        }
      });

      if (duplicate && duplicate.id !== id) {
        return res.status(400).json({ message: 'Competency family with this name and type already exists' });
      }
    }

    const family = await prisma.competencyFamily.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        type: type !== undefined ? (type || null) : undefined,
        description: description !== undefined ? (description?.trim() || null) : undefined,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });

    res.json(family);
  } catch (error) {
    console.error('Error updating competency family:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Competency family with this name and type already exists' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a competency family
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if family exists
    const existing = await prisma.competencyFamily.findUnique({
      where: { id },
      include: {
        _count: {
          select: { competencies: true }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Competency family not found' });
    }

    // Check if family is used by any competencies
    if (existing._count.competencies > 0) {
      return res.status(400).json({ 
        message: `Cannot delete family. It is used by ${existing._count.competencies} competency(ies).` 
      });
    }

    await prisma.competencyFamily.delete({
      where: { id }
    });

    res.json({ message: 'Competency family deleted successfully' });
  } catch (error) {
    console.error('Error deleting competency family:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

