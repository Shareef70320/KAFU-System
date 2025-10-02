const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const prisma = new PrismaClient();

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Get all questions with competency and level information
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 1000 } = req.query;
    const offset = (page - 1) * limit;

    const questions = await prisma.$queryRaw`
      SELECT 
        q.id,
        q.text,
        q.type,
        q."competencyId" as competency_id,
        q."competencyLevelId" as competency_level_id,
        q.points::int as points,
        q.explanation,
        q."isActive" as is_active,
        q."createdBy" as created_by,
        q."createdAt" as created_at,
        q."updatedAt" as updated_at,
        c.name as competency_name,
        c.type as competency_type,
        c.family as competency_family,
        cl.level as level_name,
        cl.title as level_title,
        COUNT(qo.id)::int as option_count
      FROM questions q
      LEFT JOIN competencies c ON q."competencyId" = c.id
      LEFT JOIN competency_levels cl ON q."competencyLevelId" = cl.id
      LEFT JOIN question_options qo ON q.id = qo."questionId"
      GROUP BY q.id, c.name, c.type, c.family, cl.level, cl.title
      ORDER BY q."createdAt" DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;

    const total = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM questions
    `;

    res.json({
      success: true,
      questions: questions || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: Number(total[0]?.count || 0),
        pages: Math.ceil(Number(total[0]?.count || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch questions' });
  }
});

// Get single question with options
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const question = await prisma.$queryRaw`
      SELECT 
        q.*,
        c.name as competency_name,
        c.type as competency_type,
        c.family as competency_family,
        cl.level as level_name,
        cl.title as level_title
      FROM questions q
      LEFT JOIN competencies c ON q."competencyId" = c.id
      LEFT JOIN competency_levels cl ON q."competencyLevelId" = cl.id
      WHERE q.id = ${id}
    `;

    if (!question || question.length === 0) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    // Get options for this question
    const options = await prisma.$queryRaw`
      SELECT 
        id,
        text,
        "isCorrect" as is_correct,
        "order" as order_index
      FROM question_options
      WHERE "questionId" = ${id}
      ORDER BY "order"
    `;

    res.json({
      success: true,
      question: {
        ...question[0],
        options: options || []
      }
    });
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch question' });
  }
});

// Get question options
router.get('/:id/options', async (req, res) => {
  try {
    const { id } = req.params;

    const options = await prisma.$queryRaw`
      SELECT 
        id,
        text,
        is_correct,
        "order" as order_index
      FROM question_options
      WHERE question_id = ${id}
      ORDER BY "order"
    `;

    res.json({
      success: true,
      options: options || []
    });
  } catch (error) {
    console.error('Error fetching question options:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch question options' });
  }
});

