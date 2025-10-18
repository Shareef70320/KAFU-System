# KAFU System Troubleshooting Guide

**Created:** September 8, 2024  
**Purpose:** Quick reference for common issues and their solutions

## 🚨 **CRITICAL: Frontend Not Updating Issue**

### **Problem:** 
Frontend shows old data despite code changes

### **Root Cause:** 
Frontend container running old built code, not current source code

### **Quick Diagnosis:**
```bash
# Check when frontend was built
docker-compose exec frontend ls -la /usr/share/nginx/html/

# If timestamps are old, rebuild needed
```

### **Solution (30 seconds):**
```bash
# 1. Rebuild frontend with current code
docker-compose build frontend

# 2. Restart with new build
docker-compose up -d frontend

# 3. Verify API is working
curl -s "http://localhost:5001/api/employees?limit=5" | jq '.employees | length'
```

### **Prevention:**
- Always rebuild containers after code changes
- Check container build timestamps when debugging
- Use `docker-compose build` not just `restart`

---

## 🔧 **API Not Working Issues**

### **Problem:** 
API returns "Internal server error" or old data

### **Common Causes:**
1. Backend using old Prisma schema
2. Database field name mismatches
3. Container using cached code

### **Solution:**
```bash
# 1. Copy updated code to container
docker cp backend/routes/employees.js kafu-backend:/app/routes/employees.js

# 2. Restart backend
docker-compose restart backend

# 3. Test API
curl -s "http://localhost:5001/api/employees?limit=5"
```

---

## 📊 **Database Data Issues**

### **Problem:** 
Data disappears after container restart

### **Root Cause:** 
Data not persistent, containers recreate database

### **Solution:**
```bash
# 1. Re-import data
docker cp ./import_all_employees_full.sql kafu-postgres:/tmp/
docker-compose exec postgres psql -U kafu_user -d kafu_system -f /tmp/import_all_employees_full.sql

# 2. Verify import
curl -s "http://localhost:5001/api/employees/stats/overview" | jq '.total'
```

---

## 🎯 **Success Patterns**

### **When Frontend Shows Old Data:**
1. Check container build time
2. Rebuild frontend container
3. Clear browser cache
4. Verify API response

### **When API Returns Errors:**
1. Check backend logs: `docker-compose logs backend --tail=10`
2. Copy updated code to container
3. Restart backend
4. Test with curl

### **When Data is Missing:**
1. Check if containers were restarted
2. Re-import data from SQL file
3. Verify database connection
4. Test API endpoints

---

## ⚡ **Quick Commands Reference**

```bash
# Rebuild everything
docker-compose build
docker-compose up -d

# Rebuild just frontend
docker-compose build frontend
docker-compose up -d frontend

# Check API health
curl -s "http://localhost:5001/api/health"

# Test employees API
curl -s "http://localhost:5001/api/employees?limit=5" | jq '.employees | length'

# Check container status
docker-compose ps

# View logs
docker-compose logs backend --tail=10
docker-compose logs frontend --tail=10
```

---

## 🔍 **Debugging Checklist**

### **Frontend Issues:**
- [ ] Check container build timestamp
- [ ] Rebuild frontend container
- [ ] Clear browser cache (Ctrl+Shift+R)
- [ ] Check browser console for errors
- [ ] Verify API is responding

### **Backend Issues:**
- [ ] Check backend logs for errors
- [ ] Copy updated code to container
- [ ] Restart backend container
- [ ] Test API with curl
- [ ] Verify database connection

### **Database Issues:**
- [ ] Check if data exists in database
- [ ] Re-import data if needed
- [ ] Verify table structure
- [ ] Check for foreign key constraints

---

## 📝 **Lessons Learned**

1. **Always rebuild containers** after code changes
2. **Check build timestamps** when debugging
3. **Test API directly** with curl before checking frontend
4. **Keep it simple** - don't overcomplicate fixes
5. **Verify the actual running code**, not just source files

---

## 🎯 **Current Working State**

- **Frontend:** Built with current code, showing 1,254 employees
- **Backend:** Using raw SQL queries, working correctly
- **Database:** 1,254 employees imported from HRData.csv
- **API:** All endpoints working, returning real HR data
- **User Profile:** Working with SID 2254, showing Job Competency Profile
- **User Assessments:** ✅ Working - 2 competency cards showing for SID 2254, Start Assessment functional
- **Default Assessment:** ✅ Working - 10 questions, 30 minutes, linked to competencies via assessment_questions table
- **Assessment Filtering:** ✅ Working - Only shows competency cards that have assessments available
- **Question-Based Filtering:** ✅ Working - Only shows competencies that have both questions AND assessments
- **Assessment Settings:** ✅ Working - Proper time limits, question counts, and attempt limits displayed

**Last Updated:** October 2025 - Assessment System Database Schema Fixed

## 🔧 **Assessment System "Failed to fetch competencies" Error Fix**

### **Problem:** 
User Assessments page shows "Failed to fetch competencies" error and no competency cards are displayed

### **Root Cause:** 
1. Missing `assessment_sessions` table in database
2. Backend code using incorrect column names (`competencyId` vs `competency_id`)
3. Assessment settings using wrong column references (`time_limit_minutes` vs `timeLimit`)

### **Symptoms:**
- User Assessments API returns `{"success": false, "error": "Failed to fetch competencies"}`
- Backend logs show: `relation "assessment_sessions" does not exist`
- No competency cards shown on Take Assessment page
- Assessment system appears completely broken

