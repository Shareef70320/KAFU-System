const fs = require('fs');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function processCompetencyCSV() {
  const results = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream('CompetecnyDictionary.csv')
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          console.log(`Processing ${results.length} competencies...`);
          
          // Clear existing competencies first
          await prisma.competencyLevel.deleteMany({});
          await prisma.competency.deleteMany({});
          console.log('Cleared existing competency data');
          
          let successCount = 0;
          let errorCount = 0;
          
          for (const row of results) {
            try {
              // Map CSV types to our enum values
              const typeMapping = {
                'NON TECHNICAL': 'NON_TECHNICAL',
                'TECHNICAL': 'TECHNICAL',
                'COMMERCIAL': 'FUNCTIONAL',
                'BEHAVIORAL': 'BEHAVIORAL',
                'LEADERSHIP': 'LEADERSHIP'
              };
              
              const rawType = row['Type']?.trim().toUpperCase();
              const mappedType = typeMapping[rawType] || 'TECHNICAL';
              
              const competencyData = {
                name: row['Competency Title']?.trim(),
                type: mappedType,
                family: 'General', // Default family since not specified in CSV
                definition: row['Competency Definition']?.trim(),
                description: null
              };
              
              if (!competencyData.name || !competencyData.definition) {
                console.log(`Skipping row: Missing required fields`);
                errorCount++;
                continue;
              }
              
              // Create competency levels
              const levels = [];
              const levelTypes = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'];
              const levelColumns = ['Basic', 'Intermediate', 'Advanced', 'Mastery'];
              
              for (let i = 0; i < levelTypes.length; i++) {
                const levelDescription = row[levelColumns[i]]?.trim();
                if (levelDescription) {
                  levels.push({
                    level: levelTypes[i],
                    title: levelTypes[i],
                    description: levelDescription,
                    indicators: [] // No indicators in this CSV format
                  });
                }
              }
              
              // Create competency with levels
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
              
              console.log(`✅ Created: ${competency.name} (${levels.length} levels)`);
              successCount++;
              
            } catch (rowError) {
              console.log(`❌ Error processing row: ${rowError.message}`);
              errorCount++;
            }
          }
          
          console.log(`\n📊 Summary:`);
          console.log(`✅ Successfully created: ${successCount} competencies`);
          console.log(`❌ Errors: ${errorCount} competencies`);
          
          resolve({ successCount, errorCount });
          
        } catch (error) {
          console.error('Error processing CSV:', error);
          reject(error);
        }
      })
      .on('error', reject);
  });
}

// Run the script
processCompetencyCSV()
  .then((result) => {
    console.log('✅ CSV processing completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
