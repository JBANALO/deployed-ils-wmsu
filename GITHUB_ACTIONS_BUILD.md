# ✅ AUTOMATIC APK BUILD - GitHub Actions Setup

## You're 1 Minute Away From Automated Builds!

Your GitHub Actions workflow is **already set up** on your repo.  
All you need to do: **Add 1 secret to GitHub**

---

## 🔑 Add EAS Token Secret (2 minutes)

### Option 1: Via Web (Easiest)

1. Go to: https://github.com/JBANALO/deployed-ils-wmsu/settings/secrets/actions

2. Click **"New repository secret"**

3. Fill in:
   - **Name:** `EAS_TOKEN`
   - **Value:** `8jyzuk4-E61g2Gn_eCri42zRUm2jHxqg67oTN_i8`

4. Click **"Add secret"**

✅ **Done!** GitHub Actions can now build your APK.

---

## 🚀 Trigger Build (Choose ONE)

### Method A: Automatic (Recommended)
Just push any code change:
```powershell
cd "c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system"
git add .
git commit -m "Trigger APK build"
git push origin main
```

→ Build starts automatically!

### Method B: Manual Click
1. Go to: https://github.com/JBANALO/deployed-ils-wmsu/actions
2. Click **"Build Android APK"** workflow
3. Click **"Run workflow"** → **"Run workflow"** button
4. Build starts immediately!

---

## ⏳ Build Progress

1. Go to: https://github.com/JBANALO/deployed-ils-wmsu/actions
2. Click the running build
3. Watch the progress:
   - 📥 Checkout
   - 📦 Setup Node.js
   - 📚 Install dependencies
   - 🏗️ Build APK (~40-60 min)
   - 📁 Upload artifact

---

## 📥 Download APK

Once build completes (green ✅):

1. Click the build
2. Scroll to bottom → **"Artifacts"**
3. Download **`wmsu-elemscan-apk.zip`**
4. Extract and get `.apk` file
5. Transfer to Android device
6. Install! (Settings → Security → Allow unknown sources)

---

## 🔄 Automatic Builds On Every Push

After setting the secret, **every push to main** automatically triggers a build!

- Push code → Build starts → APK ready in ~1 hour
- No manual steps needed after this setup
- Email notifications (optional)

---

## 📊 Timeline

- Secret setup: **2 minutes**
- First build: **40-60 minutes**
- **Total: ~1 hour** until APK ready
- Days until March 1: **6+ days** ✅

---

## Troubleshooting

**"Build failed"**
- Check workflow logs at https://github.com/JBANALO/deployed-ils-wmsu/actions
- Common issue: Wrong EAS_TOKEN
- Fix: Verify token in Settings → Secrets

**"Secret not found"**
- Make sure secret name is exactly: `EAS_TOKEN`
- Case-sensitive!
- Refresh page and try again

**"Still no APK after 1 hour"**
- Check Actions tab for error logs
- Or contact support

---

## ✨ That's It!

GitHub Actions is now your automated APK builder.  
Set the secret, push code, download APK. Simple!

---
