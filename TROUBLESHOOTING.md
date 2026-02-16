# 🚨 MOBILE APP CONNECTION TROUBLESHOOTING

## Check These Things First:

### 1️⃣ **Is Your Phone on the Same WiFi?**
- Go to Settings → WiFi on your phone
- Make sure you're connected to the **SAME network** as your PC
- NOT a different WiFi, hotspot, or mobile data

### 2️⃣ **Can You Access the Backend from Your Phone?**
1. Open **Google Chrome** on your phone
2. Go to: `http://192.168.1.169:3001`
3. You should see: `{"message":"Student Management API Running!"}`

   **If you see this:** ✅ Connection works, problem is in the app
   **If you see "can't reach":** ❌ Firewall is blocking it OR wrong WiFi network

### 3️⃣ **Disable Windows Firewall (If #2 Failed)**
1. Press `Windows Key + S`
2. Type: `Windows Defender Firewall`
3. Click `Turns Windows Defender Firewall on or off`
4. Click `Turn off` for ALL profiles (but NOT Public if on public WiFi)
5. Try phone browser again to test

### 4️⃣ **If Still Not Working - Add Firewall Rule Manually**
1. Press `Windows Key + R`
2. Type: `wf.msc` and press Enter
3. Click **Inbound Rules** (left side)
4. Click **New Rule** (right side)
5. Select: **Port** → Next
6. Select: **TCP**, Port: **3001** → Next
7. **Allow the connection** → Next
8. Check all boxes → Next
9. Name: `Node Port 3001` → Finish
10. Try phone again

### 5️⃣ **Check Your IP is Correct**
```cmd
ipconfig
```
Look for: `IPv4 Address . . . . . . . . . . : 192.168.x.x`

Your IP should be **192.168.1.169** as listed in the app config.

If it's different, I need to rebuild the APK with the correct IP!

---

## What Should Happen

Once firewall is open + same WiFi:

1. Open mobile app
2. Email: `hz202305178@wmsu.edu.ph`
3. Password: `test123`
4. Click **Login**
5. Should say "Login successful"

---

## Current Status
- Backend: ✅ RUNNING (verified)
- Auth: ✅ WORKING (verified)
- Firewall: ❌ BLOCKING (needs to be opened)

Let me know what error shows on your phone!
