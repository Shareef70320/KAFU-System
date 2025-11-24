# Connect Vercel Frontend to Railway Backend

## Step 1: Get Your Railway Backend URL

1. Go to Railway Dashboard → Your Backend Service
2. Click on "Settings" → "Networking"
3. Click "Generate Domain" if not already generated
4. **Copy the Railway backend URL** (e.g., `https://kafu-backend-production.up.railway.app`)

## Step 2: Configure CORS on Railway Backend

1. Go to Railway Dashboard → Backend Service → Settings → Variables
2. Add/Update environment variable:
   ```
   CORS_ORIGINS = https://your-vercel-app.vercel.app
   ```
   (Replace with your actual Vercel frontend URL)

3. If you have multiple Vercel preview URLs, you can add multiple origins separated by commas:
   ```
   CORS_ORIGINS = https://your-vercel-app.vercel.app,https://your-vercel-app-git-main.vercel.app
   ```

4. Railway will automatically redeploy after saving

## Step 3: Configure Vercel Environment Variable

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add a new environment variable:
   - **Name**: `REACT_APP_API_BASE`
   - **Value**: `https://your-railway-backend-url.railway.app/api`
     - Example: `https://kafu-backend-production.up.railway.app/api`
   - **Environment**: Select all (Production, Preview, Development)
3. Click "Save"

## Step 4: Redeploy Vercel

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment → "Redeploy"
3. Or push a new commit to trigger auto-deployment

## Step 5: Verify Connection

1. Open your Vercel frontend URL in browser
2. Open browser DevTools (F12) → Network tab
3. Navigate to a page that loads data (e.g., Competencies page)
4. Check that API calls are going to your Railway backend URL
5. Verify no CORS errors in console

## Troubleshooting

### CORS Errors
- **Symptom**: Browser console shows "CORS policy" errors
- **Fix**: 
  - Verify `CORS_ORIGINS` in Railway includes your Vercel URL
  - Check backend logs in Railway for CORS errors
  - Make sure Vercel URL matches exactly (including `https://`)

### API Calls Failing
- **Symptom**: Network tab shows failed requests to Railway
- **Fix**:
  - Verify `REACT_APP_API_BASE` is set correctly in Vercel
  - Check Railway backend is running (check logs)
  - Verify Railway backend URL is accessible: `https://your-backend.railway.app/api/health`

### Environment Variable Not Working
- **Symptom**: Frontend still calls old Render backend
- **Fix**:
  - Vercel environment variables require redeployment to take effect
  - Make sure you selected all environments (Production, Preview, Development)
  - Clear browser cache and hard refresh (Ctrl+Shift+R)

## Quick Checklist

- [ ] Railway backend URL copied
- [ ] `CORS_ORIGINS` set in Railway with Vercel URL
- [ ] `REACT_APP_API_BASE` set in Vercel with Railway backend URL
- [ ] Vercel redeployed after environment variable change
- [ ] Tested API calls in browser DevTools
- [ ] No CORS errors in console

## Example Configuration

**Railway Backend Environment Variables:**
```
DATABASE_URL = postgresql://...
JWT_SECRET = your-secret
CORS_ORIGINS = https://kafu-system.vercel.app
NODE_ENV = production
```

**Vercel Environment Variables:**
```
REACT_APP_API_BASE = https://kafu-backend-production.up.railway.app/api
```

---

**Note**: After setting environment variables, both Railway and Vercel will automatically redeploy. Wait for deployments to complete before testing.

