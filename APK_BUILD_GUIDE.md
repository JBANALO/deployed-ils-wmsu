# WMSU ElemScan APK Build Guide

## Current Status

**Project**: WMSU ElemScan Mobile App (React Native + Expo)
**Status**: ✅ Ready to Build
**Location**: `MyNewApp/` directory
**Updated**: API configuration with production URL support

---

## Build Options

### Option 1: EAS Cloud Build (Recommended)
**Status**: ❌ Currently Limited (Free Plan Used)

**What happened:**
- Attempted to build via Expo's EAS (Expo Application Services)
- Free plan limit reached (~3 builds/month)
- Plan resets: **March 1, 2026** (8 days from now)

**To use after reset:**
```powershell
cd MyNewApp
eas build --platform android --wait
```

**Upgrade for more builds:**
- Visit: https://expo.dev/accounts/jossiebanalo/settings/billing
- Upgrade to paid plan for unlimited builds

---

### Option 2: Local Build with Android SDK
**Status**: ⚠️ Requires Setup

**Prerequisites:**
- Android SDK (not currently installed)
- Java Development Kit (JDK)
- Gradle
- Node.js & Expo CLI (✅ Already have)

**Installation steps:**
1. Download Android Studio from: https://developer.android.com/studio
2. During installation, select:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device
   - Gradle

3. Set environment variables:
   ```powershell
   $env:ANDROID_HOME = "C:\Users\{username}\AppData\Local\Android\Sdk"
   $env:PATH += ";$($env:ANDROID_HOME)\platform-tools;$($env:ANDROID_HOME)\tools"
   ```

4. Then build locally:
   ```powershell
   cd MyNewApp
   eas build --platform android --local
   ```

---

### Option 3: Expo Go Testing (Immediate)
**Status**: ✅ Available Now (No APK)

**How it works:**
- Install "Expo Go" app from Google Play Store
- Connect to same WiFi as development machine
- Run: `npm start` in MyNewApp
- Scan QR code with Expo Go app
- Test app immediately

**Steps:**
1. Start Expo development server:
   ```powershell
   cd MyNewApp
   npm start
   ```

2. On Android phone:
   - Install "Expo Go" app from Play Store
   - Tap "Scan QR code"
   - Scan the QR from terminal
   - App loads instantly

**Limitation**: Not a standalone APK, requires Expo Go app

---

## API Configuration

The mobile app is configured to connect to:
- **Production**: `https://deployed-ils-wmsu-production.up.railway.app/api`
- **Development** (if needed): Update `MyNewApp/src/services/api.js`

```javascript
// For development:
const API_BASE_URL = 'http://192.168.x.x:3001/api'; // Replace with machine IP
```

---

## Recommended Action Plan

### Immediate (Today)
✅ **Test with Expo Go**
1. Run development server
2. Test on phone via Expo Go
3. Verify login and class views work

### Short Term (March 1+)
✅ **Build Production APK**
1. Wait for EAS free plan reset on March 1
2. Run: `eas build --platform android --wait`
3. Download APK from Expo dashboard
4. Distribute to users

### Alternative (If needed sooner)
⚠️ **Local Build**
1. Install Android SDK (~10 GB download)
2. Build locally: `eas build --platform android --local`
3. Deploy APK file

---

## Project Structure

```
MyNewApp/
├── src/
│   ├── services/api.js          ← API configuration (updated)
│   ├── context/
│   │   ├── AuthProvider.js      ← Auth logic (updated)
│   │   └── AttendanceContext.js
│   ├── Screens/                 ← UI screens
│   └── components/
├── app.json                      ← Expo config
├── package.json                  ← Dependencies
├── eas.json                      ← EAS build config
└── build-cloud.log               ← Latest build log
```

---

## Latest Build Attempt

**Date**: February 20, 2026
**Method**: EAS Cloud Build
**Result**: ❌ Failed - Free plan limit reached
**Log**: `MyNewApp/build-cloud.log`

**To view results:**
```powershell
cat MyNewApp/build-cloud.log
```

---

## Download APK When Ready

When the build completes:
1. Go to: https://expo.dev/projects/@jossiebanalo
2. Find the android build
3. Click "Download APK"
4. Share with users or install on test device

---

## Testing Built APK

### Install on Android Device
```powershell
# Connect phone via USB
adb install path/to/app-release.apk

# Or distribute APK file to user
# Users can install: Settings > Security > Install from Unknown Sources
```

### Features in APK
- Teacher login with credentials
- View assigned classes only
- QR code attendance scanning (if hardware supports)
- Sync with backend API

---

## Authentication in App

**Test Account:**
- Email: `Hz202305178@wmsu.edu.ph`
- Password: `test123`

**Login process:**
1. User enters credentials
2. App connects to backend API
3. Backend validates and returns user data
4. App stores in AsyncStorage (device storage)
5. Shows only assigned classes

---

## Production Checklist

- [x] API endpoints configured
- [x] Authentication implemented
- [x] Class filtering logic added
- [x] Multi-platform support verified
- [ ] APK build pending (wait for plan reset)
- [ ] APK testing on real device
- [ ] Google Play Store submission (optional)
- [ ] User distribution ready

---

## File Updates Made

1. `MyNewApp/src/services/api.js` - Added authAPI methods
2. `MyNewApp/src/context/AuthProvider.js` - Updated to use configurable API

---

## Next Steps

1. **Today**: Test with Expo Go
2. **Mar 1+**: Build APK via EAS
3. **Later**: Distribute to users

---

## Support Resources

- **Expo Docs**: https://docs.expo.dev
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **React Native**: https://reactnative.dev

---

**Status**: Project ready for APK build once free plan resets
**Contact**: For build failures or Android issues, check build logs
**Last Updated**: February 20, 2026
