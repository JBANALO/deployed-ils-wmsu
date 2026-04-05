# Google OAuth Deployment Guide

This guide provides step-by-step instructions for deploying the WMSU ILS Portal with Google OAuth authentication to Railway (backend) and Vercel (frontend).

## Prerequisites

- Google OAuth Client ID & Secret (already configured)
- Railway account with MySQL database
- Vercel account
- Git repository

## Google OAuth Credentials

Already created and configured:
- **Client ID**: `545992268289-4fp8qedhktkyccfhfdedkjpn2pc6.apps.googleusercontent.com`
- **Client Secret**: `GODSPX-ocCxUDJ1DzW6w0fndAqj5XKUcWll`

## Authorized Redirect URIs (Already Configured in Google Console)

```
http://localhost:5000/api/auth/google/callback
http://localhost:3000/api/auth/google/callback
https://deployed-ils-wmsu-production.up.railway.app/api/auth/google/callback
https://deployed-ils-wmsu.vercel.app
```

---

## Part 1: Deploy Backend to Railway

### Step 1.1: Configure Railway Environment Variables

In your Railway project, set the following environment variables:

```
DATABASE_URL=mysql://root:YOUR_PASSWORD@metro.proxy.rlwy.net:PORT/railway
GOOGLE_CLIENT_ID=545992268289-4fp8qedhktkyccfhfdedkjpn2pc6.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GODSPX-ocCxUDJ1DzW6w0fndAqj5XKUcWll
SESSION_SECRET=your-session-secret-key-change-this
FRONTEND_URL=https://deployed-ils-wmsu.vercel.app
JWT_SECRET=wmsu-portal-secret-key-2023
NODE_ENV=production
PORT=8080
```

### Step 1.2: Push Backend to Railway

```bash
# From project root
git add server/
git commit -m "Add Google OAuth backend implementation"
git push  # This will trigger Railway deployment
```

### Step 1.3: Verify Backend Deployment

Once deployed, verify that the backend is running:
- Visit: `https://your-railway-domain.up.railway.app/api`
- Should return: `{"message": "WMSU Portal API is running", "status": "OK"}`

---

## Part 2: Deploy Frontend to Vercel

### Step 2.1: Configure Vercel Environment Variables

In your Vercel project settings, set:

```
VITE_API_URL=https://deployed-ils-wmsu-production.up.railway.app/api
VITE_GOOGLE_CLIENT_ID=545992268289-4fp8qedhktkyccfhfdedkjpn2pc6.apps.googleusercontent.com
```

### Step 2.2: Update Frontend Code

The frontend is already configured. The LoginPage component includes the Google Sign-in button.

### Step 2.3: Push Frontend to Vercel

```bash
# From project root
git add src/ App.jsx
git commit -m "Add Google OAuth frontend implementation"
git push  # This will trigger Vercel deployment
```

### Step 2.4: Verify Frontend Deployment

Once deployed:
1. Visit your Vercel deployment URL
2. Navigate to the login page
3. You should see:
   - Traditional login form
   - "OR" divider
   - Google Sign-in button

---

## Part 3: Testing Google OAuth (End-to-End)

### Local Testing

1. **Ensure Backend is Running**:
   ```bash
   cd server
   npm install
   npm start
   ```

2. **Ensure Frontend is Running**:
   ```bash
   npm run dev
   ```

3. **Test Google Sign-in**:
   - Go to `http://localhost:5173/login`
   - Click "Sign in with Google"
   - Authenticate with your Google account
   - You should be redirected to your dashboard

### Production Testing

1. Visit your Vercel frontend URL
2. Navigate to login page
3. Click "Sign in with Google"
4. Verify redirect to appropriate dashboard (admin/teacher/student)

---

## Part 4: Database Migration

### Add Google OAuth Columns to Users Table

Run this PHP script on your database to add necessary columns:

```bash
php database/add_google_oauth_columns.php
```

This script adds:
- `googleId` (VARCHAR 255, UNIQUE) - Stores Google's user ID
- `avatar` (LONGTEXT) - Stores Google profile picture URL
- `status` (VARCHAR 50) - User approval status

---

## Part 5: Troubleshooting

### Common Issues

#### "Google sign-in failed"
- Check that Google Client ID and Secret are correctly set in Railway env vars
- Verify that `FRONTEND_URL` in backend .env matches your Vercel URL

#### "Redirect URI mismatch"
- Ensure all authorized redirect URIs are configured in Google Console
- Add the new Vercel domain and Railway domain if you changed them

#### "Database connection failed"
- Verify `DATABASE_URL` is correctly formatted
- Check that your Railway MySQL database is running

#### "User creation fails"
- Ensure database columns are added via `add_google_oauth_columns.php`
- Check database permissions for INSERT operations

---

## Part 6: Monitoring & Maintenance

### Check Logs

**Railway Backend**:
- Go to Railway dashboard
- Select your service
- Check "Logs" tab for any errors

**Vercel Frontend**:
- Go to Vercel dashboard
- Select your project
- Check "Deployments" tab for build logs

### Update Redirect URIs

If you change your deployment URLs:
1. Update in `server/.env` and Railway env vars
2. Add new URLs to Google Console OAuth settings
3. Redeploy frontend and backend

---

## Part 7: Optional Enhancements

### Email Verification (Future)
- Send verification email on first Google sign-up
- Require email confirmation before full access

### Link Google Account
- Allow existing users to link their Google account
- Enable password-less login for linked accounts

### Admin Dashboard Stats
- Track how many users signed in with Google vs. traditional login
- Monitor conversion metrics

---

## Useful Links

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Railway Deployment](https://railway.app/docs)
- [Vercel Deployment](https://vercel.com/docs)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Railway and Vercel logs
3. Verify Google Console settings
4. Check that all environment variables are set correctly
