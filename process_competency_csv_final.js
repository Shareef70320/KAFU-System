const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const csv = require('csv-parser');

const prisma = new PrismaClient();

// Type mapping
const typeMapping = {
  'NON TECHNICAL': 'NON_TECHNICAL',
  'TECHNICAL': 'TECHNICAL'
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
        headers: ['Type', 'Competency Family', 'Competency Title', 'Competency Definition', 'Basic', 'Intermediate', 'Advanced', 'Mastery'],
        quote: '"',
        escape: '"',
        newline: '\n'
      }))
      .on('data', async (row) => {
        rowCount++;
        
        // Skip header row and empty rows
        if (rowCount === 1 || !row['Type'] || !row['Competency Title']) {
          return;
        }

        try {
          // Debug output for first few rows
          if (rowCount <= 5) {
            console.log(`Debug - Row ${rowCount}:`, {
              type: row['Type'],
              family: row['Competency Family'],
              title: row['Competency Title'],
              definition: row['Competency Definition']?.substring(0, 100) + '...',
              basic: row['Basic']?.substring(0, 50) + '...',
              intermediate: row['Intermediate']?.substring(0, 50) + '...',
              advanced: row['Advanced']?.substring(0, 50) + '...',
              mastery: row['Mastery']?.substring(0, 50) + '...'
            });
          }

          // Map type
          const rawType = row['Type']?.trim().toUpperCase();
          const mappedType = typeMapping[rawType] || 'TECHNICAL';

          // Create competency
          const competencyData = {
            name: row['Competency Title']?.trim(),
            type: mappedType,
            family: row['Competency Family']?.trim() || 'General',
            definition: row['Competency Definition']?.trim(),
            description: null
          };

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
          console.log(`✅ Created: ${competencyData.name} (${mappedType}) - ${competencyData.family} - 4 levels`);

        } catch (error) {
          errorCount++;
          console.error(`❌ Error processing row ${rowCount}:`, error.message);
        }
      })
      .on('end', async () => {
        console.log('\n🎉 Processing Complete!');
        console.log(`✅ Successfully created: ${successCount} competencies`);
        console.log(`❌ Errors: ${errorCount}`);
        
        // Get final database stats
        const competencyCount = await prisma.competency.count();
        const levelCount = await prisma.competencyLevel.count();
        
        console.log('\n📊 Final Database Stats:');
        console.log(`   Competencies: ${competencyCount}`);
        console.log(`   Levels: ${levelCount}`);
        
        console.log('✅ CSV processing completed successfully');
        console.log('🎯 All done!');
        
        await prisma.$disconnect();
        resolve();
      })
      .on('error', (error) => {
        console.error('❌ Error reading CSV:', error);
        reject(error);
      });
  });
}

// Run the processing
processCompetencyCSV().catch(console.error);
