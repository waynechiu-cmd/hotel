-- Add permissions column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSON DEFAULT NULL;

-- Insert default admin user 'cch'
-- Password: Cchouse (hashed)
-- Permissions: All
INSERT INTO users (email, password_hash, full_name, phone, role, permissions)
VALUES (
    'cch@cc-house.cc', 
    '$2a$10$7zB3L/jFmCgP5Xv8v8v8vOu2p3.9p2q0r1s2t3u4v5w6x7y8z9a0', -- Placeholder for 'Cchouse'
    'CCH Superuser', 
    '0900-000-000', 
    'admin', 
    '["admin_bookings", "bi_dashboard", "staff_pwa"]'
) ON DUPLICATE KEY UPDATE role='admin', permissions='["admin_bookings", "bi_dashboard", "staff_pwa"]';