### **Solution:**
```bash
# 1. Create missing assessment_sessions table
docker exec -i kafu-postgres-dev psql -U kafu_user -d kafu_system < create_user_assessment_tables.sql

# 2. Add missing columns to assessment_sessions table
docker exec kafu-postgres-dev psql -U kafu_user -d kafu_system -c "ALTER TABLE assessment_sessions ADD COLUMN IF NOT EXISTS user_confirmed_level TEXT, ADD COLUMN IF NOT EXISTS manager_selected_level TEXT, ADD COLUMN IF NOT EXISTS system_level TEXT;"

# 3. Link questions to assessments
docker exec kafu-postgres-dev psql -U kafu_user -d kafu_system -c "INSERT INTO assessment_questions (id, \"assessmentId\", \"questionId\", \"order\", points) SELECT gen_random_uuid()::text, '0b92450f-3551-4e13-8378-3cf468f9c333', id, ROW_NUMBER() OVER(), 1 FROM questions LIMIT 10;"

# 4. Fix backend code column references
# In backend/routes/userAssessments.js, replace all instances:
# - competencyId → competency_id (in SQL queries)
# - time_limit_minutes → timeLimit (in assessment object references)
# - max_attempts → maxAttempts (in assessment object references)

# 5. Copy updated code to container
docker cp backend/routes/userAssessments.js kafu-backend-dev:/app/routes/userAssessments.js

# 6. Restart backend
docker compose -f docker-compose.dev.yml restart backend
```

### **Why This Happens:**
- Database restoration doesn't include all required tables
- Backend code was written for different database schema
- Column naming inconsistencies between camelCase and snake_case
- Assessment system requires specific table structure to function

### **Prevention:**
- Always run complete database setup scripts after restoration
- Verify all required tables exist before testing assessment system
- Use consistent column naming conventions
- Test assessment system after any database changes

### **Verification:**
```bash
# Test user assessments API
curl -s "http://localhost:5001/api/user-assessments/competencies?userId=2254" | jq '.success'
# Should return: true

# Test assessment settings
curl -s "http://localhost:5001/api/user-assessments/settings/COMPETENCY_ID?userId=2254" | jq '.success'
# Should return: true

# Test frontend proxy
curl -s "http://localhost:3000/api/user-assessments/competencies?userId=2254" | jq '.success'
# Should return: true

# Check competency cards show with proper settings
curl -s "http://localhost:5001/api/user-assessments/competencies?userId=2254" | jq '.competencies[] | {name, numQuestions, timeLimitMinutes}'
# Should show competencies with numQuestions: 10, timeLimitMinutes: 30
```

## 🔧 **User Profile "Error loading profile" Fix**

### **Problem:** 
User profile shows "Error loading profile" message

### **Root Cause:** 
API pagination limit too small, SID 2254 not included in default response

### **Solution:**
```bash
# 1. Update API call to use larger limit
# In UserProfile.js, change:
# api.get('/employees') 
# to:
# api.get('/employees?limit=2000')

# 2. Rebuild frontend
docker-compose build frontend

# 3. Restart frontend
docker-compose up -d frontend
```

### **Verification:**
```bash
# Test API with large limit
curl -s "http://localhost:5001/api/employees?limit=2000" | grep -o '"sid":"2254"'
```

## 🔧 **Employee Update "Internal server error" Fix**

### **Problem:** 
Employee update returns "Internal server error" when saving

### **Root Cause:** 
Backend trying to update non-existent database columns (employment_type)

### **Solution:**
```bash
# 1. Remove non-existent fields from allowedFields array
# In backend/routes/employees.js, remove 'employment_type' from allowedFields

# 2. Copy updated code to container
docker cp backend/routes/employees.js kafu-backend:/app/routes/employees.js

# 3. Restart backend
docker-compose restart backend

# 4. Test API
curl -X PUT "http://localhost:5001/api/employees/EMP001" \
  -H "Content-Type: application/json" \
  -d '{"line_manager_sid": "3096"}'
```

### **Verification:**
```bash
# Test valid SID (should succeed)
curl -X PUT "http://localhost:5001/api/employees/EMP001" \
  -H "Content-Type: application/json" \
  -d '{"line_manager_sid": "3096"}'

# Test invalid SID (should fail with validation error)
curl -X PUT "http://localhost:5001/api/employees/EMP001" \
  -H "Content-Type: application/json" \
  -d '{"line_manager_sid": "9999"}'
```

## 🔧 **BigInt JSON Serialization Error Fix**

### **Problem:** 
API returns "Failed to load" with BigInt conversion errors in logs

### **Root Cause:** 
PostgreSQL returns BigInt values that can't be serialized to JSON, causing "Cannot mix BigInt and other types" errors

### **Symptoms:**
- API returns `{"success":false,"error":"Failed to fetch..."}`
- Backend logs show: `TypeError: Cannot mix BigInt and other types, use explicit conversions`
- Usually happens with COUNT() queries or numeric fields

### **Solution:**
```bash
# 1. Fix the SQL query to cast BigInt to regular numbers
# In the problematic route file (e.g., backend/routes/questions.js):

# OLD (causes BigInt error):
# COUNT(qo.id) as option_count
# total: parseInt(total[0]?.count || 0)

# NEW (fixes BigInt error):
# COUNT(qo.id)::int as option_count
# total: Number(total[0]?.count || 0)

# 2. Copy updated file to container
docker cp backend/routes/questions.js kafu-backend:/app/routes/questions.js

# 3. Restart backend
docker-compose restart backend

# 4. Test API
curl -s "http://localhost:5001/api/questions?page=1&limit=10" | jq '.success'
```

### **Prevention:**
- Always cast COUNT() results to `::int` in SQL queries
- Use `Number()` instead of `parseInt()` for BigInt values
- Test APIs after database schema changes

### **Verification:**
```bash
# Test API response
curl -s "http://localhost:5001/api/questions?page=1&limit=10" | jq '.success'
# Should return: true

# Check for BigInt errors in logs
docker-compose logs backend --tail=5
# Should not show BigInt conversion errors
```

## 🔧 **Edit Question Modal Issues Fix**

### **Problem:** 
Edit question modal shows empty fields - competency level not selected, options not populated, correct answer not checked

