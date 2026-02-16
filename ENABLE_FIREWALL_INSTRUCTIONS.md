# QUICK SETUP - ENABLE PORT 3001

## STEP 1: Run the Firewall Script

Double-click this file and click "Yes" when asked for admin permission:
👉 **enable_firewall.bat**

## STEP 2: Verify It Worked

Open Command Prompt and run:
```
netsh advfirewall firewall show rule name="Node Backend 3001"
```

You should see the rule is enabled.

## STEP 3: Test Your Phone Connection

1. **Make sure phone is on SAME WiFi** as your PC
2. **Open phone browser** and go to: `http://192.168.1.169:3001`
3. You should see: `{"message":"Student Management API Running!"}`
4. **Try login** in the mobile app:
   - Email: `hz202305178@wmsu.edu.ph`  
   - Password: `test123`

---

## ⚠️ If Script Doesn't Work

**Try this method instead:**

1. Press `Win + R` and type: `wf.msc`
2. Click "Inbound Rules" on the left
3. Click "New Rule..." on the right
4. Select **Port** → Next
5. Select **TCP** → Port: **3001** → Next
6. Select **Allow the connection** → Next
7. Leave all checked → Next
8. Name: `Node Backend 3001` → Finish

---

## Backend Status ✅
- Running on: **192.168.1.169:3001**
- Auth Working: **YES**
- DB: **Fallback mode (ready)**

Try your phone now!
