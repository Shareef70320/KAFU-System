#!/usr/bin/env node

/**
 * Full Employee Data Import Script
 * 
 * Imports employee data from EmployeeData_Full.xlsx with:
 * - All new fields from Excel
 * - Calculated fields: OAMC EXPERIENCE, TOTAL EXPERIANCE, AGE
 * - Remapping of existing employees by SID
 * - Clearing affected dependent data for changed employees
 */

const XLSX = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Date parsing function for "DD-MMM-YYYY" format
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Handle Excel date numbers
  if (typeof dateStr === 'number') {
    // Excel date serial number (days since 1900-01-01)
    const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
    const date = new Date(excelEpoch.getTime() + dateStr * 24 * 60 * 60 * 1000);
    return date;
  }
  
  // Handle string dates
  if (typeof dateStr === 'string') {
    // Try "DD-MMM-YYYY" format (e.g., "10-APR-1980")
    const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})[-/](\w{3})[-/](\d{4})$/i);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      const monthMap = {
        'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
        'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
      };
      const monthNum = monthMap[month.toUpperCase()];
      if (monthNum !== undefined) {
        return new Date(parseInt(year), monthNum, parseInt(day));
      }
    }
    
    // Try ISO format
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
  }
  
  return null;
}

// Calculate years between two dates
function calculateYears(startDate, endDate = new Date()) {
  if (!startDate) return null;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  
  const years = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.round(years * 100) / 100; // Round to 2 decimal places
}

// Split full name into first and last name
function splitName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return { firstName: '', lastName: '' };
  }
  
  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  } else if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  } else {
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  }
}

// Normalize gender value
function normalizeGender(genderStr) {
  if (!genderStr) return null;
  
  const upper = String(genderStr).toUpperCase().trim();
  if (upper.includes('MALE') && !upper.includes('FE')) return 'MALE';
  if (upper.includes('FEMALE') || upper.includes('FE')) return 'FEMALE';
  if (upper.includes('OTHER')) return 'OTHER';
  
  return null;
}

// Clear affected dependent data for employees
async function clearAffectedData(employeeSids) {
  console.log(`\nClearing affected data for ${employeeSids.length} employees...`);
  
  try {
    if (employeeSids.length === 0) {
      console.log('No employees to clear data for');
      return;
    }
    
    // Build SQL-safe SID list
    const sidList = employeeSids.map(sid => `'${String(sid).replace(/'/g, "''")}'`).join(',');
    
    // Get employee IDs from SIDs
    const employees = await prisma.$queryRawUnsafe(`
      SELECT id, sid FROM employees WHERE sid IN (${sidList})
    `);
    
    if (employees.length === 0) {
      console.log('No employees found to clear data for');
      return;
    }
    
    const employeeIds = employees.map(e => e.id);
    const employeeIdList = employeeIds.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
    
    // Clear assessment sessions (uses user_id which is SID as string)
    const sessionsDeleted = await prisma.$executeRawUnsafe(`
      DELETE FROM assessment_sessions 
      WHERE user_id IN (${sidList})
    `);
    console.log(`  Deleted ${sessionsDeleted} assessment sessions`);
    
    // Clear assessment responses (cascade from sessions)
    const responsesDeleted = await prisma.$executeRawUnsafe(`
      DELETE FROM assessment_responses 
      WHERE session_id IN (SELECT id FROM assessment_sessions WHERE user_id IN (${sidList}))
    `);
    console.log(`  Deleted ${responsesDeleted} assessment responses`);
    
    // Clear employee assessments (uses camelCase: employeeId)
    const empAssessmentsDeleted = await prisma.$executeRawUnsafe(`
      DELETE FROM employee_assessments 
      WHERE "employeeId" IN (${employeeIdList})
    `);
    console.log(`  Deleted ${empAssessmentsDeleted} employee assessments`);
    
    // Clear employee responses (cascade from employee assessments)
    const empResponsesDeleted = await prisma.$executeRawUnsafe(`
      DELETE FROM employee_responses 
      WHERE "employeeAssessmentId" IN (SELECT id FROM employee_assessments WHERE "employeeId" IN (${employeeIdList}))
    `);
    console.log(`  Deleted ${empResponsesDeleted} employee responses`);
    
    // Clear competency assessments (uses camelCase: employeeId)
    const compAssessmentsDeleted = await prisma.$executeRawUnsafe(`
      DELETE FROM competency_assessments 
      WHERE "employeeId" IN (${employeeIdList})
    `);
    console.log(`  Deleted ${compAssessmentsDeleted} competency assessments`);
    
    // Clear IDP entries (uses snake_case: employee_id)
    // IDP entries store employee_id as employee.id, so we need to use the employee IDs
    const idpDeleted = await prisma.$executeRawUnsafe(`
      DELETE FROM idp_entries 
      WHERE employee_id IN (
        SELECT id::text FROM employees WHERE sid IN (${sidList})
      )
    `);
    console.log(`  Deleted ${idpDeleted} IDP entries`);
    
    // Clear job evaluations (where employee is evaluator, uses camelCase: evaluatorId)
    const jobEvalDeleted = await prisma.$executeRawUnsafe(`
      DELETE FROM job_evaluations 
      WHERE "evaluatorId" IN (${employeeIdList})
    `);
    console.log(`  Deleted ${jobEvalDeleted} job evaluations`);
    
    console.log('  ✓ Cleared all affected dependent data');
    
  } catch (error) {
    console.error('  ✗ Error clearing affected data:', error.message);
    console.error('  Stack:', error.stack);
    throw error;
  }
}

