const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Create a new edit request (for non-admin users)
router.post('/', async (req, res) => {
  try {
    const {
      competencyId,
      requestedBy,
      requestedByName,
      editType,
      changes
    } = req.body;

    if (!competencyId || !requestedBy || !editType || !changes) {
      return res.status(400).json({
        message: 'Missing required fields: competencyId, requestedBy, editType, changes'
      });
    }

    // Verify competency exists
    const competency = await prisma.competency.findUnique({
      where: { id: competencyId }
    });

    if (!competency) {
      return res.status(404).json({ message: 'Competency not found' });
    }

    // Create edit request
    const editRequest = await prisma.competencyEditRequest.create({
      data: {
        competencyId,
        requestedBy,
        requestedByName: requestedByName || requestedBy,
        editType,
        changes: JSON.stringify(changes),
        status: 'PENDING'
      }
    });

    res.status(201).json({
      message: 'Edit request submitted successfully',
      editRequest: {
        ...editRequest,
        changes: JSON.parse(editRequest.changes)
      }
    });
  } catch (error) {
    console.error('Error creating edit request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all pending edit requests (for admin review)
router.get('/', async (req, res) => {
  try {
    const { status, competencyId } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }
    if (competencyId) {
      where.competencyId = competencyId;
    }

    const editRequests = await prisma.competencyEditRequest.findMany({
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
    console.error('Error fetching edit requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get edit requests for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const where = { requestedBy: userId };
    if (status) {
      where.status = status;
    }

    const editRequests = await prisma.competencyEditRequest.findMany({
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
    console.error('Error fetching user edit requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Approve an edit request (admin only)
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewedBy, reviewNotes } = req.body;

    const editRequest = await prisma.competencyEditRequest.findUnique({
      where: { id }
    });

    if (!editRequest) {
      return res.status(404).json({ message: 'Edit request not found' });
    }

    if (editRequest.status !== 'PENDING') {
      return res.status(400).json({
        message: `Edit request is already ${editRequest.status}`
      });
    }

    const changes = JSON.parse(editRequest.changes);

    // Apply the changes based on edit type
    await applyEditRequest(editRequest.competencyId, editRequest.editType, changes);

    // Update edit request status
    const updated = await prisma.competencyEditRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes
      }
    });

    res.json({
      message: 'Edit request approved and changes applied',
      editRequest: {
        ...updated,
        changes: JSON.parse(updated.changes)
      }
    });
  } catch (error) {
    console.error('Error approving edit request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reject an edit request (admin only)
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewedBy, reviewNotes } = req.body;

    const editRequest = await prisma.competencyEditRequest.findUnique({
      where: { id }
    });

    if (!editRequest) {
      return res.status(404).json({ message: 'Edit request not found' });
    }

    if (editRequest.status !== 'PENDING') {
      return res.status(400).json({
        message: `Edit request is already ${editRequest.status}`
      });
    }

    const updated = await prisma.competencyEditRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes
      }
    });

    res.json({
      message: 'Edit request rejected',
      editRequest: {
        ...updated,
        changes: JSON.parse(updated.changes)
      }
    });
  } catch (error) {
    console.error('Error rejecting edit request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper function to apply edit request changes
async function applyEditRequest(competencyId, editType, changes) {
  switch (editType) {
    case 'DEFINITION':
      await prisma.competency.update({
        where: { id: competencyId },
        data: { definition: changes.newValue }
      });
      break;

    case 'LEVEL_DESCRIPTION':
      await prisma.competencyLevel.update({
        where: { id: changes.levelId },
        data: { description: changes.newValue }
      });
      break;

    case 'LEVEL_INDICATORS':
      await prisma.competencyLevel.update({
        where: { id: changes.levelId },
        data: { indicators: changes.newValue }
      });
      break;

    case 'ELEMENT_ADD':
      await prisma.competencyElement.create({
        data: {
          competencyLevelId: changes.levelId,
          name: changes.name,
          description: changes.description,
          order: changes.order || 0
        }
      });
      break;

    case 'ELEMENT_EDIT':
      await prisma.competencyElement.update({
        where: { id: changes.elementId },
        data: {
          name: changes.newValue?.name || changes.name,
          description: changes.newValue?.description || changes.description || ''
        }
      });
      break;

    case 'ELEMENT_DELETE':
      await prisma.competencyElement.delete({
        where: { id: changes.elementId }
      });
      break;

    case 'INDICATOR_ADD':
      await prisma.competencyPerformanceIndicator.create({
        data: {
          elementId: changes.elementId,
          action: changes.action,
          order: changes.order || 0
        }
      });
      break;

    case 'INDICATOR_EDIT':
      await prisma.competencyPerformanceIndicator.update({
        where: { id: changes.indicatorId },
        data: { action: changes.newValue || changes.action }
      });
      break;

    case 'INDICATOR_DELETE':
      await prisma.competencyPerformanceIndicator.delete({
        where: { id: changes.indicatorId }
      });
      break;

    default:
      throw new Error(`Unknown edit type: ${editType}`);
  }
}

module.exports = router;

