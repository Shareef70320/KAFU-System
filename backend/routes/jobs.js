const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const xlsx = require('xlsx');

const prisma = new PrismaClient();
const router = express.Router();

// Configure multer for Excel upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  }
});

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
      SELECT j.*, 
             (
               SELECT COUNT(*)::int 
               FROM job_competencies jc 
               WHERE jc."jobId" = j.id
             ) as jcp_count
      FROM jobs j
      ${whereClause.replaceAll('FROM jobs', 'FROM jobs j')}
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

    // Get jobs with JCP (at least one job_competency mapping)
    const withJcpQuery = `
      SELECT COUNT(DISTINCT j.id) as count
      FROM jobs j
      JOIN job_competencies jc ON jc."jobId" = j.id
    `;
    const withJcpResult = await prisma.$queryRawUnsafe(withJcpQuery);
    const withJcp = parseInt(withJcpResult[0].count);

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
      withJcp: withJcp,
      units: units,
      divisions: divisions
    });
  } catch (error) {
    console.error('Error fetching job statistics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get employees without job codes (for assignment UI)
// MUST be before /:id route to avoid route conflict
// GET /api/jobs/employees-without-job
router.get('/employees-without-job', async (req, res) => {
  try {
    const { department, division, location, unit, limit = 100 } = req.query;

    let whereConditions = [
      "(job_code IS NULL OR job_code = '') OR (job_title IS NULL OR job_title = '')"
    ];

    if (department) {
      whereConditions.push(`department = '${String(department).replace(/'/g, "''")}'`);
    }
    if (division) {
      whereConditions.push(`division = '${String(division).replace(/'/g, "''")}'`);
    }
    if (location) {
      whereConditions.push(`location = '${String(location).replace(/'/g, "''")}'`);
    }
    if (unit) {
      whereConditions.push(`unit = '${String(unit).replace(/'/g, "''")}'`);
    }

    const employees = await prisma.$queryRawUnsafe(`
      SELECT 
        id, sid, first_name, last_name, email, 
        department, division, unit, location, 
        job_code, job_title
      FROM employees 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY last_name, first_name
      LIMIT ${parseInt(limit) || 100}
    `);

    const countResult = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as count 
      FROM employees 
      WHERE ${whereConditions.join(' AND ')}
    `);

    res.json({
      employees,
      total: countResult[0].count,
      shown: employees.length
    });
  } catch (error) {
    console.error('Error fetching employees without job:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Get job by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get job with jcp_count using raw query
    const jobs = await prisma.$queryRawUnsafe(`
      SELECT j.*, 
             (
               SELECT COUNT(*)::int 
               FROM job_competencies jc 
               WHERE jc."jobId" = j.id
             ) as jcp_count
      FROM jobs j
      WHERE j.id = $1
    `, id);

    if (jobs.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json(jobs[0]);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new job
router.post('/', async (req, res) => {
  try {
    const { 
      title, description, code, unit, division, department, section, location,
      budgetaryControl, externalInterfaces, internalInterfaces, jobScope,
      accountabilities, qualificationsExperience, restrictions, authority, demands
    } = req.body;

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
        location,
        budgetaryControl: budgetaryControl !== undefined ? budgetaryControl : null,
        externalInterfaces: externalInterfaces || null,
        internalInterfaces: internalInterfaces || null,
        jobScope: jobScope || null,
        accountabilities: accountabilities || null,
        qualificationsExperience: qualificationsExperience || null,
        restrictions: restrictions || null,
        authority: authority || null,
        demands: demands || null
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
    const { 
      title, description, code, unit, division, department, section, location, isActive,
      budgetaryControl, externalInterfaces, internalInterfaces, jobScope,
      accountabilities, qualificationsExperience, restrictions, authority, demands
    } = req.body;

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

    // Build update data object, only including fields that are provided
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (code !== undefined) updateData.code = code;
    if (unit !== undefined) updateData.unit = unit;
    if (division !== undefined) updateData.division = division;
    if (department !== undefined) updateData.department = department;
    if (section !== undefined) updateData.section = section;
    if (location !== undefined) updateData.location = location;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // JD fields
    if (budgetaryControl !== undefined) updateData.budgetaryControl = budgetaryControl;
    if (externalInterfaces !== undefined) updateData.externalInterfaces = externalInterfaces;
    if (internalInterfaces !== undefined) updateData.internalInterfaces = internalInterfaces;
    if (jobScope !== undefined) updateData.jobScope = jobScope;
    if (accountabilities !== undefined) updateData.accountabilities = accountabilities;
    if (qualificationsExperience !== undefined) updateData.qualificationsExperience = qualificationsExperience;
    if (restrictions !== undefined) updateData.restrictions = restrictions;
    if (authority !== undefined) updateData.authority = authority;
    if (demands !== undefined) updateData.demands = demands;

    const job = await prisma.job.update({
      where: { id },
      data: updateData
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

// Assign job to employees without job codes
// POST /api/jobs/:id/assign-to-employees
router.post('/:id/assign-to-employees', async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeIds, filters } = req.body;

    // Get the job
    const job = await prisma.job.findUnique({
      where: { id }
    });

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    let employeesToUpdate = [];

    if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
      // Assign to specific employees by ID
      const employees = await prisma.$queryRawUnsafe(`
        SELECT id FROM employees 
        WHERE id IN (${employeeIds.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',')})
      `);
      employeesToUpdate = employees.map(e => e.id);
    } else if (filters) {
      // Assign based on filters (department, division, etc.)
      let whereConditions = [
        "(job_code IS NULL OR job_code = '') OR (job_title IS NULL OR job_title = '')"
      ];

      if (filters.department) {
        whereConditions.push(`department = '${String(filters.department).replace(/'/g, "''")}'`);
      }
      if (filters.division) {
        whereConditions.push(`division = '${String(filters.division).replace(/'/g, "''")}'`);
      }
      if (filters.location) {
        whereConditions.push(`location = '${String(filters.location).replace(/'/g, "''")}'`);
      }
      if (filters.unit) {
        whereConditions.push(`unit = '${String(filters.unit).replace(/'/g, "''")}'`);
      }

      const employees = await prisma.$queryRawUnsafe(`
        SELECT id FROM employees 
        WHERE ${whereConditions.join(' AND ')}
      `);
      employeesToUpdate = employees.map(e => e.id);
    } else {
      // Default: assign to all employees without job_code or job_title
      const employees = await prisma.$queryRawUnsafe(`
        SELECT id FROM employees 
        WHERE (job_code IS NULL OR job_code = '') OR (job_title IS NULL OR job_title = '')
      `);
      employeesToUpdate = employees.map(e => e.id);
    }

    if (employeesToUpdate.length === 0) {
      return res.status(400).json({ 
        message: 'No employees found matching the criteria',
        employeesFound: 0
      });
    }

    // Update employees with the job code and title
    const employeeIdList = employeesToUpdate.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
    
    const updateResult = await prisma.$executeRawUnsafe(`
      UPDATE employees 
      SET 
        job_code = '${String(job.code).replace(/'/g, "''")}',
        job_title = '${String(job.title).replace(/'/g, "''")}',
        division = COALESCE(division, '${String(job.division || '').replace(/'/g, "''")}'),
        unit = COALESCE(unit, '${String(job.unit || '').replace(/'/g, "''")}'),
        department = COALESCE(department, '${String(job.department || '').replace(/'/g, "''")}'),
        section = COALESCE(section, '${String(job.section || '').replace(/'/g, "''")}'),
        location = COALESCE(location, '${String(job.location || '').replace(/'/g, "''")}'),
        updated_at = NOW()
      WHERE id IN (${employeeIdList})
    `);

    res.json({
      message: `Job assigned to ${employeesToUpdate.length} employee(s) successfully`,
      jobCode: job.code,
      jobTitle: job.title,
      employeesUpdated: employeesToUpdate.length
    });
  } catch (error) {
    console.error('Error assigning job to employees:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Bulk set JCP code for jobs
// POST /api/jobs/set-jcp-code
// body: { jobIds: string[], jcpCode: string }
router.post('/set-jcp-code', async (req, res) => {
  try {
    const { jobIds, jcpCode } = req.body;
    console.log('Setting JCP code:', { jobIds, jcpCode });
    
    if (!Array.isArray(jobIds) || jobIds.length === 0 || !jcpCode || String(jcpCode).trim() === '') {
      return res.status(400).json({ message: 'jobIds (non-empty) and jcpCode are required' });
    }

    // Ensure column exists (idempotent)
    await prisma.$executeRawUnsafe(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS jcp_code TEXT`);

    // Update jobs in bulk using Prisma (safe)
    const trimmedJcpCode = String(jcpCode).trim();
    const updated = await prisma.job.updateMany({
      where: { id: { in: jobIds } },
      data: { jcpCode: trimmedJcpCode }
    });

    console.log('JCP code updated:', { updated: updated.count, jcpCode: trimmedJcpCode, jobIds });
    res.json({ message: 'JCP code set for jobs', updated: updated.count, jcpCode: trimmedJcpCode });
  } catch (error) {
    console.error('Error setting JCP code for jobs:', error);
    console.error('Error details:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Import jobs from Excel file
// POST /api/jobs/import (multipart/form-data, field name: file)
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Please upload an Excel file.' });
    }

    // Read workbook from buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });

    if (!rows.length) {
      return res.status(400).json({ message: 'Uploaded Excel file is empty.' });
    }

    // Normalize headers
    const normalizedRows = rows.map((row) => {
      const normalized = {};
      for (const key of Object.keys(row)) {
        const normKey = String(key).trim().toLowerCase();
        normalized[normKey] = row[key];
      }
      return normalized;
    });

    const sample = normalizedRows[0];
    const possibleCodeKeys = ['job code', 'job_code', 'code', 'jobcode'];
    const codeKey = possibleCodeKeys.find((k) =>
      Object.prototype.hasOwnProperty.call(sample, k)
    );

    if (!codeKey) {
      return res.status(400).json({
        message: 'Could not detect Job Code column. Expected one of: Job Code, job_code, code, jobcode.'
      });
    }

    // Map rows to job objects
    const excelJobs = normalizedRows
      .map((row) => {
        const rawCode = row[codeKey];
        if (!rawCode) return null;
        const code = String(rawCode).trim();
        if (!code) return null;

        const title =
          row['job title'] ||
          row['title'] ||
          row['job_title'] ||
          row['job name'] ||
          null;

        const division = row['division'] || null;
        const department = row['department'] || null;
        const unit = row['unit'] || row['section'] || null;
        const location = row['location'] || null;
        const status = row['status'] || row['job status'] || null;

        return {
          code,
          title,
          division,
          department,
          unit,
          location,
          status,
          _raw: row
        };
      })
      .filter(Boolean);

    const excelCodesSet = new Set(excelJobs.map((j) => j.code));

    // Existing jobs
    const existingJobs = await prisma.job.findMany({
      select: { code: true }
    });

    const existingCodesSet = new Set(
      existingJobs
        .filter((j) => j.code)
        .map((j) => String(j.code).trim())
    );

    let existingCount = 0;
    let newCount = 0;
    const newJobs = [];
    const duplicatedInExcel = new Set();
    const seenExcelCodes = new Set();

    for (const job of excelJobs) {
      if (seenExcelCodes.has(job.code)) {
        duplicatedInExcel.add(job.code);
        continue;
      }
      seenExcelCodes.add(job.code);

      if (existingCodesSet.has(job.code)) {
        existingCount += 1;
      } else {
        newCount += 1;
        newJobs.push(job);
      }
    }

    // Insert new jobs
    const createdJobs = [];
    for (const job of newJobs) {
      try {
        const created = await prisma.job.create({
          data: {
            code: job.code,
            title: job.title || job.code,
            division: job.division,
            department: job.department,
            unit: job.unit,
            location: job.location
            // Note: we intentionally do NOT map any "status" column here,
            // as the Job model uses isActive with a default value.
          }
        });
        createdJobs.push(created);
      } catch (err) {
        console.error(`Failed to create job ${job.code}:`, err);
      }
    }

    return res.json({
      message: 'Jobs import completed',
      stats: {
        totalRows: rows.length,
        totalWithCode: excelJobs.length,
        uniqueCodesInExcel: excelCodesSet.size,
        existingInDb: existingCount,
        newJobsDetected: newCount,
        newJobsInserted: createdJobs.length,
        duplicateCodesInExcel: Array.from(duplicatedInExcel)
      }
    });
  } catch (error) {
    console.error('Error importing jobs from Excel:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

module.exports = router;