### **Root Cause:** 
1. CSV case sensitivity: Backend checking for 'true' but CSV had 'True'
2. API field mismatch: Frontend looking for 'order' but API returns 'order_index'
3. Level ID mismatch: Static level IDs vs actual database UUIDs

### **Solution:**
```bash
# 1. Fix CSV case sensitivity in backend
# In backend/routes/questions.js, change:
# const isCorrect = row[`option_${i}_is_correct`] === 'true';
# to:
# const isCorrect = row[`option_${i}_is_correct`]?.toLowerCase() === 'true';

# 2. Fix API field mapping in frontend
# In frontend/src/components/EditQuestionModal.js, change:
# orderIndex: opt.order
# to:
# orderIndex: opt.order_index

# 3. Fix level ID mapping in QuestionBank
# Replace static levels array with dynamic extraction from competencies

# 4. Copy updated files to containers
docker cp backend/routes/questions.js kafu-backend:/app/routes/questions.js
docker-compose restart backend
docker-compose build frontend && docker-compose up -d frontend

# 5. Fix existing data
docker-compose exec postgres psql -U kafu_user -d kafu_system -c "UPDATE question_options SET is_correct = true WHERE question_id IN (SELECT id FROM questions) AND \"order\" = 1;"
```

### **Verification:**
```bash
# Test question options API
curl -s "http://localhost:5001/api/questions/QUESTION_ID/options" | jq '.options[0].is_correct'
# Should return: true

# Test edit modal in browser
# 1. Go to Question Bank page
# 2. Click Edit on any question
# 3. Verify: Competency Level selected, Options populated, Correct answer checked
```

## 🔧 **Assessment Cards Not Showing Fix**

### **Problem:** 
User sees "no cards" on Take Assessment page despite having competencies assigned

### **Root Cause:** 
Frontend UserContext default SID doesn't match the user being tested (default: '2255', needed: '2254')

### **Symptoms:**
- Take Assessment page shows "SID: 2255 | competencies: 0"
- User has job_code and competencies in database
- API works when called directly with correct SID

### **Solution:**
```bash
# 1. Change SID in frontend UI
# In the top bar, change SID input from '2255' to '2254'

# OR clear localStorage to reset defaults:
# 2. Open browser console (F12)
# 3. Run: localStorage.clear()
# 4. Refresh page

# 3. Verify competencies are loaded
curl -s 'http://localhost:5001/api/user-assessments/competencies?userId=2254' | jq '.competencies | length'
# Should return: 9
```

### **Prevention:**
- Always check UserContext default values when testing
- Use role switcher to change SID for different users
- Clear localStorage when switching between different test scenarios

### **Verification:**
```bash
# Test competencies API with correct SID
curl -s 'http://localhost:5001/api/user-assessments/competencies?userId=2254' | jq '.competencies[] | select(.name == "Learning and Development Planning")'
# Should return competency with numQuestions and timeLimitMinutes
```

## 🔧 **"Failed to start assessment" Error Fix**

### **Problem:** 
Clicking "Start Assessment" returns "Failed to start assessment" error

### **Root Cause:** 
SQL query with `SELECT DISTINCT` and `ORDER BY` without including ordered column in SELECT list

### **Symptoms:**
- Backend logs show: `ERROR: for SELECT DISTINCT, ORDER BY expressions must appear in select list`
- Assessment cards show but start button fails
- Error code: `42P10`

### **Solution:**
```bash
# 1. Fix the SQL query in backend/routes/userAssessments.js
# Change this query (around line 271):
# SELECT DISTINCT ar.question_id
# FROM assessment_responses ar
# JOIN assessment_sessions s ON s.id = ar.session_id
# WHERE s.user_id = ${userId}
#   AND s.competency_id = ${competencyId}
#   AND s.status = 'COMPLETED'
# ORDER BY s.completed_at DESC

# To this:
# SELECT DISTINCT ar.question_id, s.completed_at
# FROM assessment_responses ar
# JOIN assessment_sessions s ON s.id = ar.session_id
# WHERE s.user_id = ${userId}
#   AND s.competency_id = ${competencyId}
#   AND s.status = 'COMPLETED'
# ORDER BY s.completed_at DESC

# 2. Deploy the fix
git add -A && git commit -m "fix(user-assessments): add completed_at to SELECT DISTINCT query"
docker compose up -d --build

# 3. Test assessment start
curl -X POST 'http://localhost:5001/api/user-assessments/start' \
  -H 'Content-Type: application/json' \
  -d '{"competencyId": "COMPETENCY_ID", "userId": "2254"}'
```

### **Prevention:**
- Always include ORDER BY columns in SELECT DISTINCT queries
- Test SQL queries before deploying
- Check for PostgreSQL-specific syntax requirements

### **Verification:**
```bash
# Test assessment start API
curl -X POST 'http://localhost:5001/api/user-assessments/start' \
  -H 'Content-Type: application/json' \
  -d '{"competencyId": "cmf8t6fte0043m8ize1jcr4rb", "userId": "2254"}' | jq '.success'
# Should return: true

# Check backend logs
docker logs --tail=10 kafu-backend
# Should not show DISTINCT/ORDER BY errors
```

## 🔧 **Database Schema Mismatch Fix**

### **Problem:** 
API returns "column does not exist" errors despite Prisma schema showing different field names

### **Root Cause:** 
Prisma schema uses camelCase (e.g., `title`) but actual database uses snake_case (e.g., `name`)

### **Symptoms:**
- Backend logs show: `column a.title does not exist`
- API returns 500 errors
- Prisma schema shows different field names than database

