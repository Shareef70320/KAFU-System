# KAFU System Success Patterns

**Purpose:** Proven solutions that work for common scenarios

## 🎯 **Pattern 1: Frontend Not Updating**

### **Symptoms:**
- Code changes don't appear in browser
- Old data still showing
- Statistics showing wrong numbers

### **Root Cause:**
Frontend container running old built code

### **Solution (30 seconds):**
```bash
docker-compose build frontend
docker-compose up -d frontend
```

### **Verification:**
```bash
curl -s "http://localhost:5001/api/employees?limit=5" | jq '.employees | length'
```

---

## 🎯 **Pattern 2: API Database Mismatch**

### **Symptoms:**
- "Internal server error" from API
- Prisma errors about missing columns
- Field name mismatches

### **Root Cause:**
Backend using old Prisma schema, database has different structure

### **Solution:**
```bash
# 1. Update Prisma schema to match database
# 2. Use raw SQL queries instead of Prisma ORM
# 3. Copy updated code to container
docker cp backend/routes/employees.js kafu-backend:/app/routes/employees.js
docker-compose restart backend
```

---

## 🎯 **Pattern 3: Data Import Success**

### **Scenario:**
Importing HR data from CSV to database

### **Proven Process:**
```bash
# 1. Generate SQL from CSV
node generate_full_import.js

# 2. Copy to postgres container
docker cp ./import_all_employees_full.sql kafu-postgres:/tmp/

# 3. Import data
docker-compose exec postgres psql -U kafu_user -d kafu_system -f /tmp/import_all_employees_full.sql

# 4. Verify import
curl -s "http://localhost:5001/api/employees/stats/overview" | jq '.total'
```

---

## 🎯 **Pattern 4: Complete System Reset**

### **When to Use:**
- Multiple issues at once
- Containers in inconsistent state
- Need clean slate

### **Process:**
```bash
# 1. Stop everything
docker-compose down

# 2. Rebuild all containers
docker-compose build

# 3. Start fresh
docker-compose up -d

# 4. Re-import data
docker cp ./import_all_employees_full.sql kafu-postgres:/tmp/
docker-compose exec postgres psql -U kafu_user -d kafu_system -f /tmp/import_all_employees_full.sql

# 5. Verify everything works
curl -s "http://localhost:5001/api/employees?limit=5" | jq '.employees | length'
```

---

## 🎯 **Pattern 5: Frontend-Backend Sync**

### **Problem:**
Frontend and backend out of sync

### **Solution:**
```bash
# 1. Update backend code
docker cp backend/routes/employees.js kafu-backend:/app/routes/employees.js
docker-compose restart backend

# 2. Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend

# 3. Test both
curl -s "http://localhost:5001/api/employees?limit=5"
# Then check http://localhost:3000/employees
```

---

## 🎯 **Pattern 6: Database Schema Updates**

### **When:**
Need to add new fields or change structure

### **Process:**
```bash
# 1. Update Prisma schema
# 2. Regenerate Prisma client
docker-compose exec backend npx prisma generate

# 3. Use raw SQL for queries (avoid Prisma ORM issues)
# 4. Update API endpoints
# 5. Rebuild frontend
```

---

## 🎯 **Pattern 7: Cache Issues**

### **Symptoms:**
- Browser shows old data
- API works but frontend doesn't update

### **Solution:**
```bash
# 1. Rebuild frontend (clears container cache)
docker-compose build frontend
docker-compose up -d frontend

# 2. Clear browser cache
# Chrome: Ctrl+Shift+R
# Firefox: Ctrl+F5
# Or: Developer Tools → Right-click refresh → "Empty Cache and Hard Reload"
```

---

## 🎯 **Pattern 8: API Testing**

### **Quick Health Check:**
```bash
# 1. Check if API is responding
curl -s "http://localhost:5001/api/health"

# 2. Test employees endpoint
curl -s "http://localhost:5001/api/employees?limit=5" | jq '.employees | length'

# 3. Check statistics
curl -s "http://localhost:5001/api/employees/stats/overview" | jq '.total'
```

---

## 🎯 **Pattern 9: Container Debugging**

