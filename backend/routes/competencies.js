const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

const prisma = new PrismaClient();
const router = express.Router();
let xlsx;

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

// CSV upload for competencies (Type, Competency Family, Competency Title, Competency Definition, Basic, Intermediate, Advanced, Mastery)
const csvUpload = multer({ dest: 'uploads/' });

router.post('/upload-csv', csvUpload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No CSV file provided' });
  }

  const filePath = req.file.path;
  let success = 0;
  const errors = [];

  const normalizeType = (val) => {
    if (!val) return null;
    const s = String(val).trim().toUpperCase().replace(/\s+/g, '_');
    // Map common labels
    if (s.includes('NON') && s.includes('TECHNICAL')) return 'NON_TECHNICAL';
    if (s.includes('TECHNICAL')) return 'TECHNICAL';
    if (s.includes('LEADERSHIP')) return 'LEADERSHIP';
    if (s.includes('BEHAVIOR')) return 'BEHAVIORAL';
    if (s.includes('FUNCTION')) return 'FUNCTIONAL';
    return s; // fallback
  };

  const levelOrder = [
    { key: 'Basic', enum: 'BASIC' },
    { key: 'Intermediate', enum: 'INTERMEDIATE' },
    { key: 'Advanced', enum: 'ADVANCED' },
    { key: 'Mastery', enum: 'MASTERY' },
  ];

  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({ separator: '\t', mapHeaders: ({ header }) => header.trim() }))
        .on('data', async (row) => {
          // Support either tab-separated as pasted or comma-separated files
          const get = (k) => row[k] ?? row[k?.replace(/\s+/g, ' ')] ?? row[k?.replace(/\s+/g, '')];

          // If it looks empty (e.g., due to comma CSV), try fallback parser later
          if (!get('Competency Title') && !get('Competency Title ')) return;

          const rawType = get('Type');
          const family = (get('Competency Family') || '').toString().trim();
          const name = (get('Competency Title') || '').toString().trim().replace(/^"|"$/g, '');
          const definition = (get('Competency Definition') || '').toString().trim();

          if (!name) { errors.push('Missing Competency Title'); return; }

          const type = normalizeType(rawType) || 'NON_TECHNICAL';

          // Build levels from columns
          const levels = [];
          for (const { key, enum: lvl } of levelOrder) {
            const text = (get(key) || '').toString().trim();
            if (!text) continue;
            levels.push({ level: lvl, title: key, description: text, indicators: [] });
          }

          try {
            // Upsert by name to avoid duplicates
            const existing = await prisma.competency.findUnique({ where: { name } });
            let compId = existing?.id;
            if (!existing) {
              const created = await prisma.competency.create({
                data: { name, type, family, definition, description: null }
              });
              compId = created.id;
            } else {
              await prisma.competency.update({ where: { id: compId }, data: { type, family, definition } });
              // Clear previous levels to replace
              await prisma.competencyLevel.deleteMany({ where: { competencyId: compId } });
            }

            if (levels.length > 0) {
              await prisma.competencyLevel.createMany({
                data: levels.map(l => ({
                  competencyId: compId,
                  level: l.level,
                  title: l.title,
                  description: l.description,
                  indicators: l.indicators
                }))
              });
            }
            success++;
          } catch (e) {
            errors.push(`Row for '${name}': ${e.message}`);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Fallback for comma-separated CSV if nothing parsed
    if (success === 0) {
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv({ separator: ',', mapHeaders: ({ header }) => header.trim() }))
          .on('data', async (row) => {
            const rawType = row['Type'];
            const family = (row['Competency Family'] || '').toString().trim();
            const name = (row['Competency Title'] || '').toString().trim().replace(/^"|"$/g, '');
            const definition = (row['Competency Definition'] || '').toString().trim();
            if (!name) return;
            const type = normalizeType(rawType) || 'NON_TECHNICAL';

            const levels = [];
            for (const { key, enum: lvl } of levelOrder) {
              const text = (row[key] || '').toString().trim();
              if (!text) continue;
              levels.push({ level: lvl, title: key, description: text, indicators: [] });
            }

            try {
              const existing = await prisma.competency.findUnique({ where: { name } });
              let compId = existing?.id;
              if (!existing) {
                const created = await prisma.competency.create({
                  data: { name, type, family, definition, description: null }
                });
                compId = created.id;
              } else {
                await prisma.competency.update({ where: { id: compId }, data: { type, family, definition } });
                await prisma.competencyLevel.deleteMany({ where: { competencyId: compId } });
              }

              if (levels.length > 0) {
                await prisma.competencyLevel.createMany({
                  data: levels.map(l => ({
                    competencyId: compId,
                    level: l.level,
                    title: l.title,
                    description: l.description,
                    indicators: l.indicators
                  }))
                });
              }
              success++;
            } catch (e) {
              errors.push(`Row for '${name}': ${e.message}`);
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });
    }

    // Cleanup
    try { fs.unlinkSync(filePath); } catch {}

    res.json({ message: `Competency upload completed. ${success} successful, ${errors.length} errors.`, errors: errors.length ? errors.slice(0, 10) : undefined });
  } catch (err) {
    try { fs.unlinkSync(filePath); } catch {}
    console.error('Competency CSV upload error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Excel (.xlsx) upload using xlsx parser
const xlsxUpload = multer({ dest: 'uploads/' });
router.post('/upload-xlsx', xlsxUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No Excel file provided' });
  const filePath = req.file.path;
  let success = 0;
  const errors = [];

  const normalizeType = (val) => {
    if (!val) return null;
    const s = String(val).trim().toUpperCase().replace(/\s+/g, '_');
    if (s.includes('NON') && s.includes('TECHNICAL')) return 'NON_TECHNICAL';
    if (s.includes('TECHNICAL')) return 'TECHNICAL';
    if (s.includes('LEADERSHIP')) return 'LEADERSHIP';
    if (s.includes('BEHAVIOR')) return 'BEHAVIORAL';
    if (s.includes('FUNCTION')) return 'FUNCTIONAL';
    return s;
  };
  const levelOrder = [
    { key: 'Basic', enum: 'BASIC' },
    { key: 'Intermediate', enum: 'INTERMEDIATE' },
    { key: 'Advanced', enum: 'ADVANCED' },
    { key: 'Mastery', enum: 'MASTERY' },
  ];

  try {
    try { xlsx = xlsx || require('xlsx'); } catch (e) {
      throw new Error('Server missing xlsx module. Please install it.');
    }
    const wb = xlsx.readFile(filePath);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    const hmap = (h) => h.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
    for (const row of rows) {
      try {
        // Build a normalized-key object
        const norm = {};
        for (const k of Object.keys(row)) norm[hmap(k)] = row[k];

        const rawType = norm['type'];
        const family = (norm['competencyfamily'] || '').toString().trim();
        const name = (norm['competencytitle'] || '').toString().trim().replace(/^"|"$/g, '');
        const definition = (norm['competencydefinition'] || '').toString().trim();
        if (!name) { errors.push('Missing Competency Title'); continue; }
        const type = normalizeType(rawType) || 'NON_TECHNICAL';

        const levels = [];
        for (const { key, enum: lvl } of levelOrder) {
          const col = key.toLowerCase().replace(/[^a-z0-9]+/g, '');
          const text = (norm[col] || '').toString().trim();
          if (!text) continue;
          levels.push({ level: lvl, title: key, description: text, indicators: [] });
        }

        const existing = await prisma.competency.findUnique({ where: { name } });
        let compId = existing?.id;
        if (!existing) {
          const created = await prisma.competency.create({
            data: { name, type, family, definition, description: null }
          });
          compId = created.id;
        } else {
          await prisma.competency.update({ where: { id: compId }, data: { type, family, definition } });
          await prisma.competencyLevel.deleteMany({ where: { competencyId: compId } });
        }

        if (levels.length > 0) {
          await prisma.competencyLevel.createMany({
            data: levels.map(l => ({
              competencyId: compId,
              level: l.level,
              title: l.title,
              description: l.description,
              indicators: l.indicators
            }))
          });
        }
        success++;
      } catch (e) {
        errors.push(e.message);
      }
    }

    try { fs.unlinkSync(filePath); } catch {}
    res.json({ message: `Competency upload completed. ${success} successful, ${errors.length} errors.`, errors: errors.slice(0, 10) });
  } catch (err) {
    try { fs.unlinkSync(filePath); } catch {}
    console.error('Competency XLSX upload error:', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
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

// Get all competency levels
router.get('/levels', async (req, res) => {
  try {
    const levels = await prisma.$queryRaw`
      SELECT id, level, title, description, indicators
      FROM competency_levels
      ORDER BY 
        CASE level
          WHEN 'BASIC' THEN 1
          WHEN 'INTERMEDIATE' THEN 2
          WHEN 'ADVANCED' THEN 3
          WHEN 'MASTERY' THEN 4
          ELSE 5
        END
    `;

    res.json({
      success: true,
      levels: levels
    });
  } catch (error) {
    console.error('Error fetching competency levels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch competency levels'
    });
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
                first_name: true,
                last_name: true,
                sid: true
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

    // Update levels if provided
    if (levels && Array.isArray(levels)) {
      // Delete existing levels
      await prisma.competencyLevel.deleteMany({
        where: { competencyId: id }
      });

      // Create new levels
      for (const level of levels) {
        await prisma.competencyLevel.create({
          data: {
            competencyId: id,
            level: level.level,
            title: level.title || `${level.level} Level`,
            description: level.description || '',
            indicators: level.indicators || []
          }
        });
      }
    }

    // Return updated competency with levels
    const updatedCompetency = await prisma.competency.findUnique({
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
        _count: {
          select: { assessments: true }
        }
      }
    });

    res.json(updatedCompetency);
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

module.exports = router;
