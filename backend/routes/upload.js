const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();
function parseRelatedDocuments(value) {
  if (!value) return [];
  try {
    // Accept JSON array string
    if (typeof value === 'string' && value.trim().startsWith('[')) {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    }
  } catch (e) {
    // fallthrough to CSV parsing
  }
  // Accept comma/semicolon separated list
  return String(value)
    .split(/[,;\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// Authentication disabled for now
// router.use(authenticateToken);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const isCsvFile = fileExtension === '.csv';
    const isExcelFile = ['.xlsx', '.xls'].includes(fileExtension);
    
    if (allowedTypes.includes(file.mimetype) || isCsvFile || isExcelFile) {
      cb(null, true);
    } else {
      console.log('File rejected:', { mimetype: file.mimetype, originalname: file.originalname, extension: fileExtension });
      cb(new Error('Only CSV and Excel files are allowed'), false);
    }
  }
});

// Upload and process employees file
router.post('/employees', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const results = [];

    if (req.file.mimetype === 'text/csv' || path.extname(req.file.originalname).toLowerCase() === '.csv') {
      // Process CSV file
      const csvData = await parseCSV(filePath);
      
      for (const row of csvData) {
        try {
          // Map CSV columns to employee fields
          const employeeData = {
            employeeId: row['Employee ID'] || row['employee_id'] || row['EmployeeID'],
            firstName: row['First Name'] || row['first_name'] || row['FirstName'],
            lastName: row['Last Name'] || row['last_name'] || row['LastName'],
            email: row['Email'] || row['email'],
            phone: row['Phone'] || row['phone'],
            personalEmail: row['Personal Email'] || row['personal_email'],
            dateOfBirth: row['Date of Birth'] ? new Date(row['Date of Birth']) : null,
            gender: row['Gender'] || row['gender'],
            nationality: row['Nationality'] || row['nationality'],
            maritalStatus: row['Marital Status'] || row['marital_status'],
            address: row['Address'] || row['address'],
            city: row['City'] || row['city'],
            state: row['State'] || row['state'],
            country: row['Country'] || row['country'],
            postalCode: row['Postal Code'] || row['postal_code'],
            emergencyContact: row['Emergency Contact'] || row['emergency_contact'],
            emergencyPhone: row['Emergency Phone'] || row['emergency_phone'],
            emergencyRelation: row['Emergency Relation'] || row['emergency_relation'],
            department: row['Department'] || row['department'],
            position: row['Position'] || row['position'],
            jobTitle: row['Job Title'] || row['job_title'],
            employmentType: row['Employment Type'] || row['employment_type'],
            employmentStatus: row['Employment Status'] || row['employment_status'] || 'ACTIVE',
            hireDate: row['Hire Date'] ? new Date(row['Hire Date']) : null,
            terminationDate: row['Termination Date'] ? new Date(row['Termination Date']) : null,
            probationEndDate: row['Probation End Date'] ? new Date(row['Probation End Date']) : null,
            reportingManager: row['Reporting Manager'] || row['reporting_manager'],
            workLocation: row['Work Location'] || row['work_location'],
            workSchedule: row['Work Schedule'] || row['work_schedule'],
            employeeType: row['Employee Type'] || row['employee_type'],
            costCenter: row['Cost Center'] || row['cost_center'],
            payrollId: row['Payroll ID'] || row['payroll_id'],
            benefitsEligible: row['Benefits Eligible'] ? row['Benefits Eligible'].toLowerCase() === 'true' : true,
            insuranceNumber: row['Insurance Number'] || row['insurance_number'],
            taxId: row['Tax ID'] || row['tax_id'],
            socialSecurity: row['Social Security'] || row['social_security'],
            salary: row['Salary'] ? parseFloat(row['Salary']) : null,
            currency: row['Currency'] || row['currency'] || 'USD',
            payFrequency: row['Pay Frequency'] || row['pay_frequency'],
            bankAccount: row['Bank Account'] || row['bank_account'],
            bankName: row['Bank Name'] || row['bank_name'],
            notes: row['Notes'] || row['notes']
          };

          // Validate required fields
          if (!employeeData.employeeId || !employeeData.firstName || !employeeData.lastName || !employeeData.email) {
            results.push({
              row: row,
              success: false,
              error: 'Missing required fields: Employee ID, First Name, Last Name, or Email'
            });
            continue;
          }

          // Check for duplicates
          const existingEmployee = await prisma.employee.findFirst({
            where: {
              OR: [
                { employeeId: employeeData.employeeId },
                { email: employeeData.email }
              ]
            }
          });

          if (existingEmployee) {
            results.push({
              row: row,
              success: false,
              error: 'Employee ID or Email already exists'
            });
            continue;
          }

          // Create employee
          const employee = await prisma.employee.create({
            data: employeeData
          });

          results.push({
            row: row,
            success: true,
            employee: employee
          });

        } catch (rowError) {
          results.push({
            row: row,
            success: false,
            error: rowError.message
          });
        }
      }
    } else {
      return res.status(400).json({ message: 'Only CSV files are supported for employee uploads' });
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    res.json({
      message: `Employee upload completed. ${successCount} successful, ${errorCount} errors.`,
      results: results,
      summary: {
        total: results.length,
        successful: successCount,
        errors: errorCount
      }
    });

  } catch (error) {
    console.error('Error processing employee file:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Upload and process competencies file
router.post('/competencies', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const results = [];

    let csvData = [];
    if (req.file.mimetype === 'text/csv' || fileExtension === '.csv') {
      // Process CSV file
      csvData = await parseCSV(filePath);
    } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      // Process Excel file
      csvData = await parseExcel(filePath);
    } else {
      return res.status(400).json({ message: 'Only CSV and Excel files are supported for competency uploads' });
    }
      
      for (const row of csvData) {
        try {
          // Map CSV columns to competency fields
          const rawType = (row['Type'] || row['type'] || 'TECHNICAL').toString().trim().toUpperCase().replace(/\s+/g, '_');
          const TYPE_ALIASES = {
            'CERTIFICATION_&_COMPLIANCE': 'CERTIFICATION_AND_COMPLIANCE',
            'FINANCE_&_PROCUREMENT': 'FINANCE_AND_PROCUREMENT',
            'HR_&_ADMIN': 'HR_AND_ADMIN',
            'LEGAL_&_REGULATORY': 'LEGAL_AND_REGULATORY'
          };
          const normalizedType = TYPE_ALIASES[rawType] || rawType;
          const competencyData = {
            name: row['Competency Name'] || row['Competency Title'] || row['competency_name'] || row['Name'],
            type: normalizedType,
            family: row['Family'] || row['Competency Family'] || row['family'] || 'General',
            definition: row['Definition'] || row['Competency Definition'] || row['definition'],
            description: row['Description'] || row['description'],
            related_division: (row['Related Division'] || row['related_division'] || null),
            related_documents: parseRelatedDocuments(row['Related Documents'] || row['related_documents'])
          };

          // Validate required fields
          if (!competencyData.name || !competencyData.definition) {
            results.push({
              row: row,
              success: false,
              error: 'Missing required fields: Competency Name or Definition'
            });
            continue;
          }

          // Check for duplicates based on name + type + family combination
          const existingCompetency = await prisma.competency.findFirst({
            where: {
              name: competencyData.name,
              type: competencyData.type,
              family: competencyData.family
            }
          });

          if (existingCompetency) {
            results.push({
              row: row,
              success: false,
              error: `Competency with same name, type, and family already exists: ${competencyData.name} (${competencyData.type}, ${competencyData.family})`
            });
            continue;
          }

          // Create competency with levels
          const levels = [];
          const levelTypes = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'];
          const csvLevelColumns = ['Basic', 'Intermediate', 'Advanced', 'Mastery'];
          
          for (let i = 0; i < levelTypes.length; i++) {
            const levelType = levelTypes[i];
            const csvColumn = csvLevelColumns[i];
            
            // Try different column name variations
            const levelDescription = row[`${levelType} Description`] || 
                                   row[`${levelType.toLowerCase()}_description`] || 
                                   row[csvColumn] || 
                                   row[`${csvColumn} Description`] || 
                                   '';
            
            if (levelDescription && levelDescription.trim()) {
              levels.push({
                level: levelType,
                title: levelType,
                description: levelDescription.trim(),
                indicators: []
              });
            }
          }

          const competency = await prisma.competency.create({
            data: {
              ...competencyData,
              levels: {
                create: levels
              }
            },
            include: {
              levels: true
            }
          });

          results.push({
            row: row,
            success: true,
            competency: competency
          });

        } catch (rowError) {
          results.push({
            row: row,
            success: false,
            error: rowError.message
          });
        }
      }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    res.json({
      message: `Competency upload completed. ${successCount} successful, ${errorCount} errors.`,
      results: results,
      summary: {
        total: results.length,
        successful: successCount,
        errors: errorCount
      }
    });

  } catch (error) {
    console.error('Error processing competency file:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Upload and process users file
router.post('/users', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    let users = [];
    let errors = [];

    try {
      if (fileExtension === '.csv') {
        users = await parseCSV(filePath);
      } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        users = await parseExcel(filePath);
      } else {
        return res.status(400).json({ message: 'Unsupported file format' });
      }

      // Validate users data
      const validationResult = validateUsersData(users);
      if (validationResult.errors.length > 0) {
        return res.status(400).json({
          message: 'Validation errors found',
          errors: validationResult.errors
        });
      }

      // Process users in batches
      const batchSize = 100;
      const processedUsers = [];
      
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        const batchResult = await processUserBatch(batch);
        processedUsers.push(...batchResult.processed);
        errors.push(...batchResult.errors);
      }

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      res.json({
        message: 'File processed successfully',
        processed: processedUsers.length,
        errors: errors.length,
        details: {
          processedUsers,
          errors: errors.slice(0, 10) // Limit errors in response
        }
      });

    } catch (parseError) {
      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      console.error('File parsing error:', parseError);
      res.status(400).json({ 
        message: 'Error parsing file',
        error: parseError.message 
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper function to parse CSV
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Helper function to parse Excel
async function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}

// Helper function to validate users data
function validateUsersData(users) {
  const errors = [];
  const requiredFields = ['email', 'firstName', 'lastName'];
  const validRoles = ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'];

  users.forEach((user, index) => {
    const rowNumber = index + 2; // +2 because index starts at 0 and we skip header

    // Check required fields
    requiredFields.forEach(field => {
      if (!user[field] || user[field].toString().trim() === '') {
        errors.push(`Row ${rowNumber}: ${field} is required`);
      }
    });

    // Validate email format
    if (user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      errors.push(`Row ${rowNumber}: Invalid email format`);
    }

    // Validate role
    if (user.role && !validRoles.includes(user.role.toUpperCase())) {
      errors.push(`Row ${rowNumber}: Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    // Normalize data
    user.email = user.email?.toString().trim().toLowerCase();
    user.firstName = user.firstName?.toString().trim();
    user.lastName = user.lastName?.toString().trim();
    user.role = user.role?.toString().toUpperCase() || 'STAFF';
    user.groupName = user.groupName?.toString().trim();
  });

  return { errors, users };
}

// Helper function to process user batch
async function processUserBatch(users) {
  const processed = [];
  const errors = [];

  for (const userData of users) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        errors.push(`User with email ${userData.email} already exists`);
        continue;
      }

      // Handle group assignment
      let groupId = null;
      if (userData.groupName) {
        const group = await prisma.group.findFirst({
          where: { name: userData.groupName }
        });
        
        if (group) {
          groupId = group.id;
        } else {
          // Create group if it doesn't exist
          const newGroup = await prisma.group.create({
            data: { name: userData.groupName }
          });
          groupId = newGroup.id;
        }
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          groupId
        }
      });

      processed.push({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      });

    } catch (error) {
      errors.push(`Error processing user ${userData.email}: ${error.message}`);
    }
  }

  return { processed, errors };
}

module.exports = router;