### **Check Container Status:**
```bash
# 1. See all containers
docker-compose ps

# 2. Check logs
docker-compose logs backend --tail=10
docker-compose logs frontend --tail=10

# 3. Check container build time
docker-compose exec frontend ls -la /usr/share/nginx/html/
```

---

## 🎯 **Pattern 10: Data Verification**

### **Verify Data is Correct:**
```bash
# 1. Check total count
curl -s "http://localhost:5001/api/employees/stats/overview" | jq '.total'

# 2. Check sample data
curl -s "http://localhost:5001/api/employees?limit=1" | jq '.employees[0]'

# 3. Check specific fields
curl -s "http://localhost:5001/api/employees?limit=1" | jq '.employees[0] | {id, first_name, last_name, sid, division}'
```

---

## 📋 **Quick Reference Commands**

```bash
# Rebuild frontend
docker-compose build frontend && docker-compose up -d frontend

# Update backend code
docker cp backend/routes/employees.js kafu-backend:/app/routes/employees.js && docker-compose restart backend

# Test API
curl -s "http://localhost:5001/api/employees?limit=5" | jq '.employees | length'

# Check logs
docker-compose logs backend --tail=5

# Complete reset
docker-compose down && docker-compose build && docker-compose up -d
```

---

## 🎯 **Pattern 11: Persisting New Fields In Existing Update APIs**

### Symptoms:
- Editing an entity saves most fields, but one field (e.g., `numberOfQuestions`) does not persist.
- UI lists show old values even after a successful update toast.

### Root Causes:
- Frontend sends wrong key names (snake_case vs camelCase).
- Backend `UPDATE` route doesn’t include the new field in its SET list.
- Containers serving stale code due to cache.
- Frontend query cache not invalidated/refetched after mutation.

### Working Recipe:
1) Align payload keys end-to-end
   - Frontend must send camelCase keys the API expects, e.g. `numberOfQuestions`, `timeLimit`, `maxAttempts`.
   - For “Apply to All”, send `applyToAll: true` and translate to `competencyId = null` server-side.

2) Update backend route to save every setting
   - In `backend/routes/assessments.js` add setters for:
     `"numberOfQuestions"`, `"shuffleQuestions"`, `"allowMultipleAttempts"`, `"showTimer"`, `"forceTimeLimit"`, `"showDashboard"`, `"showCorrectAnswers"`, `"showIncorrectAnswers"`.
   - Parse numbers safely: `parseInt(numberOfQuestions, 10)` with a sensible default.

3) Cache-bust containers when code appears stale
   - Backend: `docker-compose build backend --no-cache && docker-compose up -d backend`.
   - Frontend (if UI still stale): rebuild with `--no-cache`.

4) Force UI to pick up new data
   - After mutation: `invalidateQueries(['new-assessments']);` then `refetchQueries` for the same key.

5) Verify at both layers
   - API: `curl -X PUT /api/assessments/:id -d '{"numberOfQuestions":12}'` → response reflects 12.
   - DB: query `assessments."numberOfQuestions"` to confirm row updated.

### Outcome:
- Field persists reliably and assessment cards display the updated count immediately.

---

## 🎯 **Pattern 13: Docker Development Mode Proxy Configuration**

### **Problem:**
Frontend shows "Error loading competencies: Request failed with status code 500" and console shows "ECONNREFUSED" errors when trying to connect to backend

### **Root Cause:**
Frontend proxy configuration pointing to `localhost:5000` instead of the correct Docker container name `kafu-backend-dev:5000`

### **Symptoms:**
- Frontend logs show: `Proxy error: Could not proxy request /api/competencies from localhost:3000 to http://localhost:5000 (ECONNREFUSED)`
- Backend is running and healthy but frontend can't reach it
- API works when called directly (`curl http://localhost:5001/api/competencies`) but fails through frontend
- Data appears to "not load" even though backend has the data

### **Solution (2 minutes):**
```bash
# 1. Fix proxy configuration in frontend container
docker exec kafu-frontend-dev sed -i 's/"proxy": "http:\/\/localhost:5000"/"proxy": "http:\/\/kafu-backend-dev:5000"/' package.json

# 2. Restart frontend to apply proxy changes
docker compose -f docker-compose.dev.yml restart frontend

# 3. Test frontend can reach backend
curl -s "http://localhost:3000/api/competencies?page=1&limit=5" | jq '.competencies | length'
# Should return: 5 (or actual number of competencies)
```

