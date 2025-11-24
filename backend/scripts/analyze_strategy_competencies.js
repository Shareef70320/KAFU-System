#!/usr/bin/env node

/**
 * Strategy Competencies Analysis Script
 * 
 * Analyzes the Strategy Competencies Excel file to check if all required data is present
 */

const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../Strategy Competencies.xlsx');

console.log('📊 Analyzing Strategy Competencies Excel file...\n');

try {
  // Check if file exists
  const fs = require('fs');
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  // Read the Excel file
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  console.log(`📄 Found ${rows.length} rows in sheet: "${sheetName}"\n`);

  if (rows.length === 0) {
    console.log('❌ No data found in the Excel file');
    process.exit(1);
  }

  // Check what columns are present
  const firstRow = rows[0];
  const columns = Object.keys(firstRow);
  console.log('📋 Columns found in Excel file:');
  columns.forEach(col => console.log(`   - ${col}`));
  console.log('');

  // Required columns mapping (case-insensitive)
  const requiredColumns = {
    'type': ['Type', 'type', 'TYPE'],
    'family': ['Competency Family', 'Family', 'family', 'competencyfamily', 'CompetencyFamily'],
    'name': ['Competency Title', 'Competency Name', 'Name', 'name', 'Title', 'title', 'competencytitle', 'CompetencyTitle'],
    'definition': ['Competency Definition', 'Definition', 'definition', 'competencydefinition', 'CompetencyDefinition'],
    'basic': ['Basic', 'basic', 'BASIC'],
    'intermediate': ['Intermediate', 'intermediate', 'INTERMEDIATE'],
    'advanced': ['Advanced', 'advanced', 'ADVANCED'],
    'mastery': ['Mastery', 'mastery', 'MASTERY']
  };

  // Normalize column names (lowercase, remove spaces/special chars)
  const normalizeCol = (col) => col.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

  // Find matching columns
  const columnMapping = {};
  const normalizedColumns = columns.map(col => ({ original: col, normalized: normalizeCol(col) }));

  console.log('🔍 Column Mapping:');
  for (const [key, possibleNames] of Object.entries(requiredColumns)) {
    const found = normalizedColumns.find(nc => 
      possibleNames.some(pn => normalizeCol(pn) === nc.normalized)
    );
    if (found) {
      columnMapping[key] = found.original;
      console.log(`   ✅ Found "${key}" → "${found.original}"`);
    } else {
      console.log(`   ❌ Missing "${key}" (looked for: ${possibleNames.join(', ')})`);
    }
  }
  console.log('');

  // Analyze data quality
  let validRows = 0;
  let invalidRows = 0;
  const issues = [];
  const sampleRows = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 because Excel is 1-indexed and we have header
    const rowIssues = [];

    // Check required fields
    const name = columnMapping.name ? (row[columnMapping.name] || '').toString().trim() : '';
    const definition = columnMapping.definition ? (row[columnMapping.definition] || '').toString().trim() : '';
    const type = columnMapping.type ? (row[columnMapping.type] || '').toString().trim() : '';
    const family = columnMapping.family ? (row[columnMapping.family] || '').toString().trim() : '';

    if (!name) rowIssues.push('Missing Competency Name/Title');
    if (!definition) rowIssues.push('Missing Definition');
    // Type is optional - will default to NON_TECHNICAL

    // Check levels
    const hasBasic = columnMapping.basic && (row[columnMapping.basic] || '').toString().trim();
    const hasIntermediate = columnMapping.intermediate && (row[columnMapping.intermediate] || '').toString().trim();
    const hasAdvanced = columnMapping.advanced && (row[columnMapping.advanced] || '').toString().trim();
    const hasMastery = columnMapping.mastery && (row[columnMapping.mastery] || '').toString().trim();

    const levelCount = [hasBasic, hasIntermediate, hasAdvanced, hasMastery].filter(Boolean).length;
    if (levelCount === 0) {
      rowIssues.push('No competency levels defined');
    }

    // Store sample data for first few valid rows
    if (index < 3 && name && definition) {
      sampleRows.push({
        name,
        type: type || 'NON_TECHNICAL',
        family: family || '(not specified)',
        levels: levelCount
      });
    }

    if (rowIssues.length > 0) {
      invalidRows++;
      issues.push({
        row: rowNum,
        name: name || '(No name)',
        issues: rowIssues
      });
    } else {
      validRows++;
    }
  });

  // Summary
  console.log('📊 Data Quality Analysis:');
  console.log(`   ✅ Valid rows: ${validRows}`);
  console.log(`   ❌ Invalid rows: ${invalidRows}`);
  console.log('');

  if (sampleRows.length > 0) {
    console.log('📝 Sample Data (first 3 valid rows):');
    sampleRows.forEach((sample, idx) => {
      console.log(`   ${idx + 1}. ${sample.name}`);
      console.log(`      Type: ${sample.type}, Family: ${sample.family}, Levels: ${sample.levels}`);
    });
    console.log('');
  }

  if (issues.length > 0) {
    console.log('⚠️  Issues found:');
    issues.slice(0, 10).forEach(issue => {
      console.log(`   Row ${issue.row} (${issue.name}): ${issue.issues.join(', ')}`);
    });
    if (issues.length > 10) {
      console.log(`   ... and ${issues.length - 10} more rows with issues`);
    }
    console.log('');
  }

  // Check if we can proceed
  const canProceed = 
    columnMapping.name && 
    columnMapping.definition && 
    validRows > 0;

  console.log('═══════════════════════════════════════════════════════════');
  if (canProceed) {
    console.log('✅ File structure looks good! Ready to import.');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   - Total rows: ${rows.length}`);
    console.log(`   - Valid competencies: ${validRows}`);
    console.log(`   - Invalid rows: ${invalidRows}`);
    console.log(`   - Type column: ${columnMapping.type || 'MISSING (will default to NON_TECHNICAL)'}`);
    console.log(`   - Family column: ${columnMapping.family || 'MISSING (will use default)'}`);
    console.log(`   - Name column: ${columnMapping.name || 'MISSING'}`);
    console.log(`   - Definition column: ${columnMapping.definition || 'MISSING'}`);
    console.log(`   - Level columns: Basic=${!!columnMapping.basic}, Intermediate=${!!columnMapping.intermediate}, Advanced=${!!columnMapping.advanced}, Mastery=${!!columnMapping.mastery}`);
    console.log('');
    console.log('💡 Next step: Run the import script to add these competencies to the database.');
    console.log('   Command: node backend/scripts/import_strategy_competencies.js');
  } else {
    console.log('❌ Cannot proceed with import. Please fix the issues above.');
    console.log('');
    console.log('Required columns:');
    console.log('   - Type (optional, will default to NON_TECHNICAL)');
    console.log('   - Competency Family (optional, will use default)');
    console.log('   - Competency Title/Name (REQUIRED)');
    console.log('   - Competency Definition (REQUIRED)');
    console.log('   - Basic, Intermediate, Advanced, Mastery (at least one level required)');
  }
  console.log('═══════════════════════════════════════════════════════════');

} catch (error) {
  console.error('❌ Error analyzing file:', error.message);
  console.error(error.stack);
  process.exit(1);
}

