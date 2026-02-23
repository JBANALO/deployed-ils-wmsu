# LOCAL APK BUILD - INSTALLATION GUIDE

## Step 1: Install Java JDK 17
**Duration:** ~5 minutes

1. Go to: https://adoptium.net/temurin/releases/
2. Select:
   - **Version:** 17 (LTS)
   - **Operating System:** Windows
   - **Architecture:** x64
   - **Package Type:** JDK (msi installer)
3. Click **Download**
4. Run the installer
5. Follow wizard (default options are fine)
6. After install, **restart your computer** OR restart VS Code terminal

**Verify it works:**
```powershell
java -version
```
Should show: `openjdk version "17.x.x"`

---

## Step 2: Install Android Studio
**Duration:** ~10 minutes download + 10 min install

1. Go to: https://developer.android.com/studio
2. Click **Download Android Studio**
3. Accept terms and download (≈1GB file)
4. Run installer
5. Choose "Standard" installation (not custom)
6. Accept all defaults for Android SDK components
7. Install to default location

**Important:** Let it finish installing SDK components (takes several minutes)

---

## Step 3: Set Environment Variables
**Duration:** ~2 minutes

After installing, Windows should auto-set these. **Verify:**

1. Right-click Start menu → "System"
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Check if these exist (if not, add them):
   - `JAVA_HOME` = `C:\Program Files\Eclipse Adoptium\jdk-17.0.x`
   - `ANDROID_HOME` = `C:\Users\[YourUsername]\AppData\Local\Android\Sdk`

---

## Step 4: Run Local APK Build
**Duration:** ~30-40 minutes (first time takes longer due to gradle setup)

Once Java and Android Studio are installed:

```powershell
cd "c:\Users\Josie O. Banalo\Desktop\myfiles\SE\software-engineering-system\MyNewApp"
eas build --platform android --local
```

**What happens:**
- Gradle downloads build tools (big files, ~500MB)
- Compiles React Native → APK
- Stores APK locally in `MyNewApp/` folder
- Completely **FREE** and **no limits**

**Output:**
- APK file ready in: `./dist/` or `./build/` folder
- Can transfer directly to Android device
- No need to wait for EAS cloud

---

## Troubleshooting

**"java: command not found"**
- Java not installed or PATH not set
- Restart terminal/VS Code after install
- Or manually add to PATH: `C:\Program Files\Eclipse Adoptium\jdk-17.0.x\bin`

**"Android SDK not found"**
- Android Studio install incomplete
- Rerun Android Studio and let SDK install finish
- Check: `%LOCALAPPDATA%\Android\Sdk` exists

**"Gradle download failed"**
- Network issue
- Run again (gradle caches files)
- Or download offline if needed

---

## Timeline
- Java install: 5 min
- Android Studio: 20-30 min
- First local build: 30-40 min
- **Total: ~1 hour** for first build
- **Subsequent builds: 10-15 minutes**

---

## Once APK is Ready

1. **Transfer to device:**
   - USB cable or AirDrop
   - Or email to yourself

2. **Install on Android:**
   - Settings → Security → Allow unknown sources
   - Open APK file
   - Tap Install

3. **Test:**
   - Account: Hz202305178@wmsu.edu.ph
   - Password: test123
   - Verify classes load correctly

---

**You have plenty of time - deadline is March 1 (still 6+ days away)** ✅

