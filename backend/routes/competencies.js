const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

const prisma = new PrismaClient();
const router = express.Router();

// Configure multer for document uploads
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/competency-documents');
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

const documentUpload = multer({
  storage: documentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|txt|ppt|pptx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only documents (PDF, DOC, DOCX, TXT, PPT, PPTX, XLS, XLSX) are allowed'), false);
    }
  }
});

// Get all competencies with pagination and filters
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      type = '', 
      family = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {
      AND: [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { definition: { contains: search, mode: 'insensitive' } },
            { family: { contains: search, mode: 'insensitive' } }
          ]
        },
        type ? { type } : {},
        family ? { family: { contains: family, mode: 'insensitive' } } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    };

    // Get competencies with relations
    const competencies = await prisma.competency.findMany({
      where,
      include: {
        levels: {
          orderBy: {
            level: 'asc'
          }
        },
        documents: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            assessments: true
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      skip,
      take
    });

    // Get total count for pagination
    const total = await prisma.competency.count({ where });

    res.json({
      competencies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching competencies:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single competency with all details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const competency = await prisma.competency.findUnique({
      where: { id },
      include: {
        levels: {
          orderBy: {
            level: 'asc'
          }
        },
        documents: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        assessments: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeId: true
              }
            },
            level: true
          },
          orderBy: {
            assessmentDate: 'desc'
          }
        }
      }
    });

    if (!competency) {
      return res.status(404).json({ message: 'Competency not found' });
    }

    res.json(competency);
  } catch (error) {
    console.error('Error fetching competency:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new competency
router.post('/', async (req, res) => {
  try {
    const { name, type, family, definition, description, levels } = req.body;

    // Check if competency name already exists
    const existingCompetency = await prisma.competency.findUnique({
      where: { name }
    });
    
    if (existingCompetency) {
      return res.status(400).json({ message: 'Competency name already exists' });
    }

    // Create competency with levels
    const competency = await prisma.competency.create({
      data: {
        name,
        type,
        family,
        definition,
        description,
        levels: {
          create: levels?.map(level => ({
            level: level.level,
            title: level.title,
            description: level.description,
            indicators: level.indicators || []
          })) || []
        }
      },
      include: {
        levels: true
      }
    });

    res.status(201).json(competency);
  } catch (error) {
    console.error('Error creating competency:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update competency
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, family, definition, description, levels } = req.body;

    // Check if competency exists
    const existingCompetency = await prisma.competency.findUnique({
      where: { id }
    });

    if (!existingCompetency) {
      return res.status(404).json({ message: 'Competency not found' });
    }

    // Check for duplicate name if being updated
    if (name && name !== existingCompetency.name) {
      const duplicateCompetency = await prisma.competency.findUnique({
        where: { name }
      });
      
      if (duplicateCompetency) {
        return res.status(400).json({ message: 'Competency name already exists' });
      }
    }

    // Update competency
    const competency = await prisma.competency.update({
      where: { id },
      data: {
        name,
        type,
        family,
        definition,
        description
      },
      include: {
        levels: true
      }
    });

    res.json(competency);
  } catch (error) {
    console.error('Error updating competency:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete competency
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if competency exists
    const competency = await prisma.competency.findUnique({
      where: { id }
    });

    if (!competency) {
      return res.status(404).json({ message: 'Competency not found' });
    }

    await prisma.competency.delete({
      where: { id }
    });

    res.json({ message: 'Competency deleted successfully' });
  } catch (error) {
    console.error('Error deleting competency:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add competency level
router.post('/:id/levels', async (req, res) => {
  try {
    const { id } = req.params;
    const { level, title, description, indicators } = req.body;

    // Check if competency exists
    const competency = await prisma.competency.findUnique({
      where: { id }
    });

    if (!competency) {
      return res.status(404).json({ message: 'Competency not found' });
    }

    // Check if level already exists for this competency
    const existingLevel = await prisma.competencyLevel.findUnique({
      where: {
        competencyId_level: {
          competencyId: id,
          level: level
        }
      }
    });

    if (existingLevel) {
      return res.status(400).json({ message: 'Level already exists for this competency' });
    }

    const competencyLevel = await prisma.competencyLevel.create({
      data: {
        competencyId: id,
        level,
        title,
        description,
        indicators: indicators || []
      }
    });

    res.status(201).json(competencyLevel);
  } catch (error) {
    console.error('Error creating competency level:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update competency level
router.put('/:id/levels/:levelId', async (req, res) => {
  try {
    const { levelId } = req.params;
    const { title, description, indicators } = req.body;

    const competencyLevel = await prisma.competencyLevel.update({
      where: { id: levelId },
      data: {
        title,
        description,
        indicators: indicators || []
      }
    });

    res.json(competencyLevel);
  } catch (error) {
    console.error('Error updating competency level:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete competency level
router.delete('/:id/levels/:levelId', async (req, res) => {
  try {
    const { levelId } = req.params;

    await prisma.competencyLevel.delete({
      where: { id: levelId }
    });

    res.json({ message: 'Competency level deleted successfully' });
  } catch (error) {
    console.error('Error deleting competency level:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Upload document for competency
router.post('/:id/documents', documentUpload.single('document'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, documentType, version } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No document uploaded' });
    }

    // Check if competency exists
    const competency = await prisma.competency.findUnique({
      where: { id }
    });

    if (!competency) {
      return res.status(404).json({ message: 'Competency not found' });
    }

    const document = await prisma.competencyDocument.create({
      data: {
        competencyId: id,
        title,
        description,
        fileName: req.file.filename,
        originalFileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        documentType,
        version: version || '1.0'
      }
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete competency document
router.delete('/:id/documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await prisma.competencyDocument.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete file from filesystem
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    await prisma.competencyDocument.delete({
      where: { id: documentId }
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get competency statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalCompetencies = await prisma.competency.count();
    const activeCompetencies = await prisma.competency.count({
      where: { isActive: true }
    });

    // Family breakdown
    const familyStats = await prisma.competency.groupBy({
      by: ['family'],
      _count: {
        id: true
      }
    });

    // Type breakdown
    const typeStats = await prisma.competency.groupBy({
      by: ['type'],
      _count: {
        id: true
      }
    });

    // Total assessments
    const totalAssessments = await prisma.competencyAssessment.count();

    res.json({
      total: totalCompetencies,
      active: activeCompetencies,
      families: familyStats.map(family => ({
        name: family.family,
        count: family._count.id
      })),
      types: typeStats.map(type => ({
        type: type.type,
        count: type._count.id
      })),
      totalAssessments
    });
  } catch (error) {
    console.error('Error fetching competency stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
