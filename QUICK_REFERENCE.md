# Quick Reference - Working State

## Current Working URLs
- **Main App**: http://localhost:3000
- **Job-Competency Mapping**: http://localhost:3000/job-competency-mapping
- **Add Mapping**: http://localhost:3000/add-mapping

## API Endpoints
- **Jobs**: http://localhost:5001/api/jobs (25 items)
- **Competencies**: http://localhost:5001/api/competencies (10 items)
- **Job-Competencies**: http://localhost:5001/api/job-competencies

## Key Commands
```bash
# Start all services
docker-compose up -d

# Rebuild frontend only
docker-compose build frontend
docker-compose up -d frontend

# Check API health
curl http://localhost:5001/api/jobs | jq '.jobs | length'
curl http://localhost:5001/api/competencies | jq '.competencies | length'
```

## What's Working ✅
1. Job-Competency Mapping page loads and displays all mappings
2. Add Mapping page loads jobs and competencies lists
3. Search and filter functionality works
4. Creating new mappings works
5. All API endpoints responding correctly
6. No blank page issues
7. Proper error handling and loading states

## File Structure
```
frontend/src/pages/
├── JobCompetencyMapping.js  ✅ Working
├── AddMapping.js            ✅ Working
└── ...

frontend/src/components/ui/
├── badge.js                 ✅ Created
└── ...
```

**Status**: All systems operational 🟢