### **Why This Happens:**
- In Docker containers, `localhost` refers to the container itself, not the host machine
- Frontend container needs to use the backend container's service name (`kafu-backend-dev`) to communicate
- Development mode uses `docker-compose.dev.yml` with bind mounts, requiring proper container networking

### **Prevention:**
- Always use container service names in proxy configurations for Docker development
- Check `docker-compose.dev.yml` service names when setting up proxy
- Test API connectivity through frontend after container restarts
- Verify both direct API (`localhost:5001`) and proxied API (`localhost:3000/api`) work

### **Verification:**
```bash
# Test direct backend API
curl -s "http://localhost:5001/api/competencies?page=1&limit=5" | jq '.competencies | length'

# Test frontend proxy to backend
curl -s "http://localhost:3000/api/competencies?page=1&limit=5" | jq '.competencies | length'

# Both should return the same result
# Check frontend logs for no more ECONNREFUSED errors
docker compose -f docker-compose.dev.yml logs frontend | tail -5
```

### **Outcome:**
- Frontend successfully connects to backend
- All API calls work through frontend proxy
- Data loads correctly in all pages
- No more ECONNREFUSED errors in console

---

## 🎯 **Pattern 15: Jobs Management Data Population**

### **Problem:**
Jobs Management page shows "No jobs found" message and empty statistics cards

### **Root Cause:**
Jobs table is empty - jobs data needs to be populated from employee data using the sync script

### **Symptoms:**
- Jobs Management page shows "No jobs found" message
- Statistics cards show 0 for Total Jobs, Active Jobs, Units, Divisions
- API returns empty array: `{"jobs": [], "pagination": {"total": 0}}`
- Database jobs table is empty: `SELECT COUNT(*) FROM jobs;` returns 0

### **Solution (3 minutes):**
```bash
# 1. Copy sync script to backend container
docker cp sync_jobs_from_employees.js kafu-backend-dev:/app/

# 2. Run the sync script to populate jobs from employee data
docker exec kafu-backend-dev node /app/sync_jobs_from_employees.js

# 3. Verify jobs were created
docker exec kafu-postgres-dev psql -U kafu_user -d kafu_system -c "SELECT COUNT(*) FROM jobs;"
# Should return: 471 (or similar number)

# 4. Test Jobs API
curl -s "http://localhost:5001/api/jobs?page=1&limit=5" | jq '.jobs | length'
# Should return: 5

# 5. Test frontend can access jobs
curl -s "http://localhost:3000/api/jobs?page=1&limit=5" | jq '.jobs | length'
# Should return: 5
```

### **Why This Happens:**
- Jobs table starts empty after database restoration
- Jobs data needs to be extracted from employee records
- The `sync_jobs_from_employees.js` script creates unique job positions from employee job codes
- This is a one-time setup step after restoring database backups

### **Prevention:**
- Always run job sync script after restoring database backups
- Include job sync in database restoration procedures
- Document that jobs data comes from employee data, not separate import
- Verify jobs count matches unique employee job codes

### **Verification:**
```bash
# Check jobs count in database
docker exec kafu-postgres-dev psql -U kafu_user -d kafu_system -c "SELECT COUNT(*) FROM jobs;"

# Test Jobs API
curl -s "http://localhost:5001/api/jobs?page=1&limit=5" | jq '.pagination.total'

# Test frontend proxy
curl -s "http://localhost:3000/api/jobs?page=1&limit=5" | jq '.pagination.total'

# Both should return the same count (e.g., 471)
```

### **Outcome:**
- Jobs Management page displays 471 unique job positions
- Statistics cards show correct counts (471 Total Jobs, etc.)
- API returns full job data with pagination
- Frontend can successfully load and display jobs
- Jobs are properly linked to employees

---

## 🎯 **Success Metrics**

- **API Response:** Should return 1,254 employees
- **Frontend Display:** Shows real HR data with SID numbers
- **Statistics:** Total employees = 1,254
- **Performance:** API responds in < 1 second
- **Data Quality:** All fields populated from CSV
- **Real-time Updates:** Calculations update immediately on input changes

