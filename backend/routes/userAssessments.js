const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Helper function to ensure level columns exist
async function ensureLevelColumns() {
  try {
    await prisma.$queryRaw`
      ALTER TABLE assessment_sessions
      ADD COLUMN IF NOT EXISTS system_level TEXT,
      ADD COLUMN IF NOT EXISTS user_confirmed_level TEXT,
      ADD COLUMN IF NOT EXISTS manager_selected_level TEXT
    `;
    console.log('Ensured assessment_sessions level columns exist');
  } catch (e) {
    console.error('Could not ensure level columns:', e.message || e);
  }
}
// Helper to select assessment for a competency
async function selectAssessmentForCompetency(competencyId, assessmentId) {
  let assessment = null;
  if (assessmentId) {
    const rows = await prisma.$queryRaw`
      SELECT * FROM assessments WHERE id = ${assessmentId} AND is_active = true LIMIT 1
    `;
    if (rows && rows.length) assessment = rows[0];
  }
  if (!assessment) {
    const rowsExact = await prisma.$queryRaw`
      SELECT * FROM assessments WHERE competency_id = ${competencyId} AND is_active = true
      ORDER BY updated_at DESC LIMIT 1
    `;
    if (rowsExact && rowsExact.length) assessment = rowsExact[0];
  }
  if (!assessment) {
    const rowsGlobal = await prisma.$queryRaw`
      SELECT * FROM assessments WHERE apply_to_all = true AND is_active = true
      ORDER BY updated_at DESC LIMIT 1
    `;
    if (rowsGlobal && rowsGlobal.length) assessment = rowsGlobal[0];
  }
  return assessment;
}

