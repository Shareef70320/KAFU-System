const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Get all jobs with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      unit = '', 
      division = '',
      department = '',
      section = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause for filtering
    const where = {
      AND: [
        search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { unit: { contains: search, mode: 'insensitive' } },
            { division: { contains: search, mode: 'insensitive' } },
            { department: { contains: search, mode: 'insensitive' } },
            { section: { contains: search, mode: 'insensitive' } }
          ]
        } : {},
        unit ? { unit: { contains: unit, mode: 'insensitive' } } : {},
        division ? { division: { contains: division, mode: 'insensitive' } } : {},
        department ? { department: { contains: department, mode: 'insensitive' } } : {},
        section ? { section: { contains: section, mode: 'insensitive' } } : {}
      ]
    };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder
        }
      }),
      prisma.job.count({ where })
    ]);

    res.json({
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get job by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const job = await prisma.job.findUnique({
      where: { id }
    });

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new job
router.post('/', async (req, res) => {
  try {
    const { title, description, code, unit, division, department, section } = req.body;

    // Validate required fields
    if (!title || !code) {
      return res.status(400).json({ message: 'Title and Code are required' });
    }

    // Check for duplicate code
    const existingJob = await prisma.job.findUnique({
      where: { code }
    });

    if (existingJob) {
      return res.status(400).json({ message: 'Job code already exists' });
    }

    const job = await prisma.job.create({
      data: {
        title,
        description,
        code,
        unit,
        division,
        department,
        section
      }
    });

    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update job
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, code, unit, division, department, section, isActive } = req.body;

    // Check if job exists
    const existingJob = await prisma.job.findUnique({
      where: { id }
    });

    if (!existingJob) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check for duplicate code if being updated
    if (code && code !== existingJob.code) {
      const duplicateJob = await prisma.job.findUnique({
        where: { code }
      });
      
      if (duplicateJob) {
        return res.status(400).json({ message: 'Job code already exists' });
      }
    }

    const job = await prisma.job.update({
      where: { id },
      data: {
        title,
        description,
        code,
        unit,
        division,
        department,
        section,
        isActive
      }
    });

    res.json(job);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete job
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if job exists
    const existingJob = await prisma.job.findUnique({
      where: { id }
    });

    if (!existingJob) {
      return res.status(404).json({ message: 'Job not found' });
    }

    await prisma.job.delete({
      where: { id }
    });

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get job statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalJobs = await prisma.job.count();
    const activeJobs = await prisma.job.count({
      where: { isActive: true }
    });

    // Unit breakdown
    const unitStats = await prisma.job.groupBy({
      by: ['unit'],
      _count: {
        id: true
      },
      where: {
        unit: { not: null }
      }
    });

    // Division breakdown
    const divisionStats = await prisma.job.groupBy({
      by: ['division'],
      _count: {
        id: true
      },
      where: {
        division: { not: null }
      }
    });

    // Department breakdown
    const departmentStats = await prisma.job.groupBy({
      by: ['department'],
      _count: {
        id: true
      },
      where: {
        department: { not: null }
      }
    });

    res.json({
      total: totalJobs,
      active: activeJobs,
      units: unitStats.map(unit => ({
        name: unit.unit,
        count: unit._count.id
      })),
      divisions: divisionStats.map(division => ({
        name: division.division,
        count: division._count.id
      })),
      departments: departmentStats.map(department => ({
        name: department.department,
        count: department._count.id
      }))
    });
  } catch (error) {
    console.error('Error fetching job stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