---

---

## 🎯 **Pattern 16: Assessment Data Restoration and API Fix**

### **Problem Solved:** 
Assessments page showing "Failed to load assessments" error

### **Root Cause:** 
1. Empty assessments table - no assessment data exists in database
2. Backend API queries reference non-existent database columns (snake_case vs camelCase mismatch)

### **Solution Applied:**
```bash
# 1. Insert sample assessment data using correct camelCase column names
docker exec kafu-postgres-dev psql -U kafu_user -d kafu_system -c "
INSERT INTO assessments (id, title, description, \"competencyId\", \"isActive\", \"timeLimit\", \"passingScore\", \"maxAttempts\", \"createdBy\", \"updatedAt\") 
VALUES 
  ('assessment-1', 'Communication Skills Assessment', 'Assessment for evaluating communication competency', 'COMPETENCY_ID_1', true, 30, 70.0, 3, 'admin', NOW()),
  ('assessment-2', 'Strategic Thinking Assessment', 'Assessment for evaluating strategic thinking competency', 'COMPETENCY_ID_2', true, 45, 75.0, 2, 'admin', NOW()),
  ('assessment-3', 'Leading Change Assessment', 'Assessment for evaluating leading change competency', 'COMPETENCY_ID_3', true, 40, 80.0, 3, 'admin', NOW())
ON CONFLICT (id) DO NOTHING;
"

# 2. Fix backend API to remove references to non-existent columns
# In backend/routes/assessments.js, remove these columns from SELECT queries:
# - a."numberOfQuestions" as "numberOfQuestions"
# - a."shuffleQuestions" as "shuffleQuestions" 
# - a."allowMultipleAttempts" as "allowMultipleAttempts"
# - a."showTimer" as "showTimer"
# - a."forceTimeLimit" as "forceTimeLimit"
# - a."showDashboard" as "showDashboard"
# - a."showCorrectAnswers" as "showCorrectAnswers"
# - a."showIncorrectAnswers" as "showIncorrectAnswers"

# 3. Copy updated code to container
docker cp backend/routes/assessments.js kafu-backend-dev:/app/routes/assessments.js

# 4. Restart backend
docker compose -f docker-compose.dev.yml restart backend

# 5. Test API
curl -s "http://localhost:5001/api/assessments" | jq '.success'
# Should return: true
```

### **Why This Works:**
- Assessment tables start empty after database restoration
- Backend code references columns that don't exist in actual database schema
- Database uses camelCase column names but SQL files use snake_case
- Assessment data needs to be manually inserted using correct column names

### **Prevention:**
- Always check actual database schema before writing SQL queries
- Use correct camelCase column names when inserting data
- Test APIs after database restoration to ensure all endpoints work
- Verify column names match between Prisma schema and actual database

### **Verification:**
```bash
# Check assessments count in database
docker exec kafu-postgres-dev psql -U kafu_user -d kafu_system -c "SELECT COUNT(*) FROM assessments;"
# Should return: 3 (or number of inserted assessments)

# Test Assessments API
curl -s "http://localhost:5001/api/assessments" | jq '.assessments | length'
# Should return: 3

# Test frontend proxy
curl -s "http://localhost:3000/api/assessments" | jq '.success'
# Should return: true

# Test in frontend:
# 1. Go to Assessments page
# 2. Should show assessment list without errors
# 3. Should display assessment cards with competency names
```

### **Outcome:**
- Assessments page loads without errors
- API returns 3 assessments with competency information
- Frontend displays assessment cards with proper data
- All CRUD operations work correctly
- Database schema matches API expectations

---

---

## 🎯 **Pattern 17: Assessment Creation NOT NULL Constraint Fix**

### **Problem Solved:** 
"Create New Assessment" page showing "Request failed with status code 500" error

### **Root Cause:** 
Database `NOT NULL` constraint on `competencyId` field conflicts with "Apply to All Competencies" feature

