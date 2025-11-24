#!/usr/bin/env node

/**
 * Strategy Competencies Import Script
 * 
 * Imports competencies from Strategy Competencies.xlsx
 * - Defaults Type to NON_TECHNICAL
 * - Defaults Family to "Strategy"
 * - Creates all 4 competency levels (Basic, Intermediate, Advanced, Mastery)
 */

const XLSX = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Default values for Strategy competencies
const DEFAULT_TYPE = 'NON_TECHNICAL';
const DEFAULT_FAMILY = 'Strategy';

// Generate suggested competency code
function generateSuggestedCode(type, family, sequence) {
  const typePrefix = type.substring(0, 4).toUpperCase();
  const familyPrefix = family.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
  return `${typePrefix}-${familyPrefix}-${String(sequence).padStart(3, '0')}`;
}

async function importStrategyCompetencies() {
  try {
    const filePath = path.join(__dirname, '../Strategy Competencies.xlsx');
    
    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    console.log(`📖 Reading Excel file: ${filePath}\n`);
    
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Found ${data.length} competencies to import\n`);
    
    // Ensure Strategy family exists in CompetencyFamily table
    // Use raw SQL to avoid enum type casting issues
    const existingFamily = await prisma.$queryRawUnsafe(`
      SELECT id, name, type, description, is_active 
      FROM competency_families 
      WHERE name = $1 AND type = $2
      LIMIT 1
    `, DEFAULT_FAMILY, DEFAULT_TYPE);
    
    let strategyFamily;
    if (existingFamily && existingFamily.length > 0) {
      strategyFamily = existingFamily[0];
      console.log(`✓ Using existing Competency Family: ${DEFAULT_FAMILY} (${DEFAULT_TYPE})\n`);
    } else {
      // Create new family using raw SQL
      const result = await prisma.$executeRawUnsafe(`
        INSERT INTO competency_families (name, type, description, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (name, type) DO UPDATE 
        SET is_active = true,
            description = COALESCE(EXCLUDED.description, competency_families.description),
            updated_at = CURRENT_TIMESTAMP
        RETURNING id, name, type, description, is_active
      `, DEFAULT_FAMILY, DEFAULT_TYPE, 'Strategy-related competencies');
      
      // Fetch the created/updated family
      const createdFamily = await prisma.$queryRawUnsafe(`
        SELECT id, name, type, description, is_active 
        FROM competency_families 
        WHERE name = $1 AND type = $2
        LIMIT 1
      `, DEFAULT_FAMILY, DEFAULT_TYPE);
      
      strategyFamily = createdFamily[0];
      console.log(`✓ Created/Updated Competency Family: ${DEFAULT_FAMILY} (${DEFAULT_TYPE})\n`);
    }
    
    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Extract data from row
        const title = String(row['Competency Title'] || '').trim();
        const definition = String(row['Competency Definition'] || '').trim();
        
        // Level descriptions (use exact values from Excel)
        const basicDesc = String(row['Basic'] || '').trim();
        const intermediateDesc = String(row['Intermediate'] || '').trim();
        const advancedDesc = String(row['Advanced'] || '').trim();
        const masteryDesc = String(row['Mastery'] || '').trim();
        
        // Validate required fields
        if (!title || !definition) {
          console.log(`⚠️  Row ${i + 2}: Skipping - missing required fields (Title: ${title ? 'OK' : 'Missing'}, Definition: ${definition ? 'OK' : 'Missing'})`);
          errors++;
          errorDetails.push({ row: i + 2, error: 'Missing required fields' });
          continue;
        }
        
        // Check if competency already exists (by name, type, family)
        const existing = await prisma.competency.findFirst({
          where: {
            name: title,
            type: DEFAULT_TYPE,
            family: DEFAULT_FAMILY
          }
        });
        
        let competency;
        let competencyCode;
        
        if (existing) {
          // Update existing competency
          competency = await prisma.competency.update({
            where: { id: existing.id },
            data: {
              definition: definition,
              isActive: true,
              familyId: strategyFamily.id
            }
          });
          
          competencyCode = competency.code || existing.code;
          updated++;
          console.log(`✓ Updated: ${title}${competencyCode ? ` [${competencyCode}]` : ''}`);
        } else {
          // Create new competency
          // Generate code
          const count = await prisma.competency.count({
            where: {
              type: DEFAULT_TYPE,
              family: DEFAULT_FAMILY
            }
          });
          
          competencyCode = generateSuggestedCode(DEFAULT_TYPE, DEFAULT_FAMILY, count + 1);
          
          // Ensure uniqueness
          let attempts = 0;
          while (await prisma.competency.findUnique({ where: { code: competencyCode } }) && attempts < 100) {
            const newCount = await prisma.competency.count({
              where: {
                type: DEFAULT_TYPE,
                family: DEFAULT_FAMILY
              }
            });
            competencyCode = generateSuggestedCode(DEFAULT_TYPE, DEFAULT_FAMILY, newCount + attempts + 1);
            attempts++;
          }
          
          if (attempts >= 100) {
            // Fallback to simple format
            const totalCount = await prisma.competency.count();
            competencyCode = `COMP-${String(totalCount + 1).padStart(3, '0')}`;
          }
          
          competency = await prisma.competency.create({
            data: {
              code: competencyCode,
              name: title,
              type: DEFAULT_TYPE,
              family: DEFAULT_FAMILY,
              familyId: strategyFamily.id,
              definition: definition,
              isActive: true
            }
          });
          
          created++;
          console.log(`+ Created: ${title} [${competencyCode}]`);
        }
        
        // Handle levels - delete existing levels first, then create new ones
        await prisma.competencyLevel.deleteMany({
          where: { competencyId: competency.id }
        });
        
        const levels = [
          { level: 'BASIC', description: basicDesc },
          { level: 'INTERMEDIATE', description: intermediateDesc },
          { level: 'ADVANCED', description: advancedDesc },
          { level: 'MASTERY', description: masteryDesc }
        ];
        
        for (const levelData of levels) {
          if (!levelData.description) continue;
          
          // Use exact value from Excel file without any parsing or formatting
          const exactDescription = String(levelData.description).trim();
          
          await prisma.competencyLevel.create({
            data: {
              competencyId: competency.id,
              level: levelData.level,
              title: levelData.level,
              description: exactDescription,
              indicators: []
            }
          });
        }
        
        // NOTE: Competency Elements are NOT imported from Excel file
        // They should be added manually through the UI or bulk import later
        
      } catch (error) {
        console.error(`❌ Row ${i + 2}: Error processing "${row['Competency Title'] || 'Unknown'}":`, error.message);
        errors++;
        errorDetails.push({ row: i + 2, error: error.message });
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 Import Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   🔄 Updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📝 Total processed: ${data.length}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    if (errorDetails.length > 0) {
      console.log('⚠️  Error Details:');
      errorDetails.forEach(detail => {
        console.log(`   Row ${detail.row}: ${detail.error}`);
      });
      console.log('');
    }
    
    console.log('✅ Import completed successfully!');
    
  } catch (error) {
    console.error('❌ Fatal error during import:', error);
    console.error(error.stack);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importStrategyCompetencies()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

