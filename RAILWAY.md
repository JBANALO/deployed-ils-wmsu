# 🚀 Railway Deployment

This project is configured for one-click deployment to Railway.

## Quick Links

📖 **Getting Started**
- [Deployment Configuration Summary](DEPLOYMENT_CONFIG_SUMMARY.md) - Overview of all deployment files
- [Quick Start Guide](RAILWAY_QUICK_START.md) - 6-step deployment checklist  
- [Complete Deployment Guide](RAILWAY_DEPLOYMENT.md) - Comprehensive step-by-step guide

## 🎯 What You Need

1. **Railway Account** - Free tier available at https://railway.app
2. **GitHub Account** - Repository already configured at https://github.com/JBANALO/ILS-WMSU
3. **5 minutes** - Time needed to deploy

## ⚡ Deploy in 3 Steps

### 1. Create Railway Project
```
Visit https://railway.app/dashboard
→ New Project
→ Deploy from GitHub repo
→ Select "JBANALO/ILS-WMSU"
```

### 2. Add MySQL Database
```
Click "Add Service"
→ Select "MySQL"
→ Railway creates it automatically
```

### 3. Set Environment Variables
```
Copy credentials from MySQL service
Add to project variables:
  NODE_ENV=production
  PORT=8080
  DB_HOST, DB_USER, DB_PASSWORD, DB_NAME (from MySQL)
  VITE_API_URL=https://<your-railway-domain>.up.railway.app/api
  JWT_SECRET=<generate-random-key>
```

Then click **Deploy** - Done! ✅

## 📁 Deployment Files

```
Root Directory
├── Procfile                          # Railway start command
├── railway.json                      # Railway configuration manifest
├── .env.example                      # Development environment template
├── .env.production                   # Production environment template
├── setup.sh                          # Linux/macOS setup script
├── setup.bat                         # Windows setup script
├── package.json                      # Updated with start:prod script
├── DEPLOYMENT_CONFIG_SUMMARY.md      # This configuration explained
├── RAILWAY_QUICK_START.md           # Quick reference
└── RAILWAY_DEPLOYMENT.md            # Complete guide

Frontend Configuration
└── src/api/axiosConfig.js            # Updated to use VITE_API_URL

Backend Configuration
└── server/server.js                  # Uses PORT from environment
```

## 🔧 Environment Variables

| Variable | Value | Example |
|----------|-------|---------|
| `NODE_ENV` | `production` | - |
| `PORT` | `8080` | (Railway requires this) |
| `DB_HOST` | MySQL host | `mysql.railway.internal` |
| `DB_USER` | MySQL user | `root` |
| `DB_PASSWORD` | MySQL password | `secure-password` |
| `DB_NAME` | `wmsu_ed` | - |
| `DB_PORT` | `3306` | - |
| `VITE_API_URL` | Your Railway domain | `https://app.railway.app/api` |
| `JWT_SECRET` | Random secret key | `change-this-to-random-key` |

## 📊 Architecture

```
GitHub (JBANALO/ILS-WMSU)
    ↓ (Auto push via Procfile)
Railway
    ├─ Node.js Backend (Express) 
    ├─ React Frontend (Vite)
    └─ MySQL Database
```

## ✅ Deployment Checklist

After Railway shows "ACTIVE":

- [ ] Visit https://<your-domain>.up.railway.app/ 
- [ ] See WMSU Portal login page
- [ ] Login with admin credentials
- [ ] Test grades management
- [ ] Export report card to PDF
- [ ] Check attendance tracking
- [ ] Update mobile app API URL

## 📚 Documentation

Full documentation available in these files:

1. **DEPLOYMENT_CONFIG_SUMMARY.md** - Overview of all files and configuration
2. **RAILWAY_QUICK_START.md** - Quick reference checklist
3. **RAILWAY_DEPLOYMENT.md** - Complete step-by-step guide with troubleshooting

## 🆘 Quick Troubleshooting

**Build Failed?**
- Check Node.js version (v16+)
- Verify Procfile syntax

**Database Connection Failed?**
- Verify DB_* variables are correct
- Ensure MySQL service is running

**API 404 Error?**
- Check VITE_API_URL is set correctly
- Verify backend is running (check logs)

**Frontend Not Loading?**
- Clear browser cache
- Check Vite build logs
- Verify VITE_API_URL is accessible

See [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) for complete troubleshooting.

## 🎉 You're Ready!

Everything is configured for seamless Railway deployment.

**Next Step:** Open [RAILWAY_QUICK_START.md](RAILWAY_QUICK_START.md) and follow the 6-step deployment checklist.

---

**Status:** ✅ Ready for Production  
**Last Updated:** December 2024  
**Support:** See [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) for complete guide
