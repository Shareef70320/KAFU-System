# Fix Competency 500 Error on Render

## Problem
The Competency page shows "Error loading competencies: Request failed with status code 500" on the cloud version (Render).

## Root Cause
The cloud database on Render is missing the `code` and `familyId` columns in the `competencies` table, and possibly the `competency_families` table. These were added in recent updates but weren't migrated to the cloud database.

## Solution

### Option 1: Run SQL Migration Script (Recommended)

1. **Get your Render PostgreSQL connection string:**
   - Go to Render Dashboard → Your PostgreSQL Database → Connect
   - Copy the "Internal Database URL" or "External Database URL"

2. **Run the migration script:**
   ```bash
   # Using psql (if you have it installed)
   psql "<YOUR_RENDER_POSTGRES_URL>" -f backend/scripts/add_competency_fields_cloud.sql
   
   # OR using Docker (if you have the connection string)
   docker run -it --rm postgres:15 psql "<YOUR_RENDER_POSTGRES_URL>" -f /path/to/add_competency_fields_cloud.sql
   ```

3. **Verify the migration:**
   ```bash
   # Test the competencies API
   curl -s "https://kafu-system-2.onrender.com/api/competencies?page=1&limit=5" | jq '.competencies | length'
   # Should return: 5 (or actual number of competencies)
   ```

### Option 2: Manual SQL Execution in Render

1. Go to Render Dashboard → Your PostgreSQL Database → Connect → Open in psql
2. Copy and paste the contents of `backend/scripts/add_competency_fields_cloud.sql`
3. Execute the script
4. Verify by checking the competencies API

### Option 3: Use Render Shell (if available)

1. Go to Render Dashboard → Your Backend Service → Shell
2. Run:
   ```bash
   psql $DATABASE_URL -f backend/scripts/add_competency_fields_cloud.sql
   ```

## What the Script Does

1. Adds `code` column to `competencies` table (if missing)
2. Adds `familyId` column to `competencies` table (if missing)
3. Creates `competency_families` table (if missing)
4. Adds indexes and foreign key constraints
5. Verifies the changes

## Verification

After running the migration, test the API:

```bash
# Test competencies endpoint
curl -s "https://kafu-system-2.onrender.com/api/competencies?page=1&limit=5" | jq '.success'

# Should return competencies without 500 error
curl -s "https://kafu-system-2.onrender.com/api/competencies?page=1&limit=5" | jq '.competencies | length'
```

## Prevention

- Always run database migrations after schema changes
- Keep cloud database schema in sync with local development
- Test API endpoints after deploying schema changes

