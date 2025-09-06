const express = require('express');
const { PrismaClient } = require('@prisma/client');
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
      department = '', 
      employmentStatus = '',
      employmentType = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {
      AND: [
        {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { employeeId: { contains: search, mode: 'insensitive' } },
            { jobTitle: { contains: search, mode: 'insensitive' } },
            { department: { contains: search, mode: 'insensitive' } }
          ]
        },
        department ? { department: { contains: department, mode: 'insensitive' } } : {},
        employmentStatus ? { employmentStatus } : {},
        employmentType ? { employmentType } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    };

    // Get employees with relations
    const employees = await prisma.employee.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            role: true,
            isActive: true
          }
        },
        group: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      skip,
      take
    });

    // Get total count for pagination
    const total = await prisma.employee.count({ where });

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

// Get single employee
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            isActive: true
          }
        },
        group: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(employee);
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
    if (employeeData.employeeId) {
      const existingEmployee = await prisma.employee.findUnique({
        where: { employeeId: employeeData.employeeId }
      });
      
      if (existingEmployee) {
        return res.status(400).json({ message: 'Employee ID already exists' });
      }
    }

    // Check if email already exists
    if (employeeData.email) {
      const existingEmail = await prisma.employee.findUnique({
        where: { email: employeeData.email }
      });
      
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const employee = await prisma.employee.create({
      data: employeeData,
      include: {
        user: true,
        group: true
      }
    });

    res.status(201).json(employee);
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
    const existingEmployee = await prisma.employee.findUnique({
      where: { id }
    });

    if (!existingEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check for duplicate employee ID if being updated
    if (updateData.employeeId && updateData.employeeId !== existingEmployee.employeeId) {
      const duplicateEmployee = await prisma.employee.findUnique({
        where: { employeeId: updateData.employeeId }
      });
      
      if (duplicateEmployee) {
        return res.status(400).json({ message: 'Employee ID already exists' });
      }
    }

    // Check for duplicate email if being updated
    if (updateData.email && updateData.email !== existingEmployee.email) {
      const duplicateEmail = await prisma.employee.findUnique({
        where: { email: updateData.email }
      });
      
      if (duplicateEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
        group: true
      }
    });

    res.json(employee);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete employee
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    await prisma.employee.delete({
      where: { id }
    });

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get employee statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalEmployees = await prisma.employee.count();
    const activeEmployees = await prisma.employee.count({
      where: { employmentStatus: 'ACTIVE' }
    });
    const inactiveEmployees = await prisma.employee.count({
      where: { employmentStatus: 'INACTIVE' }
    });
    const terminatedEmployees = await prisma.employee.count({
      where: { employmentStatus: 'TERMINATED' }
    });

    // Department breakdown
    const departmentStats = await prisma.employee.groupBy({
      by: ['department'],
      _count: {
        id: true
      },
      where: {
        department: {
          not: null
        }
      }
    });

    // Employment type breakdown
    const employmentTypeStats = await prisma.employee.groupBy({
      by: ['employmentType'],
      _count: {
        id: true
      }
    });

    res.json({
      total: totalEmployees,
      active: activeEmployees,
      inactive: inactiveEmployees,
      terminated: terminatedEmployees,
      departments: departmentStats.map(dept => ({
        name: dept.department,
        count: dept._count.id
      })),
      employmentTypes: employmentTypeStats.map(type => ({
        type: type.employmentType,
        count: type._count.id
      }))
    });
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