### **Solution:**
```bash
# 1. Check actual database schema
docker exec kafu-postgres psql -U kafu_user -d kafu_system -c "\d table_name"

# 2. Update SQL queries to use correct column names
# In backend/routes/assessments.js, change:
# a.title
# to:
# a.name as title

# 3. Fix BigInt serialization issues
# Change:
# COUNT(*) as count
# to:
# COUNT(*)::int as count

# 4. Deploy fixes
git add -A && git commit -m "fix(assessments): use correct column names and fix BigInt serialization"
docker compose up -d --build
```

### **Prevention:**
- Always check actual database schema before writing queries
- Use `::int` casting for COUNT() queries to avoid BigInt issues
- Test APIs after schema changes

### **Verification:**
```bash
# Test assessments API
curl -s 'http://localhost:5001/api/assessments' | jq '.success'
# Should return: true

# Check for column errors in logs
docker logs --tail=10 kafu-backend
# Should not show "column does not exist" errors
```

## 🔧 **Question-Based Competency Filtering Fix**

### **Problem:** 
Competencies show up in My Competencies page even when they don't have questions available

### **Root Cause:** 
My Competencies page was using job-competencies API which doesn't check for question availability

### **Solution:**
```bash
# 1. Update My Competencies page to use user-assessments/competencies API
# In frontend/src/pages/user/MyCompetencies.js, change:
# const { data: jcpData } = useQuery({
#   queryKey: ['user-jcp', currentSid, employeeData?.job_code],
#   queryFn: async () => {
#     const response = await api.get('/job-competencies');
#     // ... job-competencies logic
#   }
# });

# To:
# const { data: competenciesData } = useQuery({
#   queryKey: ['user-competencies', currentSid],
#   queryFn: async () => {
#     const response = await api.get(`/user-assessments/competencies?userId=${currentSid}`);
#     return response.data;
#   }
# });

# 2. Update rendering logic to only show "Take Assessment" button for competencies with questions
# {competency.hasQuestions && competency.hasAssessment && (
#   <Button onClick={() => window.location.href = '/user/assessments'}>
#     Take Assessment
#   </Button>
# )}

# 3. Deploy changes
git add -A && git commit -m "feat(my-competencies): filter by questions and assessments"
docker compose up -d --build
```

### **Prevention:**
- Always use the user-assessments/competencies API for user-facing competency lists
- Check both `hasQuestions` and `hasAssessment` flags before showing action buttons
- Test with competencies that have no questions to ensure proper filtering

### **Verification:**
```bash
# Test competencies API
curl -s 'http://localhost:5001/api/user-assessments/competencies?userId=2254' | jq '.competencies | length'
# Should return only competencies with questions and assessments

# Check individual competency flags
curl -s 'http://localhost:5001/api/user-assessments/competencies?userId=2254' | jq '.competencies[] | {name, hasQuestions, hasAssessment}'
# All returned competencies should have both flags as true
```

## 🔧 **Page Refresh Loading Delay Fix**

### **Problem:** 
Page takes a long time to load when refreshed, appears to be "processing in the back"

### **Root Cause:** 
Excessive API calls to `/user-assessments/settings/` endpoint for each competency card, causing network congestion and slow page rendering

### **Symptoms:**
- Page shows loading state for extended time after refresh
- Multiple repeated API calls to settings endpoint in logs
- Network tab shows many pending requests
- User sees "processing" indicator

### **Solution:**
```bash
# 1. Remove redundant useSettings hook calls
# In frontend/src/pages/user/UserAssessments.js, remove:
# const useSettings = (competencyId) => useQuery({...});

# 2. Use data already available in competencies response
# The competencies API already includes numQuestions and timeLimitMinutes
# No need for additional settings API calls

# 3. Update CompetencyCard to use competency data directly
# const CompetencyCard = ({ competency }) => {
#   const numQ = competency.numQuestions;
#   const tlm = competency.timeLimitMinutes;
#   // Remove useSettings calls
# };

# 4. Deploy changes
git add -A && git commit -m "fix(user-assessments): remove redundant settings API calls"
docker compose up -d --build
```

### **Prevention:**
- Always check if data is already available before making additional API calls
- Use React Query efficiently - avoid duplicate queries for the same data
- Monitor network requests in browser dev tools during development
- Test page refresh performance regularly

### **Verification:**
```bash
# Check frontend logs for reduced API calls
docker logs --tail=20 kafu-frontend
# Should not see repeated /user-assessments/settings/ calls

# Test page refresh speed
# 1. Open browser dev tools (F12)
# 2. Go to Network tab
# 3. Refresh the page
# 4. Verify only necessary API calls are made
# 5. Page should load much faster
```

## 🔧 **Page Refresh Redirect Loop Fix**

### **Problem:** 
When refreshing any user page, the page either keeps loading indefinitely or redirects to `/user/competencies` instead of staying on the current page

### **Root Cause:** 
The UserContext was not properly initialized before routing logic executed, causing redirect loops and incorrect navigation behavior

### **Symptoms:**
- Page refresh redirects to `/user/competencies` instead of staying on current page
- Page shows loading state indefinitely
- User gets stuck in redirect loops
- Navigation doesn't work properly after refresh

### **Solution:**
```bash
# 1. Add initialization state to UserContext
# In frontend/src/contexts/UserContext.js, add:
# const [isInitialized, setIsInitialized] = useState(false);
# 
# useEffect(() => {
#   setIsInitialized(true);
#   console.log('UserContext - Initialized with values:', { currentRole, currentSid });
# }, []);

# 2. Update route guards to wait for initialization
# In frontend/src/components/UserRoute.js, AdminRoute.js, RoleBasedRedirect.js:
# if (!isInitialized) {
#   return <LoadingSpinner />;
# }

# 3. Deploy changes
git add -A && git commit -m "fix(routing): add initialization state to prevent redirect loops"
docker compose up -d --build
```

### **Prevention:**
- Always ensure context is fully initialized before making routing decisions
- Use loading states for async context initialization
- Test page refresh behavior on all routes
- Avoid redirects based on uninitialized state