### **Solution Applied:**
```bash
# 1. Make competencyId nullable in database
docker exec kafu-postgres-dev psql -U kafu_user -d kafu_system -c "ALTER TABLE assessments ALTER COLUMN \"competencyId\" DROP NOT NULL;"

# 2. Verify constraint was removed
docker exec kafu-postgres-dev psql -U kafu_user -d kafu_system -c "\d assessments" | grep "competencyId"
# Should show: competencyId | text | | | (no "not null")

# 3. Test both scenarios
# Test "Apply to All Competencies" (competencyId: null)
curl -X POST "http://localhost:5001/api/assessments" \
  -H "Content-Type: application/json" \
  -d '{"title": "Universal Assessment", "competencyId": null, "createdBy": "admin"}'

# Test specific competency (competencyId: "VALID_ID")
curl -X POST "http://localhost:5001/api/assessments" \
  -H "Content-Type: application/json" \
  -d '{"title": "Specific Assessment", "competencyId": "VALID_COMPETENCY_ID", "createdBy": "admin"}'
```

### **Why This Works:**
- "Apply to All Competencies" feature requires `competencyId` to be `null`
- Database schema had `NOT NULL` constraint preventing null values
- Removing constraint allows both specific and universal assessments
- Foreign key constraint still maintains referential integrity when competencyId is provided

### **Prevention:**
- Always check database constraints when implementing nullable field features
- Test both specific competency and "Apply to All" scenarios during development
- Verify database schema supports all application features
- Use nullable fields for optional relationships

### **Verification:**
```bash
# Test "Apply to All Competencies" creation
curl -X POST "http://localhost:5001/api/assessments" \
  -H "Content-Type: application/json" \
  -d '{"title": "Universal Assessment", "competencyId": null, "createdBy": "admin"}'
# Should return: {"success":true,"assessment":{"competencyId":null,...}}

# Test specific competency creation
curl -X POST "http://localhost:5001/api/assessments" \
  -H "Content-Type: application/json" \
  -d '{"title": "Specific Assessment", "competencyId": "VALID_COMPETENCY_ID", "createdBy": "admin"}'
# Should return: {"success":true,"assessment":{"competencyId":"VALID_COMPETENCY_ID",...}}

# Test in frontend:
# 1. Go to Create Assessment page
# 2. Fill in required fields
# 3. Check "Apply to All Competencies" OR select specific competency
# 4. Click "Create Assessment"
# 5. Should succeed without 500 error
```

### **Outcome:**
- Assessment creation works for both "Apply to All" and specific competencies
- No more 500 errors when creating assessments
- Database schema supports all application features
- Foreign key constraints maintain data integrity
- Frontend can successfully create assessments in all scenarios

---

**Last Updated:** January 15, 2025 - 2:30 PM  
**Status:** All patterns tested and working ✅

---

## 🎯 **Pattern 8: Assessment System Complete Fix**

### **Symptoms:**
- "Failed to start assessment" error when clicking Start Assessment
- "Failed to submit assessment" error when submitting answers
- Backend logs show column name errors:
  - `column q.competencyid does not exist`
  - `column qo.is_correct does not exist`
  - `column "updatedAt" of relation "assessment_sessions" does not exist`

### **Root Cause:**
Multiple database schema mismatches between camelCase and snake_case column names across different tables in the assessment system

### **Solution:**
```bash
# 1. Fix column name references in backend/routes/userAssessments.js:

# Questions table uses camelCase (quoted):
q."competencyId" = c.id
q."competencyLevelId" = cl.id

# Question_options table uses camelCase (quoted):
qo."questionId" = ${question.id}
qo."isCorrect" = true

# Assessment_sessions table uses snake_case (unquoted):
ORDER BY updated_at DESC LIMIT 1
SET updated_at = NOW()

# Assessment_responses table uses snake_case (unquoted):
is_correct, points_earned, created_at, updated_at

# Assessments table uses camelCase (quoted):
ORDER BY "updatedAt" DESC LIMIT 1

# 2. Copy updated file to container
docker cp backend/routes/userAssessments.js kafu-backend-dev:/app/routes/userAssessments.js

# 3. Restart backend
docker compose -f docker-compose.dev.yml restart backend

# 4. Link questions to competencies (if needed)
docker exec kafu-postgres-dev psql -U kafu_user -d kafu_system -c "UPDATE questions SET \"competencyId\" = 'COMPETENCY_ID' WHERE id IN (SELECT id FROM questions LIMIT 10);"
```

