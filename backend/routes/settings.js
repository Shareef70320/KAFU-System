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

// Get or initialize level terminology settings
router.get('/level-terminology', async (req, res) => {
  try {
    let setting = await prisma.appSetting.findUnique({
      where: { key: 'level_terminology' }
    });
    
    // Initialize with defaults if not exists
    if (!setting) {
      const defaultTerminology = {
        BASIC: { name: 'Aware', isActive: true },
        INTERMEDIATE: { name: 'Knowledge', isActive: true },
        ADVANCED: { name: 'Skilled', isActive: true },
        MASTERY: { name: 'Mastery', isActive: true }
      };
      
      setting = await prisma.appSetting.create({
        data: {
          key: 'level_terminology',
          value: JSON.stringify(defaultTerminology),
          description: 'Competency level display terminology',
          category: 'system'
        }
      });
    }
    
    const parsed = JSON.parse(setting.value);
    // Convert old format (string) to new format (object) if needed
    const converted = {};
    Object.keys(parsed).forEach(key => {
      if (typeof parsed[key] === 'string') {
        converted[key] = { name: parsed[key], isActive: true };
      } else {
        converted[key] = parsed[key];
      }
    });
    
    res.json({
      ...setting,
      parsedValue: converted
    });
  } catch (error) {
    console.error('Error fetching level terminology:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update level terminology settings
router.put('/level-terminology', async (req, res) => {
  try {
    const { BASIC, INTERMEDIATE, ADVANCED, MASTERY, isActive, updatedBy } = req.body;
    
    // Handle both old format (strings) and new format (objects with name and isActive)
    let terminology = {};
    
    if (typeof BASIC === 'string') {
      // Old format - convert to new format
      terminology = {
        BASIC: { name: BASIC.trim(), isActive: isActive?.BASIC !== false },
        INTERMEDIATE: { name: INTERMEDIATE.trim(), isActive: isActive?.INTERMEDIATE !== false },
        ADVANCED: { name: ADVANCED.trim(), isActive: isActive?.ADVANCED !== false },
        MASTERY: { name: MASTERY.trim(), isActive: isActive?.MASTERY !== false }
      };
    } else {
      // New format or missing - use defaults
      terminology = {
        BASIC: { name: (BASIC?.name || 'Aware').trim(), isActive: BASIC?.isActive !== false && (isActive?.BASIC !== false) },
        INTERMEDIATE: { name: (INTERMEDIATE?.name || 'Knowledge').trim(), isActive: INTERMEDIATE?.isActive !== false && (isActive?.INTERMEDIATE !== false) },
        ADVANCED: { name: (ADVANCED?.name || 'Skilled').trim(), isActive: ADVANCED?.isActive !== false && (isActive?.ADVANCED !== false) },
        MASTERY: { name: (MASTERY?.name || 'Mastery').trim(), isActive: MASTERY?.isActive !== false && (isActive?.MASTERY !== false) }
      };
    }
    
    // Validate all level names are provided
    if (!terminology.BASIC.name || !terminology.INTERMEDIATE.name || !terminology.ADVANCED.name || !terminology.MASTERY.name) {
      return res.status(400).json({ message: 'All level labels (BASIC, INTERMEDIATE, ADVANCED, MASTERY) are required' });
    }
    
    const setting = await prisma.appSetting.upsert({
      where: { key: 'level_terminology' },
      update: {
        value: JSON.stringify(terminology),
        updatedBy: updatedBy || undefined,
        updatedAt: new Date()
      },
      create: {
        key: 'level_terminology',
        value: JSON.stringify(terminology),
        description: 'Competency level display terminology',
        category: 'system',
        updatedBy: updatedBy || undefined
      }
    });
    
    res.json({
      ...setting,
      parsedValue: JSON.parse(setting.value)
    });
  } catch (error) {
    console.error('Error updating level terminology:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