### **Verification:**
```bash
# Test page refresh on different routes
# 1. Go to /user/assessments
# 2. Refresh the page (F5 or Cmd+R)
# 3. Should stay on /user/assessments, not redirect
# 4. Repeat for other user routes
# 5. Check browser console for initialization logs
```

## 🔧 **"Failed to fetch assessment result" Error Fix**

### **Problem:** 
"View Dashboard" button shows error "Failed to fetch assessment result" when trying to view completed assessment details

### **Root Cause:** 
PostgreSQL syntax error with table alias `as` - `as` is a reserved keyword in PostgreSQL and needs to be quoted when used as a table alias

### **Symptoms:**
- "View Dashboard" button shows error message
- Backend logs show: `ERROR: syntax error at or near "as"`
- Assessment history and latest-result endpoints fail
- Users cannot view their completed assessment details

### **Solution:**
```bash
# 1. Fix SQL queries in backend/routes/userAssessments.js
# Quote the table alias "as" in all PostgreSQL queries:

# Before (incorrect):
# FROM assessment_sessions as
# WHERE as.user_id = ${userId}

# After (correct):
# FROM assessment_sessions "as"
# WHERE "as".user_id = ${userId}

# 2. Apply fix to all affected endpoints:
# - /history/:userId
# - /latest-result/:userId/:competencyId
# - /session/:sessionId

# 3. Deploy changes
git add -A && git commit -m "fix(user-assessments): fix SQL syntax error with 'as' table alias"
docker compose up -d --build
```

### **Prevention:**
- Always quote table aliases that might be reserved keywords in PostgreSQL
- Test SQL queries in PostgreSQL console before implementing
- Use descriptive table aliases instead of short ones like "as"
- Review PostgreSQL reserved keywords list when choosing aliases

### **Verification:**
```bash
# Test the fixed endpoints
curl -s 'http://localhost:5001/api/user-assessments/history/2254' | jq '.assessments | length'
# Should return number of completed assessments

curl -s 'http://localhost:5001/api/user-assessments/latest-result/2254/COMPETENCY_ID' | jq '.assessment.competencyName'
# Should return competency name without errors

# Test in frontend
# 1. Go to Take Assessment page
# 2. Click "View Dashboard" on any competency card
# 3. Should show assessment details without errors
```

## 🔧 **Assessment Attempt Limits Implementation**

### **Feature:** 
"Start Assessment" button is disabled when all attempts are exhausted for a competency

### **Implementation:**
```bash
# 1. Add attempt tracking hook in frontend
# In frontend/src/pages/user/UserAssessments.js:
# const useAttempts = (competencyId) => useQuery({
#   queryKey: ['assessment-attempts', competencyId, currentUserId],
#   queryFn: async () => {
#     const res = await api.get(`/user-assessments/settings/${competencyId}?userId=${currentUserId}`);
#     return res.data;
#   },
#   enabled: !!competencyId && !!currentUserId,
# });

# 2. Update CompetencyCard to use attempt data
# const CompetencyCard = ({ competency }) => {
#   const { data: attemptsData, isLoading: attemptsLoading } = useAttempts(competency.id);
#   const attemptsLeft = attemptsData?.attemptsLeft || 0;
#   const disabled = !attemptsLoading && attemptsLeft === 0;
#   const attemptsInfo = attemptsLoading ? '' : (attemptsLeft > 0 ? ` (${attemptsLeft} left)` : ' (No attempts left)');
# };

# 3. Update button styling and text
# <Button 
#   disabled={startAssessmentMutation.isPending || disabled}
#   variant={disabled ? "secondary" : "default"}
# >
#   {disabled ? (
#     <>
#       <X className="mr-2 h-4 w-4" />
#       No Attempts Left
#     </>
#   ) : (
#     <>
#       <Play className="mr-2 h-4 w-4" />
#       Start Assessment{attemptsInfo}
#     </>
#   )}
# </Button>
```

### **Backend Support:**
- Attempt tracking is already implemented in `/user-assessments/settings/:competencyId`
- Returns: `attemptsLeft`, `attemptsUsed`, `maxAttempts`, `allowMultipleAttempts`
- Backend enforces limits in `/user-assessments/start` endpoint

### **User Experience:**
- Button shows "Start Assessment (X left)" when attempts available
- Button shows "No Attempts Left" and is disabled when exhausted
- Button uses secondary variant (grayed out) when disabled
- Attempt info updates in real-time

### **Verification:**
```bash
# Test attempt limits
curl -s 'http://localhost:5001/api/user-assessments/settings/COMPETENCY_ID?userId=2254' | jq '{attemptsLeft, attemptsUsed, maxAttempts}'

# In frontend:
# 1. Go to Take Assessment page
# 2. Check competency cards for attempt info
# 3. Buttons should be disabled for competencies with 0 attempts left
# 4. Buttons should show remaining attempts for available competencies
```

## 🔧 **Real-Time Calculation Issues Fix**

### **Problem:** 
Frontend calculations not updating when user changes input values (e.g., weighted scores remain static despite rating changes)

### **Root Cause:** 
Frontend relying on backend data instead of calculating live values for unsaved changes

### **Symptoms:**
- Weighted scores don't update when changing ratings
- Criticality levels show wrong values despite correct backend data
- User changes input but calculations remain static
- Only updates after saving to backend

### **Solution:**
```bash
# 1. Fix frontend calculation logic
# In frontend/src/pages/JobEvaluation.js, change:

# ❌ Wrong: Only use backend data (no real-time updates)
# const weightedScore = evaluation?.weighted_score || calculateWeightedScore(job.id);

# ✅ Correct: Always calculate live for real-time updates
# const weightedScore = calculateWeightedScore(job.id);

# ✅ Use backend criticality_level for saved evaluations, fallback to live calculation
# const scoreLabel = evaluation?.criticality_level || getScoreLabel(weightedScore);

# 2. Update thresholds to match backend
# const getScoreLabel = (score) => {
#   if (score >= 450) return 'High';    // ✅ Updated from > 4
#   if (score > 300) return 'Medium';   // ✅ Updated from >= 3
#   return 'Low';
# };

# 3. Deploy changes
# docker-compose build frontend && docker-compose up -d frontend
```

