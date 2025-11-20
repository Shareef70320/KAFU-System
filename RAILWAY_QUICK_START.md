# Railway Quick Start Guide

## 🚀 Fast Deployment (5 Steps)

### 1. Sign Up & Create Project
- Go to https://railway.app
- Sign up with GitHub
- Click "New Project" → "Deploy from GitHub repo"
- Select your KAFU System repository

### 2. Add PostgreSQL Database
- In project, click "+ New" → "Database" → "Add PostgreSQL"
- **Copy the DATABASE_URL** (you'll need it in step 3)

### 3. Deploy Backend
- Click "+ New" → "GitHub Repo" → Select your repo
- Railway auto-detects `backend/Dockerfile`
- Go to Settings → Variables, add:
  ```
  DATABASE_URL = (paste from step 2)
  JWT_SECRET = (generate a random secure string)
  JWT_EXPIRES_IN = 7d
  NODE_ENV = production
  ```
- Railway auto-deploys

### 4. Deploy Frontend
- Click "+ New" → "GitHub Repo" → Select your repo again
- Railway auto-detects `frontend/Dockerfile`
- Go to Settings → Variables, add:
  ```
  REACT_APP_API_URL = https://your-backend-url.railway.app/api
  ```
  (Get backend URL from backend service → Settings → Networking)

### 5. Connect Frontend to Backend
- Backend service → Settings → Variables:
  ```
  CORS_ORIGINS = https://your-frontend-url.railway.app
  ```
  (Get frontend URL from frontend service → Settings → Networking)

## ✅ Verify

1. **Backend Health**: `https://your-backend-url.railway.app/api/health`
2. **Competencies**: `https://your-backend-url.railway.app/api/competencies?page=1&limit=5`
3. **Frontend**: Open your frontend URL in browser

## 📝 Notes

- Railway auto-detects Dockerfiles
- Services auto-redeploy on code push (if connected to GitHub)
- Free tier: $5 credit/month, 500 hours
- Database auto-migrations run on first API call

## 🔧 Troubleshooting

**Backend won't start?**
- Check logs in Railway dashboard
- Verify DATABASE_URL is correct
- Check environment variables are set

**Frontend can't connect?**
- Verify REACT_APP_API_URL matches backend URL
- Check CORS_ORIGINS includes frontend URL
- Check backend logs for CORS errors

**Database errors?**
- Verify DATABASE_URL format
- Check PostgreSQL service is running
- Auto-migration runs on first API call

---

**Full Guide**: See `RAILWAY_DEPLOYMENT.md` for detailed instructions.

