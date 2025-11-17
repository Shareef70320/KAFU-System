const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function importCompetencyFamilies() {
  try {
    // Try multiple possible paths
    const possiblePaths = [
      '/app/CompetencyFamilies.xlsx',
      path.join(__dirname, '../../CompetencyFamilies.xlsx'),
      path.join(__dirname, '../CompetencyFamilies.xlsx'),
      path.join(process.cwd(), 'CompetencyFamilies.xlsx'),
      '/Users/shareefmahrooqi/Desktop/Work/KAFU System/CompetencyFamilies.xlsx'
    ];
    
    let excelPath = null;
    for (const testPath of possiblePaths) {
      try {
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
    console.log('COMPETENCY FAMILIES IMPORT');
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
    const skipped = [];
    
    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because Excel rows start at 1 and we have a header
      
      try {
        // Normalize column names (case-insensitive, handle spaces/special chars)
        const normalizeKey = (key) => {
          if (!key) return null;
          return key.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
        };
        
        const rowNormalized = {};
        for (const key of Object.keys(row)) {
          rowNormalized[normalizeKey(key)] = row[key];
        }
        
        // Extract data - try different possible column names
        const name = (rowNormalized['name'] || rowNormalized['family'] || rowNormalized['familyname'] || rowNormalized['competencyfamily'] || row['Competency Family'] || row['Name'] || row['Family'] || row['Family Name'] || '').toString().trim();
        const typeRaw = (rowNormalized['type'] || row['Type'] || '').toString().trim();
        const description = (rowNormalized['description'] || row['Description'] || '').toString().trim() || null;
        
        // Skip empty rows
        if (!name) {
          skipped.push({ row: rowNum, reason: 'Empty name' });
          continue;
        }
        
        // Normalize type
        let type = null;
        if (typeRaw) {
          const typeUpper = typeRaw.toUpperCase().trim();
          if (typeUpper.includes('TECHNICAL') && !typeUpper.includes('NON')) {
            type = 'TECHNICAL';
          } else if (typeUpper.includes('NON') || typeUpper.includes('NON_TECHNICAL')) {
            type = 'NON_TECHNICAL';
          } else if (typeUpper === 'TECHNICAL' || typeUpper === 'T') {
            type = 'TECHNICAL';
          } else if (typeUpper === 'NON_TECHNICAL' || typeUpper === 'NT') {
            type = 'NON_TECHNICAL';
          }
        }
        
        // If type is not provided, try to infer from existing competencies
        if (!type) {
          const existingCompetency = await prisma.competency.findFirst({
            where: { family: name },
            select: { type: true }
          });
          if (existingCompetency) {
            type = existingCompetency.type;
          }
        }
        
        // If still no type, default to NON_TECHNICAL
        if (!type) {
          type = 'NON_TECHNICAL';
        }
        
        // Check if family already exists using raw SQL
        const existing = await prisma.$queryRawUnsafe(`
          SELECT id, name, type, description, is_active 
          FROM competency_families 
          WHERE name = $1 AND type = $2
          LIMIT 1
        `, name, type);
        
        if (existing && existing.length > 0) {
          // Update existing family to ensure it's active
          await prisma.$executeRawUnsafe(`
            UPDATE competency_families 
            SET is_active = true, 
                description = COALESCE($1, description),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, description, existing[0].id);
          processed.push({ row: rowNum, name, type, action: 'Updated (already exists)' });
        } else {
          // Create new family using raw SQL
          await prisma.$executeRawUnsafe(`
            INSERT INTO competency_families (name, type, description, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (name, type) DO UPDATE 
            SET is_active = true,
                description = COALESCE(EXCLUDED.description, competency_families.description),
                updated_at = CURRENT_TIMESTAMP
          `, name, type, description);
          processed.push({ row: rowNum, name, type, action: 'Created' });
        }
        
      } catch (error) {
        console.error(`Error processing row ${rowNum}:`, error.message);
        errors.push({ row: rowNum, error: error.message, data: row });
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('IMPORT SUMMARY');
    console.log('='.repeat(80));
    console.log(`\nTotal rows processed: ${rows.length}`);
    console.log(`Successfully processed: ${processed.length}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Skipped: ${skipped.length}`);
    
    if (processed.length > 0) {
      console.log('\nProcessed families:');
      processed.forEach(p => {
        console.log(`  Row ${p.row}: ${p.name} (${p.type}) - ${p.action}`);
      });
    }
    
    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.slice(0, 10).forEach(e => {
        console.log(`  Row ${e.row}: ${e.error}`);
      });
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more errors`);
      }
    }
    
    if (skipped.length > 0) {
      console.log('\nSkipped rows:');
      skipped.slice(0, 10).forEach(s => {
        console.log(`  Row ${s.row}: ${s.reason}`);
      });
      if (skipped.length > 10) {
        console.log(`  ... and ${skipped.length - 10} more skipped rows`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('Import completed!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('Fatal error during import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
if (require.main === module) {
  importCompetencyFamilies()
    .then(() => {
      console.log('\n✅ Import completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Import failed:', error);
      process.exit(1);
    });
}

module.exports = { importCompetencyFamilies };