### **Key Principles:**
1. **Real-time calculations** for unsaved changes
2. **Backend data** for saved evaluations  
3. **Consistent thresholds** between frontend and backend
4. **Hybrid approach** - best of both worlds

### **Prevention:**
- Always calculate live values for user input changes
- Use backend data only for saved/persisted values
- Keep frontend and backend thresholds synchronized
- Test real-time updates during development

### **Verification:**
```bash
# Test real-time updates
# 1. Go to Job Evaluation page
# 2. Change rating values for any job
# 3. Weighted score should update immediately
# 4. Criticality level should update immediately
# 5. Save evaluation - should show backend criticality_level
# 6. Make unsaved changes - should show calculated criticality

# Check thresholds consistency
# Frontend: >=450 High, >300 Medium, <=300 Low
# Backend: >=450 High, >300 Medium, <=300 Low
# Should match exactly
```

## 🔧 **Jobs Management Page Shows No Data**

### **Problem:** 
Jobs Management page displays "No jobs found" message and shows empty statistics cards

### **Root Cause:** 
Jobs table is empty - jobs data needs to be populated from employee data using the sync script

### **Symptoms:**
- Jobs Management page shows "No jobs found" message
- Statistics cards show 0 for Total Jobs, Active Jobs, Units, Divisions
- API returns empty array: `{"jobs": [], "pagination": {"total": 0}}`
- Database jobs table is empty: `SELECT COUNT(*) FROM jobs;` returns 0

### **Solution:**
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

## 🔧 **Docker Development Mode Proxy Configuration Fix**

### **Problem:** 
Frontend shows "Error loading competencies: Request failed with status code 500" and console shows "ECONNREFUSED" errors when trying to connect to backend

### **Root Cause:** 
Frontend proxy configuration pointing to `localhost:5000` instead of the correct Docker container name `kafu-backend-dev:5000`

### **Symptoms:**
- Frontend logs show: `Proxy error: Could not proxy request /api/competencies from localhost:3000 to http://localhost:5000 (ECONNREFUSED)`
- Backend is running and healthy but frontend can't reach it
- API works when called directly (`curl http://localhost:5001/api/competencies`) but fails through frontend
- Data appears to "not load" even though backend has the data

### **Solution:**
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

## 🔧 **"Failed to create assessment" Error Fix**

### **Problem:** 
"Create New Assessment" page shows "Failed to create assessment" error when saving

### **Root Cause:** 
1. Database `NOT NULL` constraint on `competencyId` field conflicts with "Apply to All Competencies" feature
2. Invalid foreign key reference for `competencyLevelId`

### **Symptoms:**
- Backend logs show: `Failing row contains (null, null, null, ...)`
- Error code: `23502` (NOT NULL constraint violation)
- Assessment creation fails for both specific competencies and "Apply to All"

### **Solution:**
```bash
# 1. Make competencyId nullable in database
docker-compose exec postgres psql -U kafu_user -d kafu_system -c "ALTER TABLE assessments ALTER COLUMN \"competencyId\" DROP NOT NULL;"

# 2. Fix backend SQL query to handle null values properly
# In backend/routes/assessments.js, change:
# ${competencyId || null}, ${competencyLevelId || null}
# to:
# ${competencyId}, ${competencyLevelId}

# 3. Copy updated code to container
docker cp backend/routes/assessments.js kafu-backend:/app/routes/assessments.js

# 4. Restart backend
docker-compose restart backend

# 5. Test with valid competency level ID
curl -X POST "http://localhost:5001/api/assessments" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Assessment",
    "competencyId": null,
    "competencyLevelId": "VALID_LEVEL_ID",
    "timeLimit": 30,
    "passingScore": 70,
    "maxAttempts": 3,
    "createdBy": "admin"
  }'
```

### **Prevention:**
- Always check database constraints when implementing nullable fields
- Use valid foreign key references in API tests
- Test both specific competency and "Apply to All" scenarios
- Verify database schema matches application requirements

### **Verification:**
```bash
# Test assessment creation
curl -X POST "http://localhost:5001/api/assessments" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "competencyId": null, "competencyLevelId": "VALID_ID", "createdBy": "admin"}'
# Should return: {"success":true,"assessment":{...}}

# Test in frontend:
# 1. Go to Assessments page
# 2. Click "Create Assessment"
# 3. Fill in required fields
# 4. Check "Apply to All Competencies" or select specific competency
# 5. Click "Create Assessment"
# 6. Should succeed without errors
```

## 🔧 **Assessor Management Page Error After Assessment Fix**

### **Problem:** 
After fixing assessment creation, Assessor Management page shows "Failed to fetch assessor mappings" error

### **Root Cause:** 
1. Missing database tables (`review_requests`, `performance_reviews`, etc.)
2. Non-existent column `is_active` in `assessor_competencies` table

### **Symptoms:**
- Assessor Management page shows error after assessment fix
- Backend logs show: `column ac.is_active does not exist`
- Error code: `42703` (undefined column)

### **Solution:**
```bash
# 1. Create missing performance review tables
docker cp create_performance_review_tables.sql kafu-postgres:/tmp/
docker-compose exec postgres psql -U kafu_user -d kafu_system -f /tmp/create_performance_review_tables.sql

# 2. Fix assessors route to remove non-existent column
# In backend/routes/assessors.js, remove:
# ac.is_active,
# from the SELECT query

# 3. Copy updated code to container
docker cp backend/routes/assessors.js kafu-backend:/app/routes/assessors.js

# 4. Restart backend
docker-compose restart backend

# 5. Test both pages
curl -s "http://localhost:5001/api/assessors" | jq '.success'
curl -s "http://localhost:5001/api/assessments" | jq '.success'
```

