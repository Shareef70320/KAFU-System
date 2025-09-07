const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const csv = require('csv-parser');

const prisma = new PrismaClient();

// Type mapping
const typeMapping = {
  'NON TECHNICAL': 'NON_TECHNICAL',
  'TECHNICAL': 'TECHNICAL'
};

// Level mapping
const levelMapping = {
  'BASIC': 'BASIC',
  'INTERMEDIATE': 'INTERMEDIATE', 
  'ADVANCED': 'ADVANCED',
  'MASTERY': 'MASTERY'
};

async function processCompetencyCSV() {
  console.log('🚀 Starting CSV processing...\n');

  // Clear existing data
  console.log('🗑️  Clearing existing competencies...');
  await prisma.competencyLevel.deleteMany();
  await prisma.competency.deleteMany();
  console.log('✅ Existing data cleared\n');

  let successCount = 0;
  let errorCount = 0;
  let rowCount = 0;

  return new Promise((resolve, reject) => {
    fs.createReadStream('CompetecnyDictionary.csv')
      .pipe(csv({
        skipEmptyLines: true,
        skipLinesWithError: true,
        headers: ['Type', 'Competency Family', 'Competency Title', 'Competency Definition', 'Basic', 'Intermediate', 'Advanced', 'Mastery']
      }))
      .on('data', async (row) => {
        rowCount++;
        
        // Skip header row and empty rows
        if (rowCount === 1 || !row['Type'] || !row['Competency Title']) {
          return;
        }

        try {
          // Map data from CSV columns
          const rawType = row['Type']?.trim().toUpperCase();
          const mappedType = typeMapping[rawType] || 'TECHNICAL';

          const competencyData = {
            name: row['Competency Title']?.trim(), // Column 3: Competency Title
            type: mappedType,
            family: row['Competency Family']?.trim() || 'General', // Column 2: Competency Family
            definition: row['Competency Definition']?.trim(), // Column 4: Competency Definition
            description: null
          };

          if (!competencyData.name || !competencyData.definition) {
            console.log(`⚠️  Skipping row ${rowCount} - missing required fields`);
            errorCount++;
            return;
          }

          // Debug output for first few rows
          if (successCount < 3) {
            console.log(`Debug - Row ${rowCount}:`, {
              type: row['Type'],
              family: row['Competency Family'],
              title: row['Competency Title'],
              definition: competencyData.definition.substring(0, 100) + '...'
            });
            console.log(`Debug - Type mapping: "${rawType}" -> "${mappedType}"`);
          }

          // Create competency
          const competency = await prisma.competency.create({
            data: competencyData
          });

          // Create levels - always create all 4 levels
          const levelColumns = ['Basic', 'Intermediate', 'Advanced', 'Mastery'];
          const levelTypes = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'];
          
          for (let i = 0; i < levelColumns.length; i++) {
            const levelDescription = row[levelColumns[i]]?.trim();
            
            // Debug output for first few levels
            if (successCount < 2) {
              console.log(`Debug - Level ${levelTypes[i]}: "${levelDescription?.substring(0, 100)}..." (length: ${levelDescription?.length || 0})`);
            }
            
            // Always create the level, even if description is empty
            await prisma.competencyLevel.create({
              data: {
                competencyId: competency.id,
                level: levelTypes[i],
                title: `${levelTypes[i]} Level`,
                description: levelDescription || `No description available for ${levelTypes[i]} level`,
                indicators: []
              }
            });
          }

          successCount++;
          console.log(`✅ Created: ${competencyData.name} (${mappedType}) - ${competencyData.family} - ${levelColumns.length} levels`);

        } catch (error) {
          console.error(`❌ Error processing row ${rowCount}:`, error.message);
          errorCount++;
        }
      })
      .on('end', async () => {
        console.log('\n🎉 Processing Complete!');
        console.log(`✅ Successfully created: ${successCount} competencies`);
        console.log(`❌ Errors: ${errorCount}`);

        // Get final stats
        const totalCompetencies = await prisma.competency.count();
        const totalLevels = await prisma.competencyLevel.count();
        
        console.log('\n📊 Final Database Stats:');
        console.log(`   Competencies: ${totalCompetencies}`);
        console.log(`   Levels: ${totalLevels}`);
        
        console.log('✅ CSV processing completed successfully');
        resolve();
      })
      .on('error', (error) => {
        console.error('❌ CSV processing error:', error);
        reject(error);
      });
  });
}

// Run the processing
processCompetencyCSV()
  .then(() => {
    console.log('🎯 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