// Update question
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      text,
      type,
      competencyId,
      competencyLevelId,
      points,
      explanation,
      correctAnswer,
      options
    } = req.body;

    // Update question
    const updatedQuestion = await prisma.$queryRaw`
      UPDATE questions
      SET 
        text = ${text},
        type = ${type},
        "competencyId" = ${competencyId},
        "competencyLevelId" = ${competencyLevelId || null},
        points = ${points},
        explanation = ${explanation || null},
        "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (!updatedQuestion || updatedQuestion.length === 0) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    // Delete existing options
    await prisma.$queryRaw`
      DELETE FROM question_options WHERE "questionId" = ${id}
    `;

    // Add correct answer for True/False questions
    if (type === 'TRUE_FALSE' && correctAnswer) {
      await prisma.$queryRaw`
        INSERT INTO question_options (
          id, "questionId", text, "isCorrect", "order", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid()::text, ${id}, ${correctAnswer}, true, 1, NOW(), NOW()
        )
      `;
    }

    // Add options for multiple choice questions
    if (type === 'MULTIPLE_CHOICE' && options && options.length > 0) {
      for (const option of options) {
        await prisma.$queryRaw`
          INSERT INTO question_options (
            id, "questionId", text, "isCorrect", "order", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid()::text, ${id}, ${option.text}, ${option.isCorrect}, 
            ${option.orderIndex}, NOW(), NOW()
          )
        `;
      }
    }

    res.json({
      success: true,
      question: updatedQuestion[0]
    });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ success: false, error: 'Failed to update question' });
  }
});

// Create new question
router.post('/', async (req, res) => {
  try {
    const {
      text,
      type,
      competencyId,
      competencyLevelId,
      points,
      explanation,
      createdBy,
      options = []
    } = req.body;

    // Create question
    const question = await prisma.$queryRaw`
      INSERT INTO questions (
        id, text, type, "competencyId", "competencyLevelId", 
        points, explanation, "isActive", "createdBy", 
        "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, ${text}, ${type}, ${competencyId}, ${competencyLevelId || null},
        ${points || 1}, ${explanation || null}, true, ${createdBy || null},
        NOW(), NOW()
      ) RETURNING *
    `;

    const questionId = question[0].id;

    // Create options if provided
    if (options && options.length > 0) {
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        await prisma.$queryRaw`
          INSERT INTO question_options (
            id, "questionId", text, "isCorrect", "order", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid()::text, ${questionId}, ${option.text}, 
            ${option.isCorrect || false}, ${i + 1}, NOW(), NOW()
          )
        `;
      }
    }

    res.status(201).json({
      success: true,
      question: question[0]
    });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ success: false, error: 'Failed to create question' });
  }
});

// Update question
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      text,
      type,
      competencyId,
      competencyLevelId,
      points,
      explanation,
      isActive,
      options = []
    } = req.body;

    const updateFields = [];
    const updateValues = [];

    if (text !== undefined) {
      updateFields.push(`text = $${updateValues.length + 1}`);
      updateValues.push(text);
    }
    if (type !== undefined) {
      updateFields.push(`type = $${updateValues.length + 1}`);
      updateValues.push(type);
    }
    if (competencyId !== undefined) {
      updateFields.push(`"competencyId" = $${updateValues.length + 1}`);
      updateValues.push(competencyId);
    }
    if (competencyLevelId !== undefined) {
      updateFields.push(`"competencyLevelId" = $${updateValues.length + 1}`);
      updateValues.push(competencyLevelId);
    }
    if (points !== undefined) {
      updateFields.push(`points = $${updateValues.length + 1}`);
      updateValues.push(points);
    }
    if (explanation !== undefined) {
      updateFields.push(`explanation = $${updateValues.length + 1}`);
      updateValues.push(explanation);
    }
    if (isActive !== undefined) {
      updateFields.push(`"isActive" = $${updateValues.length + 1}`);
      updateValues.push(isActive);
    }

    updateFields.push(`"updatedAt" = NOW()`);
    updateValues.push(id);

    const query = `
      UPDATE questions
      SET ${updateFields.join(', ')}
      WHERE id = $${updateValues.length}
      RETURNING *
    `;

    const updatedQuestion = await prisma.$queryRawUnsafe(query, ...updateValues);

    // Update options if provided
    if (options && options.length > 0) {
      // Delete existing options
      await prisma.$queryRaw`
        DELETE FROM question_options WHERE "questionId" = ${id}
      `;

      // Create new options
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        await prisma.$queryRaw`
          INSERT INTO question_options (
            id, "questionId", text, "isCorrect", "order", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid()::text, ${id}, ${option.text}, 
            ${option.isCorrect || false}, ${i + 1}, NOW(), NOW()
          )
        `;
      }
    }

    res.json({
      success: true,
      question: updatedQuestion[0]
    });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ success: false, error: 'Failed to update question' });
  }
});

// Delete question
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First delete related options
    await prisma.$queryRaw`
      DELETE FROM question_options WHERE question_id = ${id}
    `;

    // Then delete the question
    const deletedQuestion = await prisma.$queryRaw`
      DELETE FROM questions WHERE id = ${id} RETURNING *
    `;

    res.json({
      success: true,
      question: deletedQuestion[0]
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ success: false, error: 'Failed to delete question' });
  }
});

// Get question statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN "isActive" = true THEN 1 END) as active,
        COUNT(CASE WHEN "isActive" = false THEN 1 END) as inactive
      FROM questions
    `;

    const competencyStats = await prisma.$queryRaw`
      SELECT 
        c.name as competency_name,
        COUNT(q.id) as question_count
      FROM competencies c
      LEFT JOIN questions q ON c.id = q."competencyId"
      GROUP BY c.id, c.name
      ORDER BY question_count DESC
    `;

    const levelStats = await prisma.$queryRaw`
      SELECT 
        cl.level as level_name,
        cl.title as level_title,
        COUNT(q.id) as question_count
      FROM competency_levels cl
      LEFT JOIN questions q ON cl.id = q."competencyLevelId"
      GROUP BY cl.id, cl.level, cl.title
      ORDER BY question_count DESC
    `;

    res.json({
      success: true,
      stats: stats[0],
      competencyStats: competencyStats || [],
      levelStats: levelStats || []
    });
  } catch (error) {
    console.error('Error fetching question statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// Upload questions from CSV
router.post('/upload-csv', upload.single('csvFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No CSV file provided' });
  }

  try {
    const questions = [];
    const errors = [];

    console.log('Starting CSV upload process...');

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          try {
            console.log('Processing row:', row);
            
            // Validate required fields
            if (!row.text || !row.type || !row.competency_name) {
              const errorMsg = `Row missing required fields - text: ${row.text}, type: ${row.type}, competency_name: ${row.competency_name}`;
              console.log('Validation error:', errorMsg);
              errors.push(errorMsg);
              return;
            }

            // Validate question type
            const validTypes = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY'];
            if (!validTypes.includes(row.type)) {
              errors.push(`Invalid question type: ${row.type}`);
              return;
            }

            // Prepare question data
            const questionData = {
              text: row.text.trim(),
              type: row.type,
              competencyName: row.competency_name.trim(),
              competencyLevel: row.competency_level ? row.competency_level.trim() : null,
              points: parseInt(row.points) || 1,
              explanation: row.explanation ? row.explanation.trim() : null,
              correctAnswer: row.correct_answer ? row.correct_answer.trim() : null,
              options: []
            };

            // Add options for multiple choice questions
            if (row.type === 'MULTIPLE_CHOICE') {
              for (let i = 1; i <= 4; i++) {
                const optionText = row[`option_${i}_text`];
                const isCorrect = row[`option_${i}_is_correct`]?.toLowerCase() === 'true';
                
                if (optionText && optionText.trim()) {
                  questionData.options.push({
                    text: optionText.trim(),
                    isCorrect: isCorrect,
                    orderIndex: i
                  });
                }
              }
            }

            questions.push(questionData);
            console.log('Question added to array:', questionData);
          } catch (error) {
            console.log('Error processing row:', error);
            errors.push(`Error processing row: ${error.message}`);
          }
        })
        .on('end', () => {
          console.log('CSV parsing completed. Questions found:', questions.length);
          console.log('Errors found:', errors.length);
          resolve();
        })
        .on('error', reject);
    });

    console.log('Final questions array length:', questions.length);
    console.log('Final errors array length:', errors.length);

    if (errors.length > 0) {
      console.log('Returning validation errors:', errors);
      return res.status(400).json({ 
        success: false, 
        error: 'CSV validation failed', 
        details: errors 
      });
    }

    // Insert questions into database
    let successCount = 0;
    for (const questionData of questions) {
      try {
        // Look up competency ID from name
        const competency = await prisma.$queryRaw`
          SELECT id FROM competencies WHERE name = ${questionData.competencyName} LIMIT 1
        `;
        
        if (!competency || competency.length === 0) {
          errors.push(`Competency not found: ${questionData.competencyName}`);
          continue;
        }
        
        const competencyId = competency[0].id;
        let competencyLevelId = null;
        
        // Look up competency level ID if provided
        if (questionData.competencyLevel) {
          const level = await prisma.$queryRaw`
            SELECT id FROM competency_levels WHERE level = ${questionData.competencyLevel} LIMIT 1
          `;
          
          if (level && level.length > 0) {
            competencyLevelId = level[0].id;
          } else {
            errors.push(`Competency level not found: ${questionData.competencyLevel}`);
            continue;
          }
        }

        // Create question
        const question = await prisma.$queryRaw`
          INSERT INTO questions (
            id, text, type, "competencyId", "competencyLevelId", 
            points, explanation, "isActive", "createdBy", 
            "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid()::text, ${questionData.text}, ${questionData.type}, 
            ${competencyId}, ${competencyLevelId},
            ${questionData.points}, ${questionData.explanation}, true, 'admin',
            NOW(), NOW()
          ) RETURNING *
        `;

        const questionId = question[0].id;

        // Add correct answer for True/False questions
        if (questionData.type === 'TRUE_FALSE' && questionData.correctAnswer) {
          await prisma.$queryRaw`
            INSERT INTO question_options (
              id, "questionId", text, "isCorrect", "order", "createdAt", "updatedAt"
            ) VALUES (
              gen_random_uuid()::text, ${questionId}, ${questionData.correctAnswer}, true, 1, NOW(), NOW()
            )
          `;
        }

        // Add options for multiple choice questions
        if (questionData.type === 'MULTIPLE_CHOICE' && questionData.options.length > 0) {
          for (const option of questionData.options) {
            await prisma.$queryRaw`
              INSERT INTO question_options (
                id, "questionId", text, "isCorrect", "order", "createdAt", "updatedAt"
              ) VALUES (
                gen_random_uuid()::text, ${questionId}, ${option.text}, ${option.isCorrect}, 
                ${option.orderIndex}, NOW(), NOW()
              )
            `;
          }
        }

        successCount++;
      } catch (error) {
        console.error('Error inserting question:', error);
        errors.push(`Failed to insert question: ${questionData.text}`);
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      count: successCount,
      errors: errors.length > 0 ? errors : null
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    
    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ success: false, error: 'Failed to process CSV file' });
  }
});

module.exports = router;