### **Prevention:**
- Always test all related pages after making database changes
- Check for missing tables when restoring from backups
- Remove references to non-existent columns in SQL queries
- Verify all API endpoints work after fixes

### **Verification:**
```bash
# Test Assessor Management
curl -s "http://localhost:5001/api/assessors" | jq '.success'
# Should return: true

# Test Assessment Creation
curl -X POST "http://localhost:5001/api/assessments" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "competencyId": null, "competencyLevelId": "VALID_ID", "createdBy": "admin"}'
# Should return: {"success":true,"assessment":{...}}

# Test in frontend:
# 1. Go to Assessor Management page - should load without errors
# 2. Go to Assessments page - should still work correctly
# 3. Both pages should function independently
```

---

## 🔧 **Assessments Page "Failed to load assessments" Error Fix**

### **Problem:** 
Assessments page shows "Failed to load assessments" error and displays no data

### **Root Cause:** 
1. Assessments table is empty - no assessment data exists in database
2. Backend API queries reference non-existent database columns (snake_case vs camelCase mismatch)

### **Symptoms:**
- Assessments page shows "Failed to load assessments" error
- Backend logs show: `column a.numberOfQuestions does not exist`
- API returns: `{"success": false, "error": "Failed to fetch assessments"}`
- Database assessments table is empty: `SELECT COUNT(*) FROM assessments;` returns 0

### **Solution:**
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

### **Why This Happens:**
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

---

## 🔧 **"Failed to create assessment" Error Fix**

### **Problem:** 
"Create New Assessment" page shows "Request failed with status code 500" error when trying to create assessments

### **Root Cause:** 
Database `NOT NULL` constraint on `competencyId` field conflicts with "Apply to All Competencies" feature

### **Symptoms:**
- Frontend shows: "Request failed with status code 500"
- Backend logs show: `Failing row contains (..., null, null, ...)`
- Error code: `23502` (NOT NULL constraint violation)
- Assessment creation fails for both specific competencies and "Apply to All"

### **Solution:**
```bash
# 1. Make competencyId nullable in database
docker exec kafu-postgres-dev psql -U kafu_user -d kafu_system -c "ALTER TABLE assessments ALTER COLUMN \"competencyId\" DROP NOT NULL;"

# 2. Verify constraint was removed
docker exec kafu-postgres-dev psql -U kafu_user -d kafu_system -c "\d assessments" | grep "competencyId"
# Should show: competencyId | text | | | (no "not null")

# 3. Test assessment creation
curl -X POST "http://localhost:5001/api/assessments" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Assessment", "competencyId": null, "timeLimit": 30, "passingScore": 70, "maxAttempts": 3, "createdBy": "admin"}'
# Should return: {"success":true,"assessment":{...}}

# 4. Test with specific competency
curl -X POST "http://localhost:5001/api/assessments" \
  -H "Content-Type: application/json" \
  -d '{"title": "Communication Test", "competencyId": "COMPETENCY_ID", "timeLimit": 25, "passingScore": 75, "maxAttempts": 2, "createdBy": "admin"}'
# Should return: {"success":true,"assessment":{...}}
```

### **Why This Happens:**
- "Apply to All Competencies" feature requires `competencyId` to be `null`
- Database schema had `NOT NULL` constraint on `competencyId` column
- Frontend sends `null` values for competencyId when "Apply to All" is selected
- Database rejects `null` values due to constraint

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
# Should succeed with competencyId: null

# Test specific competency creation
curl -X POST "http://localhost:5001/api/assessments" \
  -H "Content-Type: application/json" \
  -d '{"title": "Specific Assessment", "competencyId": "VALID_COMPETENCY_ID", "createdBy": "admin"}'
# Should succeed with competencyId: "VALID_COMPETENCY_ID"

# Test in frontend:
# 1. Go to Create Assessment page
# 2. Fill in required fields
# 3. Check "Apply to All Competencies" OR select specific competency
# 4. Click "Create Assessment"
# 5. Should succeed without 500 error
```

---

## Assessment Updates Not Saving Fix

**Issue**: Assessment updates not being saved in the frontend.

**Root Cause**: 
- Frontend validation logic was checking for `competencyId` even when "Apply to All Competencies" was selected
- Data format mismatch between frontend and backend (snake_case vs camelCase)

**Solution**:
1. Updated frontend validation to handle `applyToAllCompetencies` checkbox
2. Fixed backend API to return consistent camelCase field names
3. Updated frontend `handleUpdateAssessment` to prepare data correctly

**Files Modified**: 
- `frontend/src/pages/Assessments.js` (validation logic)
- `backend/routes/assessments.js` (API response format)

**Verification**:
```bash
# Test API update
curl -X PUT "http://localhost:5001/api/assessments/{id}" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title", "timeLimit": 60}'

# Should return: {"success":true,"assessment":{...}}

# Test in frontend:
# 1. Go to Assessment Management page
# 2. Edit an existing assessment
# 3. Save changes - should work without errors
# 4. Verify changes are persisted
```

## Job Competency Profiles EditMapping Page Fix

**Issue**: "Edit Profile" button in Job Competency Profiles page not working or showing blank page.

**Root Cause**: 
- Frontend container running old built code despite source code being correct
- EditMapping component exists and is properly implemented, but wasn't deployed

**Symptoms**:
- Clicking "Edit Profile" button navigates to `/edit-mapping/{jobId}` but shows blank page
- Backend API calls are successful (logs show 304 responses)
- No JavaScript errors in browser console
- EditMapping component is properly implemented with all required functionality

**Solution**:
```bash
# 1. Rebuild frontend with latest code
docker-compose build frontend --no-cache

# 2. Restart frontend container
docker-compose up -d frontend

