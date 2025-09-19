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
- **User Assessments:** ✅ Working - 9 competency cards showing, Start Assessment functional
- **Default Assessment:** ✅ Working - 4 questions, 30 minutes, linked to all competencies via `apply_to_all=true`
- **Assessment Filtering:** ✅ Working - Only shows competency cards that have assessments available

**Last Updated:** September 2025 - User Assessments Fixed

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