// Public: get settings summary for a competency
router.get('/settings/:competencyId', async (req, res) => {
  try {
    const { competencyId } = req.params;
    const { userId } = req.query;
    const assessment = await selectAssessmentForCompetency(competencyId, null);
    const numQuestions = Number(assessment?.num_questions || 10);
    const timeLimitMinutes = Number(assessment?.time_limit_minutes || 30);
    let allowMultipleAttempts = Boolean(assessment?.allow_multiple_attempts ?? true);
    let maxAttempts = Number(assessment?.max_attempts ?? 3);

    let attemptsUsed = 0;
    if (userId) {
      const rows = await prisma.$queryRaw`
        SELECT COUNT(*)::int as cnt
        FROM assessment_sessions
        WHERE user_id = ${userId}
          AND competency_id = ${competencyId}
          AND status = 'COMPLETED'
      `;
      attemptsUsed = rows?.[0]?.cnt ?? 0;
    }
    const attemptsAllowed = allowMultipleAttempts ? maxAttempts : 1;
    const attemptsLeft = Math.max(0, attemptsAllowed - attemptsUsed);

    res.json({ 
      success: true, 
      numQuestions, 
      timeLimitMinutes,
      allowMultipleAttempts,
      maxAttempts,
      attemptsUsed,
      attemptsLeft,
    });
  } catch (error) {
    console.error('Error fetching assessment settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// Utility: shuffle array (Fisher-Yates)
function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Get available competencies for assessment
router.get('/competencies', async (req, res) => {
  try {
    const { userId } = req.query;

    let competencies = [];

    if (userId) {
      // Debug: inspect employee job_code and job mapping
      try {
        const empRows = await prisma.$queryRaw`
          SELECT sid, job_code FROM employees WHERE TRIM(UPPER(sid)) = TRIM(UPPER(${userId})) LIMIT 1
        `;
        console.log('[user-assessments/competencies] employee row:', empRows);
        if (empRows && empRows.length) {
          const jobRows = await prisma.$queryRaw`
            SELECT id, code FROM jobs WHERE TRIM(UPPER(code)) = TRIM(UPPER(${empRows[0].job_code})) LIMIT 1
          `;
          console.log('[user-assessments/competencies] matched job row:', jobRows);
          if (jobRows && jobRows.length) {
            const jcCount = await prisma.$queryRaw`
              SELECT COUNT(*)::int as cnt FROM job_competencies WHERE "jobId" = ${jobRows[0].id}
            `;
            console.log('[user-assessments/competencies] job_competencies count:', jcCount);
          }
        }
      } catch (dbgErr) {
        console.warn('[user-assessments/competencies] debug queries failed:', dbgErr?.message || dbgErr);
      }
      // Filter competencies by the user's job_code via job_competency mappings
      console.log('[user-assessments/competencies] Fetch for userId:', userId, 'raw:', req.query.userId);
      competencies = await prisma.$queryRaw`
        SELECT DISTINCT 
          c.id,
          c.name,
          c.description,
          COALESCE(COUNT(DISTINCT CASE WHEN q.is_active = true THEN q.id END), 0) as question_count
        FROM employees e
        JOIN jobs j ON TRIM(UPPER(j.code)) = TRIM(UPPER(e.job_code))
        JOIN job_competencies jc ON jc."jobId" = j.id
        JOIN competencies c ON c.id = jc."competencyId"
        LEFT JOIN questions q ON c.id = q.competency_id
        WHERE TRIM(UPPER(e.sid)) = TRIM(UPPER(${userId}))
        GROUP BY c.id, c.name, c.description
        HAVING COALESCE(COUNT(DISTINCT CASE WHEN q.is_active = true THEN q.id END), 0) > 0
        ORDER BY c.name
      `;
      console.log('[user-assessments/competencies] mapped count:', competencies?.length || 0);

      // Fallback: if no competencies found for user (missing job_code/mapping), return global list
      if (!competencies || competencies.length === 0) {
        console.warn('[user-assessments/competencies] No mapped competencies for user', userId, '— falling back to global list');
        competencies = await prisma.$queryRaw`
          SELECT DISTINCT 
            c.id,
            c.name,
            c.description,
            COUNT(q.id) as question_count
          FROM competencies c
          LEFT JOIN questions q ON c.id = q.competency_id
          WHERE q.is_active = true
          GROUP BY c.id, c.name, c.description
          HAVING COUNT(q.id) > 0
          ORDER BY c.name
        `;
        console.log('[user-assessments/competencies] fallback count:', competencies?.length || 0);
      }
    } else {
      // Previous behavior: all competencies with at least 1 active question
      competencies = await prisma.$queryRaw`
        SELECT DISTINCT 
          c.id,
          c.name,
          c.description,
          COUNT(q.id) as question_count
        FROM competencies c
        LEFT JOIN questions q ON c.id = q.competency_id
        WHERE q.is_active = true
        GROUP BY c.id, c.name, c.description
        HAVING COUNT(q.id) > 0
        ORDER BY c.name
      `;
    }

    // Enrich with active assessment settings and filter out competencies without questions or assessments
    const enriched = await Promise.all(
      competencies.map(async (comp) => {
        const assessment = await selectAssessmentForCompetency(comp.id, null);
        const hasQuestions = Number(comp.question_count) > 0;
        const hasAssessment = !!assessment;
        
        return {
          id: comp.id,
          name: comp.name,
          description: comp.description,
          questionCount: Number(comp.question_count),
          numQuestions: assessment ? Number(assessment.num_questions || 0) : 0,
          timeLimitMinutes: assessment ? Number(assessment.time_limit_minutes || 0) : 0,
          hasQuestions,
          hasAssessment,
        };
      })
    );

    // Filter out competencies that don't have questions OR assessments
    const competenciesWithQuestionsAndAssessments = enriched.filter(comp => comp.hasQuestions && comp.hasAssessment);

    res.json({ success: true, competencies: competenciesWithQuestionsAndAssessments });
  } catch (error) {
    console.error('Error fetching competencies for assessment:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch competencies' });
  }
});

// Start assessment - get 10 random questions for a competency
router.post('/start', async (req, res) => {
  try {
    const { competencyId, userId, assessmentId } = req.body;

    if (!competencyId || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Competency ID and User ID are required' 
      });
    }

    // Defaults
    let numQuestions = 10;
    let timeLimitMinutes = 30;
    let selectionStrategy = 'RANDOM';
    let difficultyFilter = null;
    let questionTypes = null;
    let settings = {
      allow_multiple_attempts: true,
      max_attempts: 3,
      show_timer: true,
      force_time_limit: false,
      show_dashboard: true,
      show_correct_answers: true,
      show_incorrect_answers: true
    };

    // Prefer explicit assessmentId; else pick active assessment for competency, else global
    const assessment = await selectAssessmentForCompetency(competencyId, assessmentId);

    if (assessment) {
      numQuestions = Number(assessment.num_questions || numQuestions);
      timeLimitMinutes = Number(assessment.time_limit_minutes || timeLimitMinutes);
      settings = {
        allow_multiple_attempts: assessment.allow_multiple_attempts,
        max_attempts: assessment.max_attempts,
        show_timer: assessment.show_timer,
        force_time_limit: assessment.force_time_limit,
        show_dashboard: assessment.show_dashboard,
        show_correct_answers: assessment.show_correct_answers,
        show_incorrect_answers: assessment.show_incorrect_answers
      };
    }

    // Attempt limits enforcement
    const attemptsAllowed = settings.allow_multiple_attempts ? Number(settings.max_attempts || 3) : 1;
    const attemptsRows = await prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt
      FROM assessment_sessions
      WHERE user_id = ${userId}
        AND competency_id = ${competencyId}
        AND status = 'COMPLETED'
    `;
    const attemptsUsed = attemptsRows?.[0]?.cnt ?? 0;
    if (attemptsUsed >= attemptsAllowed) {
      return res.status(403).json({
        success: false,
        error: 'Attempt limit reached for this competency',
        meta: { attemptsAllowed, attemptsUsed, attemptsLeft: 0 }
      });
    }

    // Build dynamic filters (reserved for future use)
    const difficultyLevels = difficultyFilter ? difficultyFilter.split(',') : null;
    const typesFilter = questionTypes ? questionTypes.split(',') : null;

    let questions = [];

    // Prefer new questions: exclude ones the user recently saw for this competency (last 3 completed sessions)
    const recentSeen = await prisma.$queryRaw`
      SELECT DISTINCT ar.question_id, s.completed_at
      FROM assessment_responses ar
      JOIN assessment_sessions s ON s.id = ar.session_id
      WHERE s.user_id = ${userId}
        AND s.competency_id = ${competencyId}
        AND s.status = 'COMPLETED'
      ORDER BY s.completed_at DESC
      LIMIT 200
    `;
    const recentIds = (recentSeen || []).map(r => `'${r.question_id}'`).join(',');
    const excludeRecentClause = recentIds ? `AND q.id NOT IN (${recentIds})` : '';

    if (selectionStrategy === 'BY_LEVEL' && numQuestions === 8) {
      // 2 per level: BASIC, INTERMEDIATE, ADVANCED, MASTERY
      questions = await prisma.$queryRawUnsafe(`
        (
          SELECT q.id, q.text, q.type, q.points, q.explanation,
                 c.name as competency_name, cl.level as competency_level
          FROM questions q
          JOIN competencies c ON q.competency_id = c.id
          LEFT JOIN competency_levels cl ON q.competency_level_id = cl.id
          WHERE q.competency_id = $1
            AND q.is_active = true
            AND cl.level = 'BASIC'
            ${excludeRecentClause}
          ORDER BY RANDOM() LIMIT 2
        )
        UNION ALL
        (
          SELECT q.id, q.text, q.type, q.points, q.explanation,
                 c.name as competency_name, cl.level as competency_level
          FROM questions q
          JOIN competencies c ON q.competency_id = c.id
          LEFT JOIN competency_levels cl ON q.competency_level_id = cl.id
          WHERE q.competency_id = $1
            AND q.is_active = true
            AND cl.level = 'INTERMEDIATE'
            ${excludeRecentClause}
          ORDER BY RANDOM() LIMIT 2
        )
        UNION ALL
        (
          SELECT q.id, q.text, q.type, q.points, q.explanation,
                 c.name as competency_name, cl.level as competency_level
          FROM questions q
          JOIN competencies c ON q.competency_id = c.id
          LEFT JOIN competency_levels cl ON q.competency_level_id = cl.id
          WHERE q.competency_id = $1
            AND q.is_active = true
            AND cl.level = 'ADVANCED'
            ${excludeRecentClause}
          ORDER BY RANDOM() LIMIT 2
        )
        UNION ALL
        (
          SELECT q.id, q.text, q.type, q.points, q.explanation,
                 c.name as competency_name, cl.level as competency_level
          FROM questions q
          JOIN competencies c ON q.competency_id = c.id
          LEFT JOIN competency_levels cl ON q.competency_level_id = cl.id
          WHERE q.competency_id = $1
            AND q.is_active = true
            AND cl.level = 'MASTERY'
            ${excludeRecentClause}
          ORDER BY RANDOM() LIMIT 2
        )
      `, competencyId);
    } else {
      // Default RANDOM strategy (with recent-exclusion) using inner picked subquery to allow ORDER BY RANDOM()
      questions = await prisma.$queryRawUnsafe(`
        WITH picked AS (
          SELECT q.id
          FROM questions q
          WHERE q.competency_id = $1
            AND q.is_active = true
            ${excludeRecentClause}
          ORDER BY RANDOM()
          LIMIT $2
        )
        SELECT 
          q.id,
          q.text,
          q.type,
          q.points,
          q.explanation,
          c.name as competency_name,
          cl.level as competency_level
        FROM picked p
        JOIN questions q ON q.id = p.id
        JOIN competencies c ON q.competency_id = c.id
        LEFT JOIN competency_levels cl ON q.competency_level_id = cl.id
      `, competencyId, numQuestions);
      // If exclusion left too few, fallback without exclusion
      if (!questions || questions.length < numQuestions) {
        const fallback = await prisma.$queryRaw`
          WITH picked AS (
            SELECT q.id
            FROM questions q
            WHERE q.competency_id = ${competencyId}
              AND q.is_active = true
            ORDER BY RANDOM()
            LIMIT ${numQuestions}
          )
          SELECT 
            q.id,
            q.text,
            q.type,
            q.points,
            q.explanation,
            c.name as competency_name,
            cl.level as competency_level
          FROM picked p
          JOIN questions q ON q.id = p.id
          JOIN competencies c ON q.competency_id = c.id
          LEFT JOIN competency_levels cl ON q.competency_level_id = cl.id
        `;
        if (fallback && fallback.length >= (questions?.length || 0)) {
          questions = fallback;
        }
      }
    }

    if (questions.length < numQuestions) {
      return res.status(400).json({
        success: false,
        error: `Not enough questions available. Found ${questions.length} questions, need at least ${numQuestions}.`
      });
    }

    // Get options for each question
    const questionsWithOptions = await Promise.all(
      questions.map(async (question) => {
        const options = await prisma.$queryRaw`
          SELECT id, text, "order" as order_index
          FROM question_options
          WHERE question_id = ${question.id}
          ORDER BY "order"
        `;

        // Shuffle options so the correct answer is not always first
        const shuffled = shuffleArray(options).map((opt, index) => ({
          id: opt.id,
          text: opt.text,
          orderIndex: index + 1,
        }));

        return {
          ...question,
          options: shuffled
        };
      })
    );

    // Create assessment session
    const assessmentSession = await prisma.$queryRaw`
      INSERT INTO assessment_sessions (
        id, user_id, competency_id, status, started_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid()::text, ${userId}, ${competencyId}, 'IN_PROGRESS', NOW(), NOW(), NOW()
      ) RETURNING id, started_at
    `;

    res.json({
      success: true,
      assessment: {
        sessionId: assessmentSession[0].id,
        competencyId,
        competencyName: questions[0].competency_name,
        startedAt: assessmentSession[0].started_at,
        questions: questionsWithOptions,
        timeLimitMinutes,
        settings
      }
    });
  } catch (error) {
    console.error('Error starting assessment:', error);
    res.status(500).json({ success: false, error: 'Failed to start assessment' });
  }
});

// Submit assessment answers
router.post('/submit', async (req, res) => {
  try {
    const { sessionId, answers } = req.body;

    if (!sessionId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Session ID and answers array are required' 
      });
    }

    // Get the assessment session
    const session = await prisma.$queryRaw`
      SELECT * FROM assessment_sessions WHERE id = ${sessionId}
    `;

    if (!session || session.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Assessment session not found' 
      });
    }

    if (session[0].status !== 'IN_PROGRESS') {
      return res.status(400).json({ 
        success: false, 
        error: 'Assessment session is not in progress' 
      });
    }

    let totalScore = 0;
    let correctAnswers = 0;
    const totalQuestions = answers.length;

    // Process each answer
    for (const answer of answers) {
      const { questionId, selectedOptionId, answerText } = answer;

      // Get the correct answer for this question
      const correctAnswer = await prisma.$queryRaw`
        SELECT 
          qo.id as correct_option_id,
          qo.text as correct_option_text,
          q.points,
          q.type
        FROM questions q
        LEFT JOIN question_options qo ON q.id = qo.question_id AND qo.is_correct = true
        WHERE q.id = ${questionId}
      `;

      if (correctAnswer && correctAnswer.length > 0) {
        const correct = correctAnswer[0];
        let isCorrect = false;

        if (correct.type === 'MULTIPLE_CHOICE') {
          isCorrect = selectedOptionId === correct.correct_option_id;
        } else if (correct.type === 'TRUE_FALSE') {
          isCorrect = answerText === correct.correct_option_text;
        } else if (correct.type === 'SHORT_ANSWER' || correct.type === 'ESSAY') {
          // For text answers, we'll need manual review, so mark as pending
          isCorrect = false;
        }

        if (isCorrect) {
          totalScore += Number(correct.points);
          correctAnswers++;
        }

        // Save the answer
        await prisma.$queryRaw`
          INSERT INTO assessment_responses (
            id, session_id, question_id, selected_option_id, answer_text, 
            is_correct, points_earned, created_at, updated_at
          ) VALUES (
            gen_random_uuid()::text, ${sessionId}, ${questionId}, 
            ${selectedOptionId || null}, ${answerText || null}, 
            ${isCorrect}, ${isCorrect ? Number(correct.points) : 0}, 
            NOW(), NOW()
          )
        `;
      }
    }

    // Calculate percentage score
    const percentageScore = Math.round((correctAnswers / totalQuestions) * 100);

    // Update assessment session
    await prisma.$queryRaw`
      UPDATE assessment_sessions 
      SET 
        status = 'COMPLETED',
        score = ${totalScore},
        percentage_score = ${percentageScore},
        correct_answers = ${correctAnswers},
        total_questions = ${totalQuestions},
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${sessionId}
    `;

    // Determine competency level based on score
    let competencyLevel = 'BASIC';
    if (percentageScore >= 80) {
      competencyLevel = 'MASTERY';
    } else if (percentageScore >= 60) {
      competencyLevel = 'ADVANCED';
    } else if (percentageScore >= 40) {
      competencyLevel = 'INTERMEDIATE';
    }

    // Try to persist the system_level if column exists
    try {
      await prisma.$queryRaw`
        ALTER TABLE assessment_sessions
        ADD COLUMN IF NOT EXISTS system_level TEXT,
        ADD COLUMN IF NOT EXISTS user_confirmed_level TEXT,
        ADD COLUMN IF NOT EXISTS manager_selected_level TEXT
      `;
      await prisma.$queryRaw`
        UPDATE assessment_sessions SET system_level = ${competencyLevel} WHERE id = ${sessionId}
      `;
    } catch (_) {}

    res.json({
      success: true,
      result: {
        sessionId,
        totalScore,
        percentageScore,
        correctAnswers,
        totalQuestions,
        competencyLevel,
        completedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error submitting assessment:', error);
    res.status(500).json({ success: false, error: 'Failed to submit assessment' });
  }
});

// Confirm user level for a session
router.post('/confirm-level', async (req, res) => {
  try {
    const { sessionId, userConfirmedLevel } = req.body;
    if (!sessionId || !userConfirmedLevel) {
      return res.status(400).json({ success: false, error: 'sessionId and userConfirmedLevel are required' });
    }
    console.log('Confirm level request:', { sessionId, userConfirmedLevel });

    // Validate session exists
    const exists = await prisma.$queryRaw`
      SELECT 1 FROM assessment_sessions WHERE id = ${sessionId} LIMIT 1
    `;
    if (!exists || exists.length === 0) {
      return res.status(404).json({ success: false, error: 'Assessment session not found' });
    }
    // Ensure columns exist
    await ensureLevelColumns();

    try {
      await prisma.$queryRaw`
        UPDATE assessment_sessions
        SET user_confirmed_level = ${userConfirmedLevel}, updated_at = NOW()
        WHERE id = ${sessionId}
      `;
    } catch (e) {
      console.error('Failed to update user_confirmed_level:', e);
      return res.status(500).json({ success: false, error: `Failed to save level: ${e.message || e}` });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error confirming user level:', error);
    res.status(500).json({ success: false, error: `Failed to confirm user level: ${error.message || error}` });
  }
});

// Get assessment history for a user
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const assessments = await prisma.$queryRaw`
      SELECT 
        as.id as session_id,
        as.competency_id,
        c.name as competency_name,
        as.score,
        as.percentage_score,
        as.correct_answers,
        as.total_questions,
        as.started_at,
        as.completed_at,
        as.status
      FROM assessment_sessions as
      JOIN competencies c ON as.competency_id = c.id
      WHERE as.user_id = ${userId}
      ORDER BY as.completed_at DESC
    `;

    res.json({
      success: true,
      assessments: assessments.map(assessment => ({
        sessionId: assessment.session_id,
        competencyId: assessment.competency_id,
        competencyName: assessment.competency_name,
        score: Number(assessment.score),
        percentageScore: Number(assessment.percentage_score),
        correctAnswers: Number(assessment.correct_answers),
        totalQuestions: Number(assessment.total_questions),
        startedAt: assessment.started_at,
        completedAt: assessment.completed_at,
        status: assessment.status
      }))
    });
  } catch (error) {
    console.error('Error fetching assessment history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assessment history' });
  }
});

// Get latest assessment result for a specific competency
router.get('/latest-result/:userId/:competencyId', async (req, res) => {
  try {
    const { userId, competencyId } = req.params;

    const assessment = await prisma.$queryRaw`
      SELECT 
        as.id as session_id,
        as.competency_id,
        c.name as competency_name,
        as.score,
        as.percentage_score,
        as.correct_answers,
        as.total_questions,
        as.started_at,
        as.completed_at,
        as.status,
        as.system_level,
        as.user_confirmed_level
      FROM assessment_sessions as
      JOIN competencies c ON as.competency_id = c.id
      WHERE as.user_id = ${userId} 
        AND as.competency_id = ${competencyId}
        AND as.status = 'COMPLETED'
      ORDER BY as.completed_at DESC
      LIMIT 1
    `;

    if (!assessment || assessment.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No completed assessment found for this competency' 
      });
    }

    const result = assessment[0];

    // Fetch detailed responses for the session
    const details = await prisma.$queryRaw`
      SELECT 
        q.id AS question_id,
        q.text AS question_text,
        q.type AS question_type,
        q.points AS question_points,
        ar.selected_option_id,
        sel_opt.text AS selected_option_text,
        ar.answer_text,
        ar.is_correct,
        corr_opt.id AS correct_option_id,
        corr_opt.text AS correct_option_text
      FROM assessment_responses ar
      JOIN questions q ON q.id = ar.question_id
      LEFT JOIN question_options sel_opt ON sel_opt.id = ar.selected_option_id
      LEFT JOIN question_options corr_opt ON corr_opt.question_id = q.id AND corr_opt.is_correct = true
      WHERE ar.session_id = ${result.session_id}
      ORDER BY q.id
    `;

    res.json({
      success: true,
      assessment: {
        sessionId: result.session_id,
        competencyId: result.competency_id,
        competencyName: result.competency_name,
        score: Number(result.score),
        percentageScore: Number(result.percentage_score),
        correctAnswers: Number(result.correct_answers),
        totalQuestions: Number(result.total_questions),
        startedAt: result.started_at,
        completedAt: result.completed_at,
        status: result.status,
        systemLevel: result.system_level,
        userConfirmedLevel: result.user_confirmed_level,
        details: details.map(d => ({
          questionId: d.question_id,
          questionText: d.question_text,
          questionType: d.question_type,
          points: Number(d.question_points || 0),
          selectedOptionId: d.selected_option_id,
          selectedOptionText: d.selected_option_text,
          answerText: d.answer_text,
          isCorrect: !!d.is_correct,
          correctOptionId: d.correct_option_id,
          correctOptionText: d.correct_option_text
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching latest assessment result:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assessment result' });
  }
});

// Get assessment result by sessionId (full details)
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const rows = await prisma.$queryRaw`
      SELECT 
        as.id as session_id,
        as.competency_id,
        c.name as competency_name,
        as.score,
        as.percentage_score,
        as.correct_answers,
        as.total_questions,
        as.started_at,
        as.completed_at,
        as.status,
        as.system_level,
        as.user_confirmed_level
      FROM assessment_sessions as
      JOIN competencies c ON as.competency_id = c.id
      WHERE as.id = ${sessionId}
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const result = rows[0];

    const details = await prisma.$queryRaw`
      SELECT 
        q.id AS question_id,
        q.text AS question_text,
        q.type AS question_type,
        q.points AS question_points,
        ar.selected_option_id,
        sel_opt.text AS selected_option_text,
        ar.answer_text,
        ar.is_correct,
        corr_opt.id AS correct_option_id,
        corr_opt.text AS correct_option_text
      FROM assessment_responses ar
      JOIN questions q ON q.id = ar.question_id
      LEFT JOIN question_options sel_opt ON sel_opt.id = ar.selected_option_id
      LEFT JOIN question_options corr_opt ON corr_opt.question_id = q.id AND corr_opt.is_correct = true
      WHERE ar.session_id = ${sessionId}
      ORDER BY q.id
    `;

    res.json({
      success: true,
      assessment: {
        sessionId: result.session_id,
        competencyId: result.competency_id,
        competencyName: result.competency_name,
        score: Number(result.score),
        percentageScore: Number(result.percentage_score),
        correctAnswers: Number(result.correct_answers),
        totalQuestions: Number(result.total_questions),
        startedAt: result.started_at,
        completedAt: result.completed_at,
        status: result.status,
        systemLevel: result.system_level,
        userConfirmedLevel: result.user_confirmed_level,
        details: details.map(d => ({
          questionId: d.question_id,
          questionText: d.question_text,
          questionType: d.question_type,
          points: Number(d.question_points || 0),
          selectedOptionId: d.selected_option_id,
          selectedOptionText: d.selected_option_text,
          answerText: d.answer_text,
          isCorrect: !!d.is_correct,
          correctOptionId: d.correct_option_id,
          correctOptionText: d.correct_option_text
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching session result:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch session result' });
  }
});

// Manager: set manager_selected_level for a session
router.post('/manager-level', async (req, res) => {
  try {
    const { sessionId, managerSelectedLevel } = req.body;
    if (!sessionId || !managerSelectedLevel) {
      return res.status(400).json({ success: false, error: 'sessionId and managerSelectedLevel are required' });
    }

    // Ensure columns exist
    await ensureLevelColumns();

    // Validate session exists
    const exists = await prisma.$queryRaw`
      SELECT 1 FROM assessment_sessions WHERE id = ${sessionId} LIMIT 1
    `;
    if (!exists || exists.length === 0) {
      return res.status(404).json({ success: false, error: 'Assessment session not found' });
    }

    await prisma.$queryRaw`
      UPDATE assessment_sessions
      SET manager_selected_level = ${managerSelectedLevel}, updated_at = NOW()
      WHERE id = ${sessionId}
    `;

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving manager level:', error);
    res.status(500).json({ success: false, error: 'Failed to save manager level' });
  }
});

// Manager: latest completed result per competency for a user
router.get('/latest-by-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const rows = await prisma.$queryRaw`
      WITH latest AS (
        SELECT DISTINCT ON (as.competency_id)
          as.id as session_id,
          as.competency_id,
          c.name as competency_name,
          as.score,
          as.percentage_score,
          as.correct_answers,
          as.total_questions,
          as.completed_at,
          as.system_level,
          as.user_confirmed_level,
          as.manager_selected_level
        FROM assessment_sessions as
        JOIN competencies c ON as.competency_id = c.id
        WHERE as.user_id = ${userId}
          AND as.status = 'COMPLETED'
        ORDER BY as.competency_id, as.completed_at DESC
      )
      SELECT * FROM latest ORDER BY competency_name;
    `;

    res.json({
      success: true,
      results: rows.map(r => ({
        sessionId: r.session_id,
        competencyId: r.competency_id,
        competencyName: r.competency_name,
        score: Number(r.score || 0),
        percentageScore: Number(r.percentage_score || 0),
        correctAnswers: Number(r.correct_answers || 0),
        totalQuestions: Number(r.total_questions || 0),
        completedAt: r.completed_at,
        systemLevel: r.system_level,
        userConfirmedLevel: r.user_confirmed_level,
        managerSelectedLevel: r.manager_selected_level
      }))
    });
  } catch (error) {
    console.error('Error fetching latest results by user:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch results' });
  }
});

module.exports = router;