// Main import function
async function importEmployeeData() {
  // Try multiple possible paths
  const possiblePaths = [
    path.join(__dirname, '../../EmployeeData_Full.xlsx'),
    path.join(__dirname, '../EmployeeData_Full.xlsx'),
    '/app/EmployeeData_Full.xlsx',
    path.join(process.cwd(), 'EmployeeData_Full.xlsx')
  ];
  
  let excelPath = null;
  for (const testPath of possiblePaths) {
    try {
      const fs = require('fs');
      if (fs.existsSync(testPath)) {
        excelPath = testPath;
        break;
      }
    } catch (e) {
      // Continue to next path
    }
  }
  
  if (!excelPath) {
    throw new Error(`Excel file not found. Tried paths: ${possiblePaths.join(', ')}`);
  }
  
  console.log('='.repeat(80));
  console.log('FULL EMPLOYEE DATA IMPORT');
  console.log('='.repeat(80));
  console.log(`\nReading Excel file: ${excelPath}`);
  
  // Read Excel file
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null });
  
  console.log(`Found ${rows.length} rows in sheet "${sheetName}"`);
  
  const processed = [];
  const errors = [];
  const updatedSids = new Set(); // Track SIDs that are being updated
  
  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 for header and 0-based index
    
    try {
      // Extract and validate SID
      const sid = row['SID'] ? String(row['SID']).trim() : null;
      if (!sid) {
        errors.push({ row: rowNum, error: 'Missing SID', data: row });
        continue;
      }
      
      // Check if employee exists
      const existing = await prisma.employee.findUnique({
        where: { sid: sid }
      });
      
      if (existing) {
        updatedSids.add(sid);
      }
      
      // Parse dates
      const dateOfBirth = parseDate(row['DATE OF BIRTH']);
      const joiningDate = parseDate(row['JOINING DATE']);
      
      // Calculate fields
      const age = dateOfBirth ? calculateYears(dateOfBirth) : null;
      const oamcExperience = joiningDate ? calculateYears(joiningDate) : null;
      const previousExperience = row['PREVIOUS EXPERIANCE'] ? parseFloat(row['PREVIOUS EXPERIANCE']) : 0;
      const totalExperience = oamcExperience !== null ? (previousExperience + oamcExperience) : null;
      
      // Split name
      const fullName = row['EMPLOYEE NAME'] ? String(row['EMPLOYEE NAME']).trim() : null;
      const { firstName, lastName } = splitName(fullName);
      
      // Normalize gender
      const gender = normalizeGender(row['GENDER']);
      
      // Validate supervisor SID exists (for foreign key constraint)
      let lineManagerSid = null;
      let competencySupervisorSid = null;
      const supervisorSid = row['SUPERVISOR NUMBER'] ? String(row['SUPERVISOR NUMBER']).trim() : null;
      
      if (supervisorSid) {
        // Check if supervisor exists in database
        const supervisorExists = await prisma.employee.findUnique({
          where: { sid: supervisorSid },
          select: { id: true }
        });
        
        if (supervisorExists) {
          lineManagerSid = supervisorSid;
          competencySupervisorSid = supervisorSid;
        } else {
          // Supervisor doesn't exist yet, will be set to null (can be updated later)
          console.log(`  Warning: Supervisor SID ${supervisorSid} not found for employee ${sid}, setting to null`);
        }
      }
      
      // Build employee data object
      const employeeData = {
        sid: sid,
        erp_id: row['ID/Resident Card No'] ? String(row['ID/Resident Card No']).trim() : null,
        first_name: firstName || existing?.first_name || '',
        last_name: lastName || existing?.last_name || '',
        full_name: fullName,
        name_ar: row['NameAr'] ? String(row['NameAr']).trim() : null,
        email: row['Email'] ? String(row['Email']).trim().toLowerCase() : existing?.email || '',
        job_code: row['JobCode'] ? String(row['JobCode']).trim() : null,
        jcp_code: row['JCPCode'] ? String(row['JCPCode']).trim() : null,
        job_title: row['JobTitle'] ? String(row['JobTitle']).trim() : null,
        division: row['DIVISION'] ? String(row['DIVISION']).trim() : null,
        division1: row['DIVISION1'] ? String(row['DIVISION1']).trim() : null,
        unit: row['UNIT'] ? String(row['UNIT']).trim() : null,
        department: row['DEPARTMENT'] ? String(row['DEPARTMENT']).trim() : null,
        section: row['SECTION'] ? String(row['SECTION']).trim() : null,
        position: row['POSITION'] ? String(row['POSITION']).trim() : null,
        job: row['JOB'] ? String(row['JOB']).trim() : null,
        chief_office: row['Chief Office'] ? String(row['Chief Office']).trim() : null,
        grade: row['GRADE'] ? String(row['GRADE']).trim() : null,
        location: row['LOCATION'] ? String(row['LOCATION']).trim() : null,
        line_manager_sid: lineManagerSid,
        competency_supervisor_sid: competencySupervisorSid,
        date_of_birth: dateOfBirth,
        age: age,
        gender: gender,
        nationality: row['NATIONALITY'] ? String(row['NATIONALITY']).trim() : null,
        mobile_number: row['MOBILE NUMBER'] ? String(row['MOBILE NUMBER']).trim() : null,
        id_resident_card_no: row['ID/Resident Card No'] ? String(row['ID/Resident Card No']).trim() : null,
        joining_date: joiningDate,
        previous_experience: previousExperience,
        oamc_experience: oamcExperience,
        total_experience: totalExperience,
        person_type: row['PERSON TYPE'] ? String(row['PERSON TYPE']).trim() : null,
        employee_category: row['EMPLOYEE CATEGORY'] ? String(row['EMPLOYEE CATEGORY']).trim() : null,
        employee_local: row['EMPLOYEE_LOCAL'] ? String(row['EMPLOYEE_LOCAL']).trim() : null,
        qualification: row['Qualification'] ? String(row['Qualification']).trim() : null,
        specialization: row['Specialization'] ? String(row['Specialization']).trim() : null,
        is_active: true,
        employment_status: 'ACTIVE'
      };
      
      // Validate required fields
      if (!employeeData.first_name || !employeeData.last_name) {
        errors.push({ row: rowNum, error: 'Missing first or last name', data: row });
        continue;
      }
      
      if (!employeeData.email) {
        errors.push({ row: rowNum, error: 'Missing email', data: row });
        continue;
      }
      
      // Upsert employee (update if exists, create if not)
      const employee = await prisma.employee.upsert({
        where: { sid: sid },
        update: employeeData,
        create: employeeData
      });
      
      processed.push({ row: rowNum, sid: sid, action: existing ? 'updated' : 'created', employee: employee });
      
      if ((i + 1) % 100 === 0) {
        console.log(`  Processed ${i + 1}/${rows.length} rows...`);
      }
      
    } catch (error) {
      errors.push({ row: rowNum, error: error.message, data: row });
      console.error(`  Error processing row ${rowNum}:`, error.message);
    }
  }
  
  // Clear affected data for updated employees
  if (updatedSids.size > 0) {
    console.log(`\nFound ${updatedSids.size} employees to update`);
    await clearAffectedData(Array.from(updatedSids));
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('IMPORT SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total rows processed: ${rows.length}`);
  console.log(`Successfully processed: ${processed.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Created: ${processed.filter(p => p.action === 'created').length}`);
  console.log(`Updated: ${processed.filter(p => p.action === 'updated').length}`);
  
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.slice(0, 10).forEach(err => {
      console.log(`  Row ${err.row}: ${err.error}`);
    });
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more errors`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  
  return { processed, errors };
}

// Run import
async function main() {
  try {
    await importEmployeeData();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { importEmployeeData };

