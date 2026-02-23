# CodeMagic CI/CD Setup for APK Building

## What is CodeMagic?
- **Free tier** for open-source projects (or free builds per month)
- **Automated CI/CD** - builds trigger automatically on GitHub push
- **No interactive prompts** - runs completely automated
- **Faster than manual builds** - optimized CI/CD infrastructure
- **Email notifications** when build completes

---

## Setup Steps (5 minutes)

### 1. Go to CodeMagic
Visit: https://codemagic.io

### 2. Sign Up / Log In with GitHub
- Click "Sign up with GitHub"
- Authorize CodeMagic to access your GitHub repos
- Select: `JBANALO/deployed-ils-wmsu`

### 3. Connect GitHub Repo
- CodeMagic should detect your repo automatically
- Click "Start your first build"
- It will see the `codemagic.yaml` file we just pushed ✅

### 4. Configure Environment (Optional)
If CodeMagic asks for:
- **Node version**: Select `18.x` or `20.x`
- **Java version**: Select `17`
- **Build type**: Android

### 5. Start Build
Click **"Build"** button
- Workflow name shows: `WMSU ElemScan Android APK`
- Status: Building...
- Wait 40-60 minutes for completion

### 6. Download APK
Once complete:
- Click build → Download APK
- Transfer to Android device
- Install with Settings → Security → Allow unknown sources

---

## What CodeMagic Does

When you push to GitHub:
1. CodeMagic detects the push automatically
2. Reads `codemagic.yaml` configuration
3. Installs dependencies
4. Runs `eas build` OR local build
5. Compiles APK
6. Sends email with download link
7. APK ready to download

**No manual steps needed after setup!**

---

## Alternative: Trigger Manual Build

If you want to build immediately without waiting for push:

1. Go to CodeMagic dashboard
2. Select the workflow: `WMSU ElemScan Android APK`
3. Click **"New build"** → **"Build"**
4. Select branch: `main`
5. Click **"Start building"**

---

## Timeline
- Setup: 5 min
- First build: 40-60 min
- Subsequent builds: 40-60 min (cached dependencies = faster)

---

## Backup: If CodeMagic has issues

We still have these options:
1. **Local build** - Install Java + Android Studio (1.5 hours one-time)
2. **EAS web dashboard** - Manual build (20-30 min, but limited free quota)
3. **GitHub Actions** - Alternative CI/CD (setup 10 min, build 40-60 min)

---

## Status Check

Once set up, you can:
- Monitor builds in CodeMagic dashboard: https://codemagic.io/apps
- Get email notifications when done
- Download APK directly from dashboard

**Your deadline: March 1, 2026 (6+ days away)** ✅

---
