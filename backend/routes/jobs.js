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
      division = '',
      location = '',
      sortBy = '"createdAt"',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build search conditions for raw SQL
    let searchConditions = [];
    if (search) {
      searchConditions.push(`(
        title ILIKE '%${search}%' OR 
        description ILIKE '%${search}%' OR 
        code ILIKE '%${search}%' OR 
        unit ILIKE '%${search}%' OR 
        division ILIKE '%${search}%' OR 
        department ILIKE '%${search}%' OR 
        section ILIKE '%${search}%' OR
        location ILIKE '%${search}%' OR
        grade ILIKE '%${search}%'
      )`);
    }
    if (division) {
      searchConditions.push(`division ILIKE '%${division}%'`);
    }
    if (location) {
      searchConditions.push(`location ILIKE '%${location}%'`);
    }

    const whereClause = searchConditions.length > 0 ? `WHERE ${searchConditions.join(' AND ')}` : '';

    // Get jobs using raw SQL
    const jobsQuery = `
      SELECT * FROM jobs 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
      LIMIT ${take} OFFSET ${skip}
    `;
    
    const jobs = await prisma.$queryRawUnsafe(jobsQuery);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as count FROM jobs 
      ${whereClause}
    `;
    
    const totalResult = await prisma.$queryRawUnsafe(countQuery);
    const total = parseInt(totalResult[0].count);

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

// Get unique divisions and locations for filters
router.get('/filters', async (req, res) => {
  try {
    // Get unique divisions
    const divisionsQuery = `
      SELECT DISTINCT division 
      FROM jobs 
      WHERE division IS NOT NULL AND division != ''
      ORDER BY division
    `;
    const divisions = await prisma.$queryRawUnsafe(divisionsQuery);

    // Get unique locations
    const locationsQuery = `
      SELECT DISTINCT location 
      FROM jobs 
      WHERE location IS NOT NULL AND location != ''
      ORDER BY location
    `;
    const locations = await prisma.$queryRawUnsafe(locationsQuery);

    res.json({
      divisions: divisions.map(row => row.division),
      locations: locations.map(row => row.location)
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get job statistics
router.get('/stats', async (req, res) => {
  try {
    // Get total jobs count
    const totalJobsQuery = 'SELECT COUNT(*) as count FROM jobs';
    const totalJobsResult = await prisma.$queryRawUnsafe(totalJobsQuery);
    const totalJobs = parseInt(totalJobsResult[0].count);

    // Get active jobs count
    const activeJobsQuery = 'SELECT COUNT(*) as count FROM jobs WHERE "isActive" = true';
    const activeJobsResult = await prisma.$queryRawUnsafe(activeJobsQuery);
    const activeJobs = parseInt(activeJobsResult[0].count);

    // Get unique units count
    const unitsQuery = 'SELECT COUNT(DISTINCT unit) as count FROM jobs WHERE unit IS NOT NULL AND unit != \'\'';
    const unitsResult = await prisma.$queryRawUnsafe(unitsQuery);
    const units = parseInt(unitsResult[0].count);

    // Get unique divisions count
    const divisionsQuery = 'SELECT COUNT(DISTINCT division) as count FROM jobs WHERE division IS NOT NULL AND division != \'\'';
    const divisionsResult = await prisma.$queryRawUnsafe(divisionsQuery);
    const divisions = parseInt(divisionsResult[0].count);

    res.json({
      total: totalJobs,
      active: activeJobs,
      units: units,
      divisions: divisions
    });
  } catch (error) {
    console.error('Error fetching job statistics:', error);
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
    const { title, description, code, unit, division, department, section, location } = req.body;

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
        section,
        location
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
    const { title, description, code, unit, division, department, section, location, isActive } = req.body;

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
        location,
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

module.exports = router;
