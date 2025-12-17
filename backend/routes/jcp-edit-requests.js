const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Create a new JCP edit request (for non-admin users)
router.post('/', async (req, res) => {
  try {
    const {
      jcpCode,
      requestedBy,
      requestedByName,
      editType,
      changes
    } = req.body;

    if (!jcpCode || !requestedBy || !editType || !changes) {
      return res.status(400).json({
        message: 'Missing required fields: jcpCode, requestedBy, editType, changes'
      });
    }

    // Verify JCP exists (at least one job with this JCP code)
    const jobsWithJcp = await prisma.$queryRawUnsafe(`
      SELECT id FROM jobs WHERE jcp_code = $1 LIMIT 1
    `, jcpCode);

    if (!jobsWithJcp || jobsWithJcp.length === 0) {
      return res.status(404).json({ message: 'JCP not found' });
    }

    // Create edit request
    const editRequest = await prisma.jCPEditRequest.create({
      data: {
        jcpCode,
        requestedBy,
        requestedByName: requestedByName || requestedBy,
        editType,
        changes: JSON.stringify(changes),
        status: 'PENDING'
      }
    });

    res.status(201).json({
      message: 'JCP edit request submitted successfully',
      editRequest: {
        ...editRequest,
        changes: JSON.parse(editRequest.changes)
      }
    });
  } catch (error) {
    console.error('Error creating JCP edit request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all JCP edit requests (for admin review)
router.get('/', async (req, res) => {
  try {
    const { status, jcpCode } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }
    if (jcpCode) {
      where.jcpCode = jcpCode;
    }

    const editRequests = await prisma.jCPEditRequest.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Parse changes JSON for each request
    const requestsWithParsedChanges = editRequests.map(req => ({
      ...req,
      changes: JSON.parse(req.changes)
    }));

    res.json(requestsWithParsedChanges);
  } catch (error) {
    console.error('Error fetching JCP edit requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get JCP edit requests for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const where = { requestedBy: userId };
    if (status) {
      where.status = status;
    }

    const editRequests = await prisma.jCPEditRequest.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    });

    const requestsWithParsedChanges = editRequests.map(req => ({
      ...req,
      changes: JSON.parse(req.changes)
    }));

    res.json(requestsWithParsedChanges);
  } catch (error) {
    console.error('Error fetching user JCP edit requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Approve an JCP edit request (admin only)
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewedBy, reviewNotes } = req.body;

    const editRequest = await prisma.jCPEditRequest.findUnique({
      where: { id }
    });

    if (!editRequest) {
      return res.status(404).json({ message: 'JCP edit request not found' });
    }

    if (editRequest.status !== 'PENDING') {
      return res.status(400).json({
        message: `JCP edit request is already ${editRequest.status}`
      });
    }

    const changes = JSON.parse(editRequest.changes);

    // Apply the changes based on edit type
    await applyJCPEditRequest(editRequest.jcpCode, editRequest.editType, changes);

    // Update edit request status
    const updated = await prisma.jCPEditRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes
      }
    });

    res.json({
      message: 'JCP edit request approved and changes applied',
      editRequest: {
        ...updated,
        changes: JSON.parse(updated.changes)
      }
    });
  } catch (error) {
    console.error('Error approving JCP edit request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reject an JCP edit request (admin only)
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewedBy, reviewNotes } = req.body;

    const editRequest = await prisma.jCPEditRequest.findUnique({
      where: { id }
    });

    if (!editRequest) {
      return res.status(404).json({ message: 'JCP edit request not found' });
    }

    if (editRequest.status !== 'PENDING') {
      return res.status(400).json({
        message: `JCP edit request is already ${editRequest.status}`
      });
    }

    const updated = await prisma.jCPEditRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes
      }
    });

    res.json({
      message: 'JCP edit request rejected',
      editRequest: {
        ...updated,
        changes: JSON.parse(updated.changes)
      }
    });
  } catch (error) {
    console.error('Error rejecting JCP edit request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper function to apply JCP edit request changes
async function applyJCPEditRequest(jcpCode, editType, changes) {
  // Get all jobs with this JCP code
  const jobs = await prisma.$queryRawUnsafe(`
    SELECT id FROM jobs WHERE jcp_code = $1
  `, jcpCode);

  const jobIds = jobs.map(j => j.id);

  switch (editType) {
    case 'MAPPING_ADD':
      // Add competency to all jobs with this JCP code
      for (const jobId of jobIds) {
        // Check if mapping already exists
        const existing = await prisma.jobCompetency.findUnique({
          where: {
            jobId_competencyId: {
              jobId,
              competencyId: changes.competencyId
            }
          }
        });

        if (!existing) {
          await prisma.jobCompetency.create({
            data: {
              jobId,
              competencyId: changes.competencyId,
              requiredLevel: changes.requiredLevel,
              isRequired: changes.isRequired !== false
            }
          });
        }
      }
      break;

    case 'MAPPING_UPDATE':
      // Update required level for all jobs with this JCP code
      for (const jobId of jobIds) {
        await prisma.jobCompetency.updateMany({
          where: {
            jobId,
            competencyId: changes.competencyId
          },
          data: {
            requiredLevel: changes.newRequiredLevel,
            isRequired: changes.isRequired !== false
          }
        });
      }
      break;

    case 'MAPPING_REMOVE':
      // Remove competency from all jobs with this JCP code
      for (const jobId of jobIds) {
        await prisma.jobCompetency.deleteMany({
          where: {
            jobId,
            competencyId: changes.competencyId
          }
        });
      }
      break;

    case 'MAPPING_BULK':
      // Handle bulk changes
      const { adds = [], updates = [], removes = [] } = changes;

      // Add new mappings
      for (const add of adds) {
        for (const jobId of jobIds) {
          const existing = await prisma.jobCompetency.findUnique({
            where: {
              jobId_competencyId: {
                jobId,
                competencyId: add.competencyId
              }
            }
          });

          if (!existing) {
            await prisma.jobCompetency.create({
              data: {
                jobId,
                competencyId: add.competencyId,
                requiredLevel: add.requiredLevel,
                isRequired: add.isRequired !== false
              }
            });
          }
        }
      }

      // Update existing mappings
      for (const update of updates) {
        for (const jobId of jobIds) {
          await prisma.jobCompetency.updateMany({
            where: {
              jobId,
              competencyId: update.competencyId
            },
            data: {
              requiredLevel: update.newRequiredLevel,
              isRequired: update.isRequired !== false
            }
          });
        }
      }

      // Remove mappings
      for (const remove of removes) {
        for (const jobId of jobIds) {
          await prisma.jobCompetency.deleteMany({
            where: {
              jobId,
              competencyId: remove.competencyId
            }
          });
        }
      }
      break;

    default:
      throw new Error(`Unknown JCP edit type: ${editType}`);
  }
}

module.exports = router;

