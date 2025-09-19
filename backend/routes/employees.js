const express = require('express');
const { PrismaClient, Prisma } = require('@prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// Authentication disabled for now
// router.use(authenticateToken);

// Get all employees with pagination and filters
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      division = '', 
      location = '',
      jobCode = '',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build search conditions for raw SQL
    let searchConditions = [];
    if (search) {
      searchConditions.push(`(
        first_name ILIKE '%${search}%' OR 
        last_name ILIKE '%${search}%' OR 
        email ILIKE '%${search}%' OR 
        id ILIKE '%${search}%' OR 
        job_title ILIKE '%${search}%' OR 
        division ILIKE '%${search}%' OR 
        location ILIKE '%${search}%' OR 
        sid ILIKE '%${search}%' OR 
        job_code ILIKE '%${search}%'
      )`);
    }
    if (division) {
      searchConditions.push(`division ILIKE '%${division}%'`);
    }
    if (location) {
      searchConditions.push(`location ILIKE '%${location}%'`);
    }
    if (jobCode) {
      searchConditions.push(`job_code = '${jobCode}'`);
    }

    const whereClause = searchConditions.length > 0 ? `WHERE ${searchConditions.join(' AND ')}` : '';

    // Get employees using raw SQL
    const employeesQuery = `
      SELECT * FROM employees 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
      LIMIT ${take} OFFSET ${skip}
    `;
    
    const employees = await prisma.$queryRawUnsafe(employeesQuery);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as count FROM employees 
      ${whereClause}
    `;
    
    const totalResult = await prisma.$queryRawUnsafe(countQuery);
    const total = parseInt(totalResult[0].count);

    res.json({
      employees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all unique divisions and locations for filters
router.get('/filters', async (req, res) => {
  try {
    // Get unique divisions
    const divisionsQuery = `
      SELECT DISTINCT division 
      FROM employees 
      WHERE division IS NOT NULL AND division != ''
      ORDER BY division
    `;
    const divisions = await prisma.$queryRawUnsafe(divisionsQuery);

    // Get unique locations
    const locationsQuery = `
      SELECT DISTINCT location 
      FROM employees 
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

// Get single employee
router.get('/:sid', async (req, res) => {
  try {
    const { sid } = req.params;
    
    const employees = await prisma.$queryRawUnsafe(
      'SELECT * FROM employees WHERE sid = $1', sid
    );

    if (employees.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(employees[0]);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Create new employee
router.post('/', async (req, res) => {
  try {
    const employeeData = req.body;

    // Check if employee ID already exists
    if (employeeData.id) {
      const existingEmployee = await prisma.$queryRawUnsafe(
        'SELECT id FROM employees WHERE id = $1', employeeData.id
      );
      
      if (existingEmployee.length > 0) {
        return res.status(400).json({ message: 'Employee ID already exists' });
      }
    }

    // Check if email already exists
    if (employeeData.email) {
      const existingEmail = await prisma.$queryRawUnsafe(
        'SELECT id FROM employees WHERE email = $1', employeeData.email
      );
      
      if (existingEmail.length > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    // For now, just return success - we'll implement create later
    res.status(201).json({ message: 'Employee creation not implemented yet' });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update employee
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if employee exists
    const existingEmployee = await prisma.$queryRawUnsafe(
      'SELECT id FROM employees WHERE id = $1', id
    );
    
    if (existingEmployee.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Validate line_manager_sid if provided
    if (updateData.line_manager_sid) {
      const managerExists = await prisma.$queryRawUnsafe(
        'SELECT id FROM employees WHERE sid = $1', updateData.line_manager_sid
      );
      
      if (managerExists.length === 0) {
        return res.status(400).json({ message: 'Line manager SID not found' });
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'first_name', 'last_name', 'email', 'sid', 'erp_id', 'job_code', 'job_title',
      'division', 'unit', 'department', 'section', 'sub_section', 'position_remark',
      'grade', 'location', 'photo_url', 'line_manager_sid', 'employment_status',
      'is_active'
    ];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    // Add updated_at
    updateFields.push(`updated_at = NOW()`);

    // Add employee ID as last parameter
    values.push(id);

    const updateQuery = `
      UPDATE employees 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await prisma.$queryRawUnsafe(updateQuery, ...values);

    res.json({
      message: 'Employee updated successfully',
      employee: result[0]
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete employee
router.delete('/:id', async (req, res) => {
  try {
    res.status(501).json({ message: 'Employee deletion not implemented yet' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get hierarchical team members for a manager
router.get('/hierarchy/:managerSid', async (req, res) => {
  try {
    const { managerSid } = req.params;
    
    // Get all employees in the hierarchy (direct and indirect reports)
    const hierarchyQuery = `
      WITH RECURSIVE manager_hierarchy AS (
        -- Base case: direct reports
        SELECT sid, first_name, last_name, job_title, job_code, division, unit, department, 
               section, location, grade, employment_status, line_manager_sid, 1 as level
        FROM employees 
        WHERE line_manager_sid = $1
        
        UNION ALL
        
        -- Recursive case: indirect reports
        SELECT e.sid, e.first_name, e.last_name, e.job_title, e.job_code, e.division, e.unit, 
               e.department, e.section, e.location, e.grade, e.employment_status, 
               e.line_manager_sid, mh.level + 1
        FROM employees e
        INNER JOIN manager_hierarchy mh ON e.line_manager_sid = mh.sid
      )
      SELECT * FROM manager_hierarchy
      ORDER BY level, first_name, last_name
    `;
    
    const hierarchyMembers = await prisma.$queryRawUnsafe(hierarchyQuery, managerSid);
    
    res.json({
      managerSid,
      hierarchyMembers,
      totalMembers: hierarchyMembers.length
    });
  } catch (error) {
    console.error('Error fetching hierarchy:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get employee statistics
router.get('/stats/overview', async (req, res) => {
  try {
    // Get basic counts
    const totalResult = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM employees');
    const totalEmployees = parseInt(totalResult[0].count);

    const activeResult = await prisma.$queryRawUnsafe("SELECT COUNT(*) as count FROM employees WHERE employment_status = 'ACTIVE'");
    const activeEmployees = parseInt(activeResult[0].count);

    const inactiveResult = await prisma.$queryRawUnsafe("SELECT COUNT(*) as count FROM employees WHERE employment_status = 'INACTIVE'");
    const inactiveEmployees = parseInt(inactiveResult[0].count);

    const terminatedResult = await prisma.$queryRawUnsafe("SELECT COUNT(*) as count FROM employees WHERE employment_status = 'TERMINATED'");
    const terminatedEmployees = parseInt(terminatedResult[0].count);

    // Department breakdown
    const departmentStats = await prisma.$queryRawUnsafe(`
      SELECT department as name, COUNT(*) as count 
      FROM employees 
      WHERE department IS NOT NULL 
      GROUP BY department 
      ORDER BY count DESC
    `);

    // Division breakdown
    const divisionStats = await prisma.$queryRawUnsafe(`
      SELECT division as name, COUNT(*) as count 
      FROM employees 
      WHERE division IS NOT NULL 
      GROUP BY division 
      ORDER BY count DESC
    `);

    res.json({
      total: totalEmployees,
      active: activeEmployees,
      inactive: inactiveEmployees,
      terminated: terminatedEmployees,
      departments: departmentStats.map(dept => ({
        name: dept.name,
        count: parseInt(dept.count)
      })),
      divisions: divisionStats.map(div => ({
        name: div.name,
        count: parseInt(div.count)
      }))
    });
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
