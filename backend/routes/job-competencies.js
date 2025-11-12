const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Helper: clone mappings from one job to many jobs in a transaction
async function cloneJobCompetencyMappings(sourceJobId, targetJobIds, options = { replace: true }) {
  return await prisma.$transaction(async (tx) => {
    // Load source mappings
    const sourceMappings = await tx.jobCompetency.findMany({
      where: { jobId: sourceJobId },
      select: {
        competencyId: true,
        requiredLevel: true,
        isRequired: true
      }
    });

    const results = [];

    for (const targetJobId of targetJobIds) {
      if (options.replace) {
        await tx.jobCompetency.deleteMany({
          where: { jobId: targetJobId }
        });
      }

      // Create new mappings for target job, avoiding duplicates within the batch
      for (const m of sourceMappings) {
        // Ensure we don't violate unique constraints (jobId, competencyId)
        const existing = await tx.jobCompetency.findUnique({
          where: {
            jobId_competencyId: {
              jobId: targetJobId,
              competencyId: m.competencyId
            }
          }
        });
        if (existing) continue;

        const created = await tx.jobCompetency.create({
          data: {
            jobId: targetJobId,
            competencyId: m.competencyId,
            requiredLevel: m.requiredLevel,
            isRequired: m.isRequired
          }
        });
        results.push(created);
      }
    }

    return { copiedFrom: sourceJobId, targets: targetJobIds, createdCount: results.length };
  });
}

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

// Group-apply a Job Competency Profile (JCP) from one job to multiple jobs
// POST /api/job-competencies/group-apply
// body: { sourceJobId: string, targetJobIds: string[], replace?: boolean }
router.post('/group-apply', async (req, res) => {
  try {
    const { sourceJobId, targetJobIds, replace = true } = req.body;

    if (!sourceJobId || !Array.isArray(targetJobIds) || targetJobIds.length === 0) {
      return res.status(400).json({ message: 'sourceJobId and non-empty targetJobIds are required' });
    }

    if (targetJobIds.includes(sourceJobId)) {
      return res.status(400).json({ message: 'sourceJobId cannot be included in targetJobIds' });
    }

    // Validate source exists
    const sourceJob = await prisma.job.findUnique({ where: { id: sourceJobId } });
    if (!sourceJob) {
      return res.status(404).json({ message: 'Source job not found' });
    }

    // Validate targets exist
    const targetJobs = await prisma.job.findMany({
      where: { id: { in: targetJobIds } },
      select: { id: true }
    });
    const foundIds = new Set(targetJobs.map(j => j.id));
    const missing = targetJobIds.filter(id => !foundIds.has(id));
    if (missing.length > 0) {
      return res.status(404).json({ message: 'One or more target jobs not found', missing });
    }

    // Perform clone
    const result = await cloneJobCompetencyMappings(sourceJobId, targetJobIds, { replace: Boolean(replace) });

    // Return summary
    res.json({
      message: 'JCP applied to target jobs successfully',
      sourceJobId,
      targetJobIds,
      createdMappings: result.createdCount,
      replace: Boolean(replace),
      // For convenience, expose a deterministic JCP code suggestion:
      // If single job → its code. If multiple jobs → use the source job code.
      suggestedJcpCode: sourceJob.code || null
    });
  } catch (error) {
    console.error('Error group-applying JCP:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get mappings for a specific job by job ID
router.get('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const mappings = await prisma.jobCompetency.findMany({
      where: { jobId },
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
            definition: true,
            levels: {
              select: {
                id: true,
                level: true,
                title: true,
                description: true,
                indicators: true
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

// Get mappings for a specific job by job code
router.get('/job-code/:jobCode', async (req, res) => {
  try {
    const { jobCode } = req.params;
    
    const mappings = await prisma.jobCompetency.findMany({
      where: {
        job: {
          code: jobCode
        }
      },
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
            definition: true,
            levels: {
              select: {
                id: true,
                level: true,
                title: true,
                description: true,
                indicators: true
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
    console.error('Error fetching job competencies by code:', error);
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
            code: true,
            jcpCode: true
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

    // Ensure job has a JCP code if it has mappings
    if (mapping.job && (!mapping.job.jcpCode || mapping.job.jcpCode.trim() === '')) {
      try {
        await prisma.job.update({
          where: { id: jobId },
          data: { jcpCode: mapping.job.code }
        });
        console.log(`Auto-set JCP code for job ${mapping.job.code} (${jobId})`);
      } catch (jcpError) {
        console.warn(`Failed to auto-set JCP code for job ${jobId}:`, jcpError);
        // Don't fail the whole operation if JCP code setting fails
      }
    }

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

    // Ensure all jobs with mappings have a JCP code
    // Get unique job IDs from successful mappings
    const jobIdsWithMappings = [...new Set(results.map(r => r.jobId))];
    for (const jobId of jobIdsWithMappings) {
      try {
        const job = await prisma.job.findUnique({
          where: { id: jobId },
          select: { id: true, code: true, jcpCode: true }
        });
        if (job && (!job.jcpCode || job.jcpCode.trim() === '')) {
          // Set JCP code to job code if not set
          await prisma.job.update({
            where: { id: jobId },
            data: { jcpCode: job.code }
          });
          console.log(`Auto-set JCP code for job ${job.code} (${jobId})`);
        }
      } catch (jcpError) {
        console.warn(`Failed to auto-set JCP code for job ${jobId}:`, jcpError);
        // Don't fail the whole operation if JCP code setting fails
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
