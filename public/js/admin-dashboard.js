async function loadDashboard() {
    const token = sessionStorage.getItem('adminToken') || localStorage.getItem('authToken') || 'dev-admin-token';

    try {
        // 1. Revenue fetch removed

        // 2. Fetch Occupancy
        const occRes = await fetch('/api/analytics/occupancy', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const occupancyData = await occRes.json();
        renderOccupancyChart(occupancyData);

        // 3. Fetch Performance
        const perfRes = await fetch('/api/analytics/performance', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const performanceData = await perfRes.json();
        renderPerformanceChart(performanceData);

        // Set quick stats - Note: revenueData was removed, so this needs to be fixed or removed
        // For now, let's just set a default or remove it if not available
        const totalBookingsEl = document.getElementById('totalBookings');
        if (totalBookingsEl) {
            totalBookingsEl.innerText = occupancyData.reduce((acc, curr) => acc + curr.bookings_count, 0);
        }

    } catch (err) {
        console.error('Failed to load dashboard:', err);
    }
}

function renderOccupancyChart(data) {
    const ctx = document.getElementById('occupancyChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.room_type),
            datasets: [{
                data: data.map(d => d.bookings_count),
                backgroundColor: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444']
            }]
        }
    });
}

function renderPerformanceChart(data) {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.staff_name),
            datasets: [{
                label: '平均處理時數 (小時)',
                data: data.map(d => d.avg_resolution_hours),
                backgroundColor: '#10B981'
            }]
        }
    });
}

document.addEventListener('DOMContentLoaded', loadDashboard);