### **Why This Works:**
- Different tables use different naming conventions (camelCase vs snake_case)
- PostgreSQL is case-sensitive with quoted column names
- Raw SQL queries must match exact column names from database schema
- Assessment system spans multiple tables with different schemas
- Proper quoting ensures PostgreSQL interprets column names correctly

### **Prevention:**
- Always check table schema with `\d table_name` before writing SQL queries
- Use consistent quoting for camelCase columns (`"columnName"`)
- Use unquoted names for snake_case columns (`column_name`)
- Test both start and submit assessment flows after any database changes
- Document column naming conventions for each table

### **Verification:**
```bash
# Test start assessment
curl -X POST "http://localhost:5001/api/user-assessments/start" \
  -H "Content-Type: application/json" \
  -d '{"competencyId": "COMPETENCY_ID", "userId": "2254"}' | jq '.success'
# Should return: true

# Test submit assessment  
curl -X POST "http://localhost:5001/api/user-assessments/submit" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "SESSION_ID", "answers": [{"questionId": "QUESTION_ID", "selectedOptionId": "OPTION_ID"}]}' | jq '.success'
# Should return: true

# Test competencies list
curl -s "http://localhost:5001/api/user-assessments/competencies?userId=2254" | jq '.success'
# Should return: true

# Test complete assessment flow in frontend:
# 1. Go to User Assessments page
# 2. Should see competency cards with "Start Assessment" buttons
# 3. Click "Start Assessment" - should load questions
# 4. Answer questions and click "Submit Assessment"
# 5. Should see results with score and competency level
```

### **Outcome:**
- **Start Assessment:** ✅ Working - Creates session, loads 10 questions with options
- **Submit Assessment:** ✅ Working - Processes answers, calculates score and competency level
- **Competencies List:** ✅ Working - Shows available competencies for user
- **Complete Assessment Flow:** ✅ Working - End-to-end assessment process functional
- **User Experience:** ✅ Seamless - Users can take assessments without errors
- **Data Integrity:** ✅ Maintained - All assessment data properly stored and retrieved

### **Files Modified:**
- `backend/routes/userAssessments.js` - Fixed all column name references across start/submit/competencies endpoints

### **Key Learning:**
- Database schema consistency is critical for complex systems
- Different tables may use different naming conventions
- PostgreSQL case sensitivity requires careful attention to quoting
- End-to-end testing reveals integration issues that unit tests miss

---

**Last Updated:** October 13, 2025 - 7:30 PM  
**Status:** All patterns tested and working ✅

---

## 🎯 **Pattern 18: Job-Based Competency Visibility (User-Specific)**

### **Symptoms:**
- Users see competencies on My Competencies that are not part of their job
- Different users (e.g., SID 1566, 2422) see the same global competencies

### **Root Cause:**
- API returned globally available competencies (with questions) when no job mappings found
- Frontend did not filter against `job_competencies`

### **Solution:**
```bash
# Backend (userAssessments.js): enforce job-based mapping, remove fallback
# - Join employees -> jobs -> job_competencies -> competencies
# - If no mappings for the user's job, return empty list (no fallback)

# Frontend (MyCompetencies.js):
# - Fetch jobs to resolve user's jobId
# - Fetch /job-competencies for jobId
# - Filter competencies to mapped competencyId set
```

### **Why This Works:**
- Guarantees competency visibility is tied to the user's job profile
- Prevents unrelated/global competencies from appearing

### **Verification:**
```bash
# SID 1566 (SS-LD-171 has no mappings) => []
curl -s "http://localhost:5001/api/user-assessments/competencies?userId=1566" | jq '.competencies | length' # 0

# SID 2422 (SS-PC-150 has no mappings) => []
curl -s "http://localhost:5001/api/user-assessments/competencies?userId=2422" | jq '.competencies | length' # 0

# After adding job_competencies for a job, competencies appear
```

### **Outcome:**
- Users only see competencies mapped to their job
- Consistent with Job Competency Profiles
- Cleaner UX and less confusion

**Last Updated:** October 14, 2025 - 10:56 AM  
**Status:** Verified ✅

