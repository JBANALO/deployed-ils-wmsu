# Running the Account Approval System Migration on Railway

Since the DATABASE_URL password appears to be incorrect, follow these steps:

## Option 1: Get Real Credentials from Railway Dashboard (RECOMMENDED)

### Step 1: Find Your Railway MySQL Credentials
1. Go to [Railway Dashboard](https://railway.app)
2. Click on your Project
3. Click on the **MySQL** service (in the services list)
4. Click the **Variables** tab
5. Look for these variables and copy them:
   - `MYSQLHOST` → Your database host
   - `MYSQLSET_PASSWORD` → Your database password  
   - `MYSQLUSER` → Your database user (usually `root`)
   - `MYSQL_PORT` → Your database port (usually `3306`)
   - `MYSQL_URL` → Full connection URL (copy this!)

### Step 2: Run with Correct Credentials
Use the correct credentials from Railway. For example:

```powershell
$env:DATABASE_URL="mysql://root:YOUR_ACTUAL_PASSWORD@metro.proxy.rlwy.net:25385/railway"
node migrate_account_approval_interactive.cjs
```

Or just run interactively (recommended - it will prompt for password):
```powershell
node migrate_account_approval_interactive.cjs
```

## Option 2: Run SQL Directly in Railway Console

### Step 1: Open Railway MySQL Console
1. Go to Railway Dashboard → Your Project → MySQL service
2. Click the **"Connect"** button or **"Query"** tab
3. You should see a MySQL query editor

### Step 2: Run the Migration SQL

Copy and paste this SQL into the Railway MySQL editor:

```sql
-- Add status column to users table
ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `status` VARCHAR(20) DEFAULT 'pending';

-- Update existing admin users to approved
UPDATE `users` SET `status` = 'approved' WHERE `role` = 'admin' AND `status` IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_status ON `users` (`status`);

-- Verify the changes
SELECT DISTINCT `status` FROM `users` ORDER BY `status`;
```

### Step 3: Verify Success
Run this query to confirm:
```sql
SHOW COLUMNS FROM `users` WHERE Field = 'status';
```

You should see:
- **Field**: status
- **Type**: varchar(20)
- **Default**: pending

## Option 3: Update .env and Run Script

If you have the correct password, update in your terminal:

```powershell
# PowerShell - Set the environment variable
$env:DATABASE_URL="mysql://root:YOUR_ACTUAL_PASSWORD@metro.proxy.rlwy.net:25385/railway"

# Then run the migration
node migrate_account_approval_interactive.cjs
```

## Connection String Format

Your DATABASE_URL should look like:
```
mysql://USERNAME:PASSWORD@HOST:PORT/DATABASE

Example:
mysql://root:mySecurePassword123@metro.proxy.rlwy.net:25385/railway
```

⚠️ The password might contain special characters - you may need to URL-encode them:
- `@` → `%40`
- `:` → `%3A`
- `#` → `%23`
- etc.

## If Still Having Issues

1. **Wrong Host/Port**: Verify you're using the exact host from Railway
2. **Wrong Password**: Copy the exact password from Railway Variables tab
3. **Wrong Database**: The database is usually `railway` by default
4. **Connection Timeout**: Check your internet connection and firewall

## What the Migration Does

✅ Adds `status` column to `users` table  
✅ Sets existing admin accounts to `approved`  
✅ Creates index for faster queries  
✅ Enables account approval system

After running the migration, the system will:
- New signups will have `status = 'pending'`
- Admin must approve accounts at `/admin/approvals`
- Users can't log in until approved
