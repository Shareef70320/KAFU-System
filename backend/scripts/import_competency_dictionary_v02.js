#!/usr/bin/env node

/**
 * Competency Dictionary V02 Import Script
 * 
 * Imports competencies from CompetencyDictionaryV02.xlsx with:
 * - Type, Family, Division, Title, Definition
 * - Competency Levels (Basic, Intermediate, Advanced, Mastery)
 */

const XLSX = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Map Excel types to Prisma enum values
function mapTypeToEnum(type) {
  if (!type) return 'TECHNICAL';
  
  const normalized = type.trim().toUpperCase();
  
  // Direct mappings
  const typeMap = {
    'NON TECHNICAL': 'NON_TECHNICAL',
    'TECHNICAL': 'TECHNICAL',
    'BEHAVIORAL': 'BEHAVIORAL',
    'LEADERSHIP': 'LEADERSHIP',
    'FUNCTIONAL': 'FUNCTIONAL',
    'CERTIFICATION_AND_COMPLIANCE': 'CERTIFICATION_AND_COMPLIANCE',
    'CERTIFICATION & COMPLIANCE': 'CERTIFICATION_AND_COMPLIANCE',
    'COMMERCIAL': 'COMMERCIAL',
    'FINANCE_AND_PROCUREMENT': 'FINANCE_AND_PROCUREMENT',
    'FINANCE & PROCUREMENT': 'FINANCE_AND_PROCUREMENT',
    'FIRE': 'FIRE',
    'HR_AND_ADMIN': 'HR_AND_ADMIN',
    'HR & ADMIN': 'HR_AND_ADMIN',
    'HSE': 'HSE',
    'ICT': 'ICT',
    'INTERNAL_AUDIT': 'INTERNAL_AUDIT',
    'LEGAL_AND_REGULATORY': 'LEGAL_AND_REGULATORY',
    'LEGAL & REGULATORY': 'LEGAL_AND_REGULATORY',
    'MAINTENANCE': 'MAINTENANCE',
    'MEDIA': 'MEDIA',
    'OPERATIONS': 'OPERATIONS',
    'QUALITY': 'QUALITY',
    'SECURITY': 'SECURITY',
    'TECHNICAL_SERVICES': 'TECHNICAL_SERVICES'
  };
  
  return typeMap[normalized] || 'TECHNICAL';
}

// Map level names to enum
function mapLevelToEnum(level) {
  const levelMap = {
    'BASIC': 'BASIC',
    'INTERMEDIATE': 'INTERMEDIATE',
    'ADVANCED': 'ADVANCED',
    'MASTERY': 'MASTERY'
  };
  
  return levelMap[level.toUpperCase()] || 'BASIC';
}

// Parse level description and extract indicators
function parseLevelDescription(description) {
  if (!description) return { description: '', indicators: [] };
  
  const desc = String(description).trim();
  
  // Split by newlines or \r\n to get indicators
  const lines = desc.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  
  // First line or two might be the description, rest are indicators
  // For now, use first line as description, rest are indicators
  if (lines.length === 0) {
    return { description: '', indicators: [] };
  }
  
  if (lines.length === 1) {
    return { description: lines[0], indicators: [] };
  }
  
  // Use first line as description, rest as indicators
  return {
    description: lines[0],
    indicators: lines.slice(1)
  };
}

// Extract elements from all level descriptions
// Elements are bullet points that appear across all levels
function extractElementsFromLevels(levels) {
  const allElements = new Set();
  
  for (const level of levels) {
    if (!level.description) continue;
    
    const desc = String(level.description).trim();
    // Split by newlines
    const lines = desc.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    
    // Each line that doesn't start with a bullet but is a separate statement could be an element
    // Also check for lines that start with bullets (•, -, *)
    for (const line of lines) {
      // Remove leading bullets and whitespace
      const cleaned = line.replace(/^[•\-\*]\s*/, '').trim();
      if (cleaned.length > 0 && cleaned.length < 500) { // Reasonable length for an element
        // Check if it's a complete sentence/statement (not just a continuation)
        if (cleaned.length > 10) { // Minimum length for a meaningful element
          allElements.add(cleaned);
        }
      }
    }
  }
  
  return Array.from(allElements);
}

