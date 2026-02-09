# Account Approval System Implementation

## Overview
A complete account approval system has been implemented that requires admin approval before new users can log in. New accounts will have a `pending` status until an administrator reviews and approves them.

## Features Implemented

### 1. Database Changes
- **New Column**: `status` VARCHAR(20) DEFAULT 'pending'
- **Status Values**: 
  - `pending` - Account awaiting admin approval (default for new signups)
  - `approved` - Account approved and can log in
  - `declined` - Account rejected by admin
- **Index**: Added index on `status` column for faster queries

### 2. Backend Changes

#### Sign Up Flow
- All new user registrations now set `status = 'pending'`
- Response includes status information
- Batch signup also sets pending status

#### Login Flow  
- **Pending Status**: User sees message "⏳ Your account is pending admin approval. Please wait up to 24 hours for the administrator to review and approve your account."
- **Declined Status**: User sees message "❌ Your account has been declined. Please contact the administrator for more information."
- **Approved Status**: User can log in normally

#### Admin Endpoints
- `GET /api/users/pending-teachers` - Fetch all pending user accounts
- `POST /api/users/:id/approve` - Approve an account (with optional role update)
- `POST /api/users/:id/decline` - Decline an account

### 3. Frontend Changes

#### Create Account Page
Shows success message:
```
✅ Account created successfully!
Your account is pending admin approval.
Please wait up to 24 hours for the administrator to review and approve your account.
You'll be redirected to login shortly...
```

#### Login Page
Enhanced error messages:
- **Pending accounts**: Shows 24-hour wait message
- **Declined accounts**: Shows rejection message
- **Invalid credentials**: Shows standard invalid message

#### Admin Approvals Page
- Lists all pending user accounts
- Admin can approve accounts (optionally assigning roles)
- Admin can decline accounts with default decline functionality

## Database Migration

### Execute the Migration
Run this SQL on your Railway MySQL database to add the status column:

```sql
-- Add status column to users table for account approval system
ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `status` VARCHAR(20) DEFAULT 'pending';

-- Update existing admin users to 'approved' status
UPDATE `users` SET `status` = 'approved' WHERE `role` = 'admin' AND `status` IS NULL;

-- Create index for faster approval queries
CREATE INDEX IF NOT EXISTS idx_user_status ON `users` (`status`);
```

**File**: `database/add_user_approval_status.sql`

### Steps to Apply
1. Go to Railway Dashboard
2. Click on your MySQL database
3. Go to the "Query" or "SQL Editor" tab
4. Copy the SQL from `database/add_user_approval_status.sql`
5. Execute the migration
6. Verify: Run `SELECT DISTINCT status FROM users;` to confirm column exists

## User Flow

### New User Registration
1. User creates account on `/create-account`
2. Account created with `status = 'pending'`
3. User sees "pending approval" message
4. User redirected to login page
5. If user tries to log in: "Please wait up to 24 hours" message appears

### Admin Approval Process
1. Admin logs in to `/admin/approvals`
2. Admin sees list of pending accounts
3. Admin can:
   - **Approve**: Account gets `status = 'approved'`, user can now log in
   - **Decline**: Account gets `status = 'declined'`, user cannot log in
4. User can try logging in after approval

### Existing Users
- All existing approved users can continue to log in
- Admin users are auto-set to `approved` status if not already set

## Files Modified

### Backend
- `server/controllers/userControllerMySQL.js`
  - Updated `signup()` to set pending status
  - Updated `signupBatch()` to set pending status
  - Updated `getPendingTeachers()` to filter by pending status
  - Enhanced `approveTeacher()` to handle role updates
  - `declineTeacher()` already implemented

- `server/routes/userRoutes.js`
  - Already has approve/decline routes properly configured

- `server/controllers/authControllerMySQL.js`
  - Already checks for pending/declined status in login

### Frontend
- `src/pages/auth/CreateAccount.jsx`
  - Enhanced success message showing 24-hour wait time
  - Improved message styling for multiline support

- `src/pages/auth/LoginPage.jsx`
  - Enhanced error handling for pending/declined statuses
  - Shows user-friendly messages with wait time information
  - Improved styling for multiline error messages

- `src/pages/admin/AdminApprovals.jsx`
  - Already configured to work with pending users system

### Database
- `database/add_user_approval_status.sql` (NEW)
  - Migration script to add status column

## Testing

### Test Case 1: New Account Registration
1. Go to `/create-account`
2. Fill in form with valid WMSU email
3. Submit - Should see "pending approval" message
4. Go to `/login` and try logging in
5. Should see "Please wait up to 24 hours" message

### Test Case 2: Admin Approval
1. Log in as admin
2. Go to `/admin/approvals`
3. Should see pending account(s) in the list
4. Click "Approve" and assign a role
5. The pending user should now be able to log in

### Test Case 3: Admin Decline
1. Go to `/admin/approvals`
2. Click "Decline" on a pending account
3. Try logging in with that account
4. Should see "Your account has been declined" message

## Notes

- Default wait time message shows "24 hours" but can be customized
- Already approved users can log in without changes
- System is case-insensitive for email/username login
- Admin panel can manage approval status of any account type (not just teachers)
- All new accounts created via API will have pending status

## API Response Examples

### Login - Pending Account
```json
{
  "status": "fail",
  "message": "Your account is pending admin approval. Please wait for an administrator to approve your account."
}
```

### Login - Approved Account
```json
{
  "status": "success",
  "token": "eyJhbGc...",
  "data": {
    "user": {
      "id": "...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@wmsu.edu.ph",
      "role": "teacher"
    }
  }
}
```

### Approve User (Admin)
```json
{
  "status": "success",
  "message": "User approved and assigned as subject_teacher"
}
```
