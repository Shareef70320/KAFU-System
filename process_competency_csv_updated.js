const fs = require('fs');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function processCompetencyCSV() {
  const results = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream('CompetecnyDictionary.csv')
      .pipe(csv({ skipEmptyLines: true, skipLinesWithError: true }))
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
          
          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            try {
              // Debug: Log first 20 rows to see what we're getting
              if (i < 20) {
                console.log(`Debug - Row ${i + 1}:`, {
                  type: row['_1'],
                  family: row['_2'],
                  title: row['_3'],
                  hasDefinition: !!row['_4'],
                  allKeys: Object.keys(row).slice(0, 5),
                  firstValue: Object.values(row)[0]
                });
              }
              
              // Skip header rows and empty rows - look for rows with actual data
              if (!row['_1'] || !row['_3'] || row['_1'] === 'Type' || row['_1'] === 'Table 1' || row['_1'].trim() === '') {
                continue;
              }
              
              // Debug: Log first few valid rows
              if (successCount < 3) {
                console.log(`Debug - Valid Row ${successCount + 1}:`, {
                  type: row['_1'],
                  family: row['_2'],
                  title: row['_3'],
                  definition: row['_4']?.substring(0, 50) + '...'
                });
              }

              // Map CSV types to our enum values - now only Technical and Non Technical
              const typeMapping = {
                'NON TECHNICAL': 'NON_TECHNICAL',
                'TECHNICAL': 'TECHNICAL',
                'COMMON': 'NON_TECHNICAL' // Common competencies are non-technical
              };
              
              const rawType = row['_1']?.trim().toUpperCase();
              const mappedType = typeMapping[rawType] || 'TECHNICAL';
              
              // Debug: Log the type mapping
              if (successCount < 3) {
                console.log(`Debug - Type mapping: "${rawType}" -> "${mappedType}"`);
              }
              
              const competencyData = {
                name: row['_3']?.trim(), // Competency Title (e.g., "Communication")
                type: mappedType,
                family: row['_2']?.trim() || 'General', // Competency Family (e.g., "Common")
                definition: row['_4']?.trim(), // Competency Definition (the long description)
                description: null
              };

              if (!competencyData.name || !competencyData.definition) {
                console.log(`Skipping row - missing required fields: ${competencyData.name || 'No name'}`);
                errorCount++;
                continue;
              }

              // Check for duplicates
              const existingCompetency = await prisma.competency.findUnique({ 
                where: { name: competencyData.name } 
              });
              
              if (existingCompetency) {
                console.log(`Skipping duplicate: ${competencyData.name}`);
                errorCount++;
                continue;
              }

              // Process competency levels - using the correct column names
              const levels = [];
              const levelTypes = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'];
              const levelColumns = ['_5', '_6', '_7', '_8']; // Basic, Intermediate, Advanced, Mastery
              
              for (let i = 0; i < levelTypes.length; i++) {
                const levelType = levelTypes[i];
                let levelDescription = row[levelColumns[i]]?.trim();
                
                // Clean up Mastery level descriptions that might have extra quotes
                if (levelType === 'MASTERY' && levelDescription) {
                  levelDescription = levelDescription.replace(/^["']|["']$/g, '').trim();
                }
                
                // Debug: Log level processing for first few competencies
                if (successCount < 3) {
                  console.log(`Debug - Level ${levelType}: "${levelDescription}" (length: ${levelDescription?.length || 0})`);
                }
                
                // Always create all 4 levels, even if description is short
                if (levelDescription && levelDescription.length > 0) {
                  levels.push({
                    level: levelType,
                    title: levelType,
                    description: levelDescription,
                    indicators: []
                  });
                } else {
                  // Create empty level if no description
                  levels.push({
                    level: levelType,
                    title: levelType,
                    description: `No description available for ${levelType} level`,
                    indicators: []
                  });
                }
              }
              
              // Add the basic level description from the definition field as the first level if no levels were found
              if (levels.length === 0 && row['_4']?.trim()) {
                levels.push({
                  level: 'BASIC',
                  title: 'BASIC',
                  description: row['_4'].trim(),
                  indicators: []
                });
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

              console.log(`✅ Created: ${competency.name} (${competency.type}) - ${competency.family} - ${levels.length} levels`);
              successCount++;

            } catch (rowError) {
              console.error(`❌ Error processing row: ${rowError.message}`);
              errorCount++;
            }
          }

          console.log(`\n🎉 Processing Complete!`);
          console.log(`✅ Successfully created: ${successCount} competencies`);
          console.log(`❌ Errors: ${errorCount}`);
          
          // Get final counts
          const totalCompetencies = await prisma.competency.count();
          const totalLevels = await prisma.competencyLevel.count();
          
          console.log(`\n📊 Final Database Stats:`);
          console.log(`   Competencies: ${totalCompetencies}`);
          console.log(`   Levels: ${totalLevels}`);

          resolve();
        } catch (error) {
          console.error('Error processing CSV:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('Error reading CSV:', error);
        reject(error);
      });
  });
}

processCompetencyCSV()
  .then(() => {
    console.log('✅ CSV processing completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ CSV processing failed:', error);
    process.exit(1);
  });
