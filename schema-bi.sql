-- 1. Revenue by Hotel and Month
CREATE OR REPLACE VIEW view_revenue_analysis AS
SELECT 
    h.name AS hotel_name,
    DATE_FORMAT(b.check_in_date, '%Y-%m') AS month,
    SUM(b.total_price) AS total_revenue,
    COUNT(*) AS total_bookings
FROM bookings b
JOIN hotels h ON b.hotel_id = h.id
WHERE b.status = 'completed'
GROUP BY h.name, month;

-- 2. Room Occupancy Rates (Approximate)
CREATE OR REPLACE VIEW view_occupancy_stats AS
SELECT 
    h.name AS hotel_name,
    r.room_type,
    COUNT(b.id) AS bookings_count,
    AVG(DATEDIFF(b.check_out_date, b.check_in_date)) AS avg_stay_duration
FROM rooms r
JOIN hotels h ON r.hotel_id = h.id
LEFT JOIN bookings b ON r.id = b.room_id AND b.status != 'cancelled'
GROUP BY h.name, r.room_type;

-- 3. Staff Performance (Work Order Resolution Time)
CREATE OR REPLACE VIEW view_staff_performance AS
SELECT 
    u.full_name AS staff_name,
    w.category,
    COUNT(*) AS tasks_completed,
    AVG(TIMESTAMPDIFF(HOUR, w.created_at, w.resolved_at)) AS avg_resolution_hours
FROM work_orders w
JOIN users u ON w.assigned_to = u.id
WHERE w.status = 'resolved'
GROUP BY u.full_name, w.category;
