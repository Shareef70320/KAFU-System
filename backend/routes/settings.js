const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all settings or by category
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    
    const where = category ? { category } : {};
    
    const settings = await prisma.appSetting.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    });
    
    // Parse JSON values
    const parsedSettings = settings.map(setting => ({
      ...setting,
      parsedValue: JSON.parse(setting.value)
    }));
    
    res.json({ settings: parsedSettings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get assessment cycle status (convenience endpoint) - MUST come before /:key route
router.get('/assessment-cycle/status', async (req, res) => {
  try {
    const { canCreateOrActivateAssessment, getCycleStatusMessage, getActiveCycle, getAssessmentCycles } = require('../utils/assessmentCycle');
    
    // Get employee SID from query parameter (userId or employeeSid)
    const employeeSid = req.query.userId || req.query.employeeSid || null;
    
    const cycles = await getAssessmentCycles();
    const activeCycle = await getActiveCycle();
    const statusMessage = await getCycleStatusMessage();
    // Pass employeeSid to check for exceptions - exceptions override cycle period
    const checkResult = await canCreateOrActivateAssessment(employeeSid);
    
    // Get active components from the active cycle
    const activeComponents = activeCycle?.components || {
      systemAssessment: true,
      employeeSelfAssessment: true,
      assessorAssessment: true,
      managerAssessment: true
    };
    
    res.json({
      cycles: cycles,
      activeCycle: activeCycle,
      statusMessage: statusMessage,
      canCreate: checkResult.allowed,
      reason: checkResult.reason,
      components: activeComponents,
      hasException: !!checkResult.exception // Indicate if user has an exception
    });
  } catch (error) {
    console.error('Error fetching assessment cycle status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific setting by key
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const setting = await prisma.appSetting.findUnique({
      where: { key }
    });
    
    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }
    
    res.json({
      ...setting,
      parsedValue: JSON.parse(setting.value)
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create or update a setting (upsert)
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description, category, updatedBy } = req.body;
    
    // Validate value is valid JSON
    let jsonValue;
    try {
      jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
      JSON.parse(jsonValue); // Validate it's valid JSON
    } catch (e) {
      return res.status(400).json({ message: 'Value must be valid JSON' });
    }
    
    // Upsert setting
    const setting = await prisma.appSetting.upsert({
      where: { key },
      update: {
        value: jsonValue,
        description: description || undefined,
        category: category || undefined,
        updatedBy: updatedBy || undefined,
        updatedAt: new Date()
      },
      create: {
        key,
        value: jsonValue,
        description: description || undefined,
        category: category || undefined,
        updatedBy: updatedBy || undefined
      }
    });
    
    res.json({
      ...setting,
      parsedValue: JSON.parse(setting.value)
    });
  } catch (error) {
    console.error('Error saving setting:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a setting
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    await prisma.appSetting.delete({
      where: { key }
    });
    
    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    console.error('Error deleting setting:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Setting not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

