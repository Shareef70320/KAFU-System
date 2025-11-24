# Connect Vercel Frontend to Railway Backend

## Quick Setup (3 Steps)

### Step 1: Get Railway Backend URL

1. Railway Dashboard → Backend Service → Settings → Networking
2. Copy your Railway backend URL (e.g., `https://kafu-backend-production.up.railway.app`)

### Step 2: Set Environment Variable in Vercel

1. Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Click **"Add New"**
3. Fill in:
   - **Key**: `REACT_APP_API_BASE`
   - **Value**: `https://your-railway-backend-url.railway.app/api`
     - Replace `your-railway-backend-url` with your actual Railway URL
   - **Environment**: Select **Production**, **Preview**, and **Development**
4. Click **"Save"**

### Step 3: Redeploy Vercel

1. Vercel Dashboard → Your Project → **Deployments**
2. Click the **"⋯"** menu on latest deployment → **"Redeploy"**
3. Or push a commit to trigger auto-deploy

## Verify It's Working

1. Open your Vercel frontend URL
2. Open browser DevTools (F12) → **Network** tab
3. Navigate to Competencies page
4. Check that API calls go to your Railway backend:
   - Should see: `https://your-railway-backend.railway.app/api/competencies`
   - NOT: `https://kafu-system-2.onrender.com/api/competencies`

## CORS Configuration

**Good News**: Your Railway backend already allows all Vercel domains automatically (see `server.js` line 79-80), so you don't need to configure CORS_ORIGINS unless you want to restrict it.

If you want to be more specific, you can set in Railway:
```
CORS_ORIGINS = https://your-vercel-app.vercel.app
```

## Troubleshooting

**Frontend still calls Render?**
- Vercel environment variables require redeployment
- Make sure you selected all environments (Production, Preview, Development)
- Clear browser cache (Ctrl+Shift+R)

**CORS errors?**
- Backend already allows all `*.vercel.app` domains
- Check Railway backend is running
- Verify Railway backend URL is correct

**API calls failing?**
- Test Railway backend directly: `https://your-backend.railway.app/api/health`
- Check Railway backend logs for errors
- Verify `REACT_APP_API_BASE` value in Vercel matches Railway URL

---

**That's it!** Once you set `REACT_APP_API_BASE` in Vercel and redeploy, your frontend will connect to Railway backend.

