const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Get all job-competency mappings with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      jobId = '', 
      competencyId = '',
      level = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause for filtering
    const where = {
      AND: [
        jobId ? { jobId } : {},
        competencyId ? { competencyId } : {},
        level ? { requiredLevel: level } : {}
      ]
    };

    const [mappings, total] = await Promise.all([
      prisma.jobCompetency.findMany({
        where,
        skip,
        take,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              code: true,
              unit: true,
              division: true,
              department: true
            }
          },
          competency: {
            select: {
              id: true,
              name: true,
              type: true,
              family: true,
              definition: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        }
      }),
      prisma.jobCompetency.count({ where })
    ]);

    res.json({
      mappings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching job-competency mappings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get mappings for a specific job
router.get('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const mappings = await prisma.jobCompetency.findMany({
      where: { jobId },
      include: {
        competency: {
          select: {
            id: true,
            name: true,
            type: true,
            family: true,
            definition: true,
            levels: {
              select: {
                id: true,
                level: true,
                title: true,
                description: true
              },
              orderBy: {
                level: 'asc'
              }
            }
          }
        }
      },
      orderBy: {
        competency: {
          name: 'asc'
        }
      }
    });

    res.json(mappings);
  } catch (error) {
    console.error('Error fetching job competencies:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get mappings for a specific competency
router.get('/competency/:competencyId', async (req, res) => {
  try {
    const { competencyId } = req.params;
    
    const mappings = await prisma.jobCompetency.findMany({
      where: { competencyId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            code: true,
            unit: true,
            division: true,
            department: true
          }
        }
      },
      orderBy: {
        job: {
          title: 'asc'
        }
      }
    });

    res.json(mappings);
  } catch (error) {
    console.error('Error fetching competency jobs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new job-competency mapping
router.post('/', async (req, res) => {
  try {
    const { jobId, competencyId, requiredLevel, isRequired = true } = req.body;

    // Validate required fields
    if (!jobId || !competencyId || !requiredLevel) {
      return res.status(400).json({ message: 'Job ID, Competency ID, and Required Level are required' });
    }

    // Check if job exists
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if competency exists
    const competency = await prisma.competency.findUnique({
      where: { id: competencyId }
    });

    if (!competency) {
      return res.status(404).json({ message: 'Competency not found' });
    }

    // Check if mapping already exists
    const existingMapping = await prisma.jobCompetency.findUnique({
      where: {
        jobId_competencyId: {
          jobId,
          competencyId
        }
      }
    });

    if (existingMapping) {
      return res.status(400).json({ message: 'This job-competency mapping already exists' });
    }

    const mapping = await prisma.jobCompetency.create({
      data: {
        jobId,
        competencyId,
        requiredLevel,
        isRequired
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            code: true
          }
        },
        competency: {
          select: {
            id: true,
            name: true,
            family: true
          }
        }
      }
    });

    res.status(201).json(mapping);
  } catch (error) {
    console.error('Error creating job-competency mapping:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update job-competency mapping
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { requiredLevel, isRequired } = req.body;

    // Check if mapping exists
    const existingMapping = await prisma.jobCompetency.findUnique({
      where: { id }
    });

    if (!existingMapping) {
      return res.status(404).json({ message: 'Job-competency mapping not found' });
    }

    const mapping = await prisma.jobCompetency.update({
      where: { id },
      data: {
        requiredLevel,
        isRequired
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            code: true
          }
        },
        competency: {
          select: {
            id: true,
            name: true,
            family: true
          }
        }
      }
    });

    res.json(mapping);
  } catch (error) {
    console.error('Error updating job-competency mapping:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete job-competency mapping
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if mapping exists
    const existingMapping = await prisma.jobCompetency.findUnique({
      where: { id }
    });

    if (!existingMapping) {
      return res.status(404).json({ message: 'Job-competency mapping not found' });
    }

    await prisma.jobCompetency.delete({
      where: { id }
    });

    res.json({ message: 'Job-competency mapping deleted successfully' });
  } catch (error) {
    console.error('Error deleting job-competency mapping:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Bulk create job-competency mappings
router.post('/bulk', async (req, res) => {
  try {
    const { mappings } = req.body;

    if (!Array.isArray(mappings) || mappings.length === 0) {
      return res.status(400).json({ message: 'Mappings array is required' });
    }

    const results = [];
    const errors = [];

    for (const mapping of mappings) {
      try {
        const { jobId, competencyId, requiredLevel, isRequired = true } = mapping;

        // Validate required fields
        if (!jobId || !competencyId || !requiredLevel) {
          errors.push({
            mapping,
            error: 'Job ID, Competency ID, and Required Level are required'
          });
          continue;
        }

        // Check if mapping already exists
        const existingMapping = await prisma.jobCompetency.findUnique({
          where: {
            jobId_competencyId: {
              jobId,
              competencyId
            }
          }
        });

        if (existingMapping) {
          errors.push({
            mapping,
            error: 'This job-competency mapping already exists'
          });
          continue;
        }

        const createdMapping = await prisma.jobCompetency.create({
          data: {
            jobId,
            competencyId,
            requiredLevel,
            isRequired
          },
          include: {
            job: {
              select: {
                id: true,
                title: true,
                code: true
              }
            },
            competency: {
              select: {
                id: true,
                name: true,
                family: true
              }
            }
          }
        });

        results.push(createdMapping);
      } catch (error) {
        errors.push({
          mapping,
          error: error.message
        });
      }
    }

    res.json({
      success: results.length,
      errors: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Error creating bulk job-competency mappings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get mapping statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalMappings = await prisma.jobCompetency.count();
    
    // Count by required level
    const levelStats = await prisma.jobCompetency.groupBy({
      by: ['requiredLevel'],
      _count: {
        id: true
      }
    });

    // Count by job
    const jobStats = await prisma.jobCompetency.groupBy({
      by: ['jobId'],
      _count: {
        id: true
      }
    });

    // Count by competency
    const competencyStats = await prisma.jobCompetency.groupBy({
      by: ['competencyId'],
      _count: {
        id: true
      }
    });

    res.json({
      total: totalMappings,
      byLevel: levelStats.map(stat => ({
        level: stat.requiredLevel,
        count: stat._count.id
      })),
      jobsWithCompetencies: jobStats.length,
      competenciesWithJobs: competencyStats.length
    });
  } catch (error) {
    console.error('Error fetching mapping stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
