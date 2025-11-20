# Railway Deployment Guide

This guide will help you deploy the KAFU System to Railway using Docker.

## Prerequisites

1. Railway account (sign up at https://railway.app)
2. GitHub account (your code should be pushed to GitHub)
3. Your local Docker setup working

## Step 1: Push Code to GitHub

Make sure all your code is committed and pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

## Step 2: Create Railway Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your KAFU System repository
5. Railway will detect your project

## Step 3: Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will create a PostgreSQL database
4. **Copy the DATABASE_URL** from the database service (you'll need it)

## Step 4: Deploy Backend Service

1. In Railway project, click "+ New" → "GitHub Repo"
2. Select your repository again
3. Railway will detect it's a Node.js project
4. Configure the service:
   - **Root Directory**: `backend`
   - Railway will automatically detect the Dockerfile at `backend/Dockerfile`

5. **Set Environment Variables** (in service Settings → Variables):
   - `DATABASE_URL` → Use the PostgreSQL connection string from Step 3
     - Format: `postgresql://user:password@host:port/database`
   - `JWT_SECRET` → Your JWT secret key (generate a secure random string)
   - `JWT_EXPIRES_IN` → `7d`
   - `NODE_ENV` → `production`
   - `PORT` → Railway sets this automatically, but you can set it to `5000` if needed
   - `CORS_ORIGINS` → Leave empty for now, we'll update after frontend deploys

6. Railway will automatically:
   - Build using `backend/Dockerfile`
   - Run `npm start` (from Dockerfile CMD)
   - Deploy your backend service

## Step 5: Deploy Frontend Service

1. In Railway project, click "+ New" → "GitHub Repo"
2. Select your repository again
3. Configure the service:
   - **Root Directory**: `frontend`
   - Railway will automatically detect the Dockerfile at `frontend/Dockerfile`

4. **Set Environment Variables** (in service Settings → Variables):
   - `REACT_APP_API_URL` → We'll set this after backend deploys
     - Format: `https://your-backend-url.railway.app/api`

5. Railway will automatically:
   - Build using `frontend/Dockerfile`
   - Deploy your frontend service

## Step 6: Get Your URLs and Configure

After both services deploy:

1. **Get Backend URL**: 
   - Go to backend service → "Settings" → "Networking"
   - Click "Generate Domain" if not already generated
   - Copy the URL (e.g., `https://kafu-backend-production.up.railway.app`)

2. **Get Frontend URL**:
   - Go to frontend service → "Settings" → "Networking"
   - Click "Generate Domain" if not already generated
   - Copy the URL (e.g., `https://kafu-frontend-production.up.railway.app`)

## Step 7: Update Environment Variables

1. **Backend Service** → Settings → Variables:
   - Add/Update `CORS_ORIGINS` with your frontend URL
     - Format: `https://your-frontend-url.railway.app`
   - Click "Save" (Railway will auto-redeploy)

2. **Frontend Service** → Settings → Variables:
   - Add/Update `REACT_APP_API_URL` with your backend URL
     - Format: `https://your-backend-url.railway.app/api`
   - Click "Save" (Railway will auto-redeploy)

**Note**: Railway automatically redeploys when you change environment variables. Wait for both services to finish redeploying before testing.

## Step 8: Run Database Migrations

After backend is deployed, you need to run Prisma migrations:

1. Go to backend service → "Deployments" → Click on latest deployment
2. Click "View Logs"
3. Or use Railway CLI:
   ```bash
   railway run --service backend npx prisma db push
   ```

Alternatively, the auto-migration code in `competencies.js` will handle missing columns automatically.

## Step 9: Import Your Data (Optional)

If you have database backups:

1. Use Railway CLI to connect to database:
   ```bash
   railway connect postgres
   ```

2. Or use a PostgreSQL client with the connection string from Railway

3. Import your SQL backup:
   ```bash
   psql $DATABASE_URL < backup_milestone_v4.0.0.sql
   ```

## Step 10: Verify Deployment

1. **Test Backend Health**:
   ```
   https://your-backend-url.railway.app/api/health
   ```

2. **Test Competencies API**:
   ```
   https://your-backend-url.railway.app/api/competencies?page=1&limit=5
   ```

3. **Test Frontend**:
   - Open your frontend URL in browser
   - Should load without errors

## Troubleshooting

### Backend won't start
- Check logs in Railway dashboard
- Verify DATABASE_URL is correct
- Check that Prisma client is generated (should happen in Dockerfile)

### Frontend can't connect to backend
- Verify REACT_APP_API_URL is set correctly
- Check CORS_ORIGINS in backend includes frontend URL
- Check backend logs for CORS errors

### Database connection errors
- Verify DATABASE_URL format is correct
- Check PostgreSQL service is running
- Ensure database is accessible (not paused)

### Auto-migration not working
- Check backend logs for schema check messages
- Verify database permissions allow ALTER TABLE
- Run manual migration if needed

## Railway CLI (Optional)

Install Railway CLI for easier management:

```bash
npm i -g @railway/cli
railway login
railway link
```

Then you can run commands:
```bash
railway logs
railway run npm run db:push
railway connect postgres
```

## Cost

- Railway free tier includes:
  - $5 credit per month
  - 500 hours of usage
  - Perfect for development/testing

- Paid plans start at $5/month for more resources

## Next Steps

1. Set up custom domains (optional)
2. Configure auto-deployments from GitHub
3. Set up monitoring and alerts
4. Configure backups for PostgreSQL

---

**Need Help?**
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

