-- Add status column to users table for account approval system
-- This allows admin to approve new accounts before users can log in

ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `status` VARCHAR(20) DEFAULT 'pending';

-- Update existing admin users to 'approved' status
UPDATE `users` SET `status` = 'approved' WHERE `role` = 'admin' AND `status` IS NULL;

-- Create index for faster approval queries
CREATE INDEX IF NOT EXISTS idx_user_status ON `users` (`status`);