# 3. Verify EditMapping page loads correctly
# Navigate to: http://localhost:3000/edit-mapping/{jobId}
```

**Prevention**:
- Always rebuild frontend container after code changes
- Use `--no-cache` flag to ensure latest code is deployed
- Check container build timestamps when debugging frontend issues

**Verification**:
```bash
# Test EditMapping API endpoint
curl -s "http://localhost:5001/api/job-competencies?jobId={jobId}" | jq '.mappings | length'
# Should return number of competency mappings for the job

# Test in frontend:
# 1. Go to Job Competency Profiles page
# 2. Click "Edit Profile" on any job
# 3. Should navigate to EditMapping page with job details and competencies
# 4. Should be able to edit competency levels and requirements
# 5. Should be able to add/remove competencies
# 6. Should be able to save changes
```

---

## 🧩 Question Bank: CSV Upload Imports 0 Items

### Problem
Upload returns `Successfully uploaded 0 questions` and errors like `Competency not found: <name>` even though the competency exists.

### Root Causes
- Exact string match on competency name (case/whitespace mismatch).
- Level values not normalized to enum values (BASIC/INTERMEDIATE/ADVANCED/MASTERY).

### Fix
- Backend lookup updated to use case-insensitive, trimmed comparison and level normalization:
  - `lower(trim(name)) = lower(trim(<csv_name>))`
  - `competency_level.toUpperCase()` then cast to enum.

### CSV Requirements
- Headers: `text,type,competency_name,competency_level,points,explanation,correct_answer,option_1_text,option_1_is_correct,option_2_text,option_2_is_correct,option_3_text,option_3_is_correct,option_4_text,option_4_is_correct`
- type: `MULTIPLE_CHOICE | TRUE_FALSE | SHORT_ANSWER | ESSAY`
- competency_level: `BASIC | INTERMEDIATE | ADVANCED | MASTERY`
- option_*_is_correct: `true | false`

### Quick Verification
```bash
docker exec kafu-postgres psql -U kafu_user -d kafu_system -c "SELECT id,name FROM competencies WHERE lower(trim(name))=lower(trim('Learning and Development Execution')) LIMIT 1;"
```

---

## 🔁 UI Changes Not Appearing (Stale Frontend Build)

### Symptoms
- Page does not reflect recent edits (e.g., buttons/heading color do not change).

### Root Cause
- Frontend container was serving an outdated cached build layer.

### Solution (Clean Rebuild)
```bash
docker compose build --no-cache frontend && docker compose up -d frontend
```
Then hard refresh browser (Cmd/Ctrl+Shift+R).

### Tip
- Add a canary change (temporary red heading) to confirm the live page is using the latest build; remove after verification.

## PostgreSQL Case-Sensitive Column Names Error

**Issue**: "Failed to confirm user level: Invalid `prisma.$queryRaw()` invocation: Raw query failed. Code: `42703`. Message: `column "competencyid" does not exist`"

**Root Cause**: 
- PostgreSQL column names are case-sensitive when created with quotes (e.g., `"competencyId"`)
- SQL queries using unquoted column names (e.g., `competencyId`) fail because PostgreSQL converts them to lowercase (`competencyid`)
- The database has `"competencyId"` (with quotes) but queries use `competencyId` (without quotes)

**Symptoms**:
- User level confirmation fails with column not found error
- Assessment submission works but level confirmation fails
- Error occurs in `/api/user-assessments/confirm-level` endpoint

**Solution**:
```sql
-- WRONG (causes error):
SELECT user_id, competencyId FROM assessment_sessions WHERE id = ${sessionId}

-- CORRECT (works):
SELECT user_id, "competencyId" FROM assessment_sessions WHERE id = ${sessionId}
```

**Files Modified**: 
- `backend/routes/userAssessments.js` - Fixed all instances of unquoted `competencyId` in SQL queries

**Prevention**:
- Always use double quotes around case-sensitive column names in raw SQL queries
- Check database schema with `\d table_name` to see exact column names
- Use consistent naming convention (camelCase with quotes in SQL)

**Verification**:
```bash
# Test level confirmation
curl -X POST "http://localhost:5001/api/user-assessments/confirm-level" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "session-id", "userConfirmedLevel": "BASIC"}'

# Should return: {"success":true}
```

---

## 🔧 **Assessment System Complete Fix - Start & Submit Assessment Errors**

### **Problem:** 
Assessment system shows "Failed to start assessment" and "Failed to submit assessment" errors

### **Root Cause:** 
Multiple database schema mismatches between camelCase and snake_case column names across different tables

### **Symptoms:**
- Start Assessment API returns "Failed to start assessment"
- Submit Assessment API returns "Failed to submit assessment" 
- Backend logs show column name errors like:
  - `column q.competencyid does not exist`
  - `column qo.is_correct does not exist`
  - `column "updatedAt" of relation "assessment_sessions" does not exist`

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

### **Why This Happens:**
- Different tables use different naming conventions (camelCase vs snake_case)
- PostgreSQL is case-sensitive with quoted column names
- Raw SQL queries must match exact column names from database schema
- Assessment system spans multiple tables with different schemas

### **Prevention:**
- Always check table schema with `\d table_name` before writing SQL queries
- Use consistent quoting for camelCase columns (`"columnName"`)
- Use unquoted names for snake_case columns (`column_name`)
- Test both start and submit assessment flows after any database changes

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
```

### **Files Modified:**
- `backend/routes/userAssessments.js` - Fixed all column name references across start/submit/competencies endpoints

### **Current Working State:**
- **Start Assessment:** ✅ Working - Creates session, loads 10 questions with options
- **Submit Assessment:** ✅ Working - Processes answers, calculates score and competency level
- **Competencies List:** ✅ Working - Shows available competencies for user
- **Complete Assessment Flow:** ✅ Working - End-to-end assessment process functional