async function importCompetencyDictionary() {
  try {
    // Try multiple possible paths (check V03 first, then V02)
    const possiblePaths = [
      path.join(__dirname, '../../CompetencyDictionaryV03.xlsx'),
      path.join(__dirname, '../CompetencyDictionaryV03.xlsx'),
      '/app/CompetencyDictionaryV03.xlsx',
      path.join(process.cwd(), 'CompetencyDictionaryV03.xlsx'),
      path.join(__dirname, '../../CompetencyDictionaryV02.xlsx'),
      path.join(__dirname, '../CompetencyDictionaryV02.xlsx'),
      '/app/CompetencyDictionaryV02.xlsx',
      path.join(process.cwd(), 'CompetencyDictionaryV02.xlsx')
    ];
    
    let excelPath = null;
    for (const p of possiblePaths) {
      try {
        const fs = require('fs');
        if (fs.existsSync(p)) {
          excelPath = p;
          break;
        }
      } catch (e) {
        // Continue to next path
      }
    }
    
    if (!excelPath) {
      throw new Error(`Excel file not found. Tried: ${possiblePaths.join(', ')}`);
    }
    
    console.log(`Reading Excel file: ${excelPath}\n`);
    
    // Read Excel file
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${data.length} competencies to import\n`);
    
    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Extract data from row
        const type = mapTypeToEnum(row['Type']);
        const family = String(row['Competency Family'] || '').trim();
        const division = String(row['Related Division'] || '').trim() || null;
        const title = String(row['Competency Title'] || '').trim();
        const definition = String(row['Competency Definition'] || '').trim();
        const userProvidedCode = String(row['Competency Code'] || row['Code'] || '').trim() || null;
        
        // Level descriptions
        const basicDesc = String(row['Basic'] || '').trim();
        const intermediateDesc = String(row['Intermediate'] || '').trim();
        const advancedDesc = String(row['Advanced'] || '').trim();
        const masteryDesc = String(row['Mastery'] || '').trim();
        
        // Validate required fields
        if (!title || !family || !definition) {
          console.log(`⚠️  Row ${i + 1}: Skipping - missing required fields (Title: ${title}, Family: ${family}, Definition: ${definition ? 'OK' : 'Missing'})`);
          errors++;
          errorDetails.push({ row: i + 1, error: 'Missing required fields' });
          continue;
        }
        
        // Generate suggested code if not provided
        function generateSuggestedCode(type, family, sequence) {
          const typePrefix = type.substring(0, 4).toUpperCase();
          const familyPrefix = family.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
          return `${typePrefix}-${familyPrefix}-${String(sequence).padStart(3, '0')}`;
        }
        
        let competencyCode = userProvidedCode;
        let existing = null;
        
        // First, try to find by code if provided
        if (competencyCode) {
          existing = await prisma.competency.findUnique({
            where: { code: competencyCode }
          });
          
          if (existing) {
            // Code exists, update the competency
            competency = await prisma.competency.update({
              where: { id: existing.id },
              data: {
                name: title,
                type: type,
                family: family,
                definition: definition,
                related_division: division,
                isActive: true
              }
            });
            
            updated++;
            console.log(`✓ Updated by code: ${competencyCode} - ${title}`);
          } else {
            // Code provided but doesn't exist - check if it's already used
            const codeExists = await prisma.competency.findUnique({
              where: { code: competencyCode }
            });
            
            if (codeExists) {
              console.log(`⚠️  Row ${i + 1}: Code ${competencyCode} already exists, generating new code`);
              competencyCode = null; // Will generate new code
            }
          }
        }
        
        // If not found by code, try by name+type+family
        if (!existing) {
          existing = await prisma.competency.findFirst({
            where: {
              name: title,
              type: type,
              family: family
            }
          });
        }
        
        let competency;
        
        if (existing) {
          // Update existing competency
          const updateData = {
            definition: definition,
            related_division: division,
            isActive: true
          };
          
          // Only update code if it was provided and different
          if (competencyCode && existing.code !== competencyCode) {
            updateData.code = competencyCode;
          } else if (!existing.code && competencyCode) {
            updateData.code = competencyCode;
          }
          
          competency = await prisma.competency.update({
            where: { id: existing.id },
            data: updateData
          });
          
          updated++;
          console.log(`✓ Updated: ${title} (${type} - ${family})${competency.code ? ` [${competency.code}]` : ''}`);
        } else {
          // Create new competency
          // Generate code if not provided
          if (!competencyCode) {
            // Get count of competencies with same type-family for sequence
            const count = await prisma.competency.count({
              where: {
                type: type,
                family: family
              }
            });
            
            competencyCode = generateSuggestedCode(type, family, count + 1);
            
            // Ensure uniqueness
            let attempts = 0;
            while (await prisma.competency.findUnique({ where: { code: competencyCode } }) && attempts < 100) {
              const newCount = await prisma.competency.count({
                where: {
                  type: type,
                  family: family
                }
              });
              competencyCode = generateSuggestedCode(type, family, newCount + attempts + 1);
              attempts++;
            }
            
            if (attempts >= 100) {
              // Fallback to simple format
              const totalCount = await prisma.competency.count();
              competencyCode = `COMP-${String(totalCount + 1).padStart(3, '0')}`;
            }
            
            console.log(`  → Generated code: ${competencyCode}`);
          }
          
          competency = await prisma.competency.create({
            data: {
              code: competencyCode,
              name: title,
              type: type,
              family: family,
              definition: definition,
              related_division: division,
              isActive: true
            }
          });
          
          created++;
          console.log(`+ Created: ${title} (${type} - ${family}) [${competencyCode}]`);
        }
        
        // Handle levels
        const levels = [
          { level: 'BASIC', description: basicDesc },
          { level: 'INTERMEDIATE', description: intermediateDesc },
          { level: 'ADVANCED', description: advancedDesc },
          { level: 'MASTERY', description: masteryDesc }
        ];
        
        // NOTE: Competency Elements are NOT imported from Excel file
        // They should be added manually through the UI or bulk import later
        
        for (const levelData of levels) {
          if (!levelData.description) continue;
          
          // Use exact value from Excel file without any parsing or formatting
          const exactDescription = String(levelData.description).trim();
          
          // Check if level already exists
          const existingLevel = await prisma.competencyLevel.findFirst({
            where: {
              competencyId: competency.id,
              level: levelData.level
            }
          });
          
          if (!existingLevel) {
            // Create new level with exact description from Excel
            await prisma.competencyLevel.create({
              data: {
                competencyId: competency.id,
                level: levelData.level,
                title: `${levelData.level} Level`,
                description: exactDescription,
                indicators: [], // Empty indicators - use exact description only
                isActive: true
              }
            });
          } else {
            // Update existing level with exact description from Excel
            await prisma.competencyLevel.update({
              where: { id: existingLevel.id },
              data: {
                title: `${levelData.level} Level`,
                description: exactDescription,
                indicators: [], // Empty indicators - use exact description only
                isActive: true
              }
            });
          }
        }
        
      } catch (error) {
        console.error(`❌ Error processing row ${i + 1}:`, error.message);
        errors++;
        errorDetails.push({ row: i + 1, error: error.message });
      }
    }
    
    console.log('\n=== IMPORT SUMMARY ===');
    console.log(`Total rows processed: ${data.length}`);
    console.log(`✓ Created: ${created}`);
    console.log(`✓ Updated: ${updated}`);
    console.log(`❌ Errors: ${errors}`);
    
    if (errorDetails.length > 0) {
      console.log('\nError Details:');
      errorDetails.forEach(({ row, error }) => {
        console.log(`  Row ${row}: ${error}`);
      });
    }
    
    console.log('\nImport completed successfully!');
    
  } catch (error) {
    console.error('Error importing competency dictionary:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  importCompetencyDictionary()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

module.exports = { importCompetencyDictionary };

