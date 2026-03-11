// API Base URL - change this when deploying
const API_BASE_URL = window.location.origin + '/api';

// function formatCurrency(amount) { removed }

// Utility function to format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Utility function to calculate nights
function calculateNights(checkIn, checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = end - start;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Utility function to render stars
function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';

    for (let i = 0; i < fullStars; i++) {
        stars += '⭐';
    }
    if (hasHalfStar) {
        stars += '⭐';
    }

    return stars;
}

// API Functions
async function fetchFeaturedHotels() {
    try {
        const response = await fetch(`${API_BASE_URL}/hotels/featured/top`);
        if (!response.ok) throw new Error('Failed to fetch hotels');
        return await response.json();
    } catch (error) {
        console.error('Error fetching featured hotels:', error);
        return [];
    }
}

async function fetchAllHotels(filters = {}) {
    try {
        const params = new URLSearchParams();
        if (filters.city) params.append('city', filters.city);
        if (filters.search) params.append('search', filters.search);
        if (filters.minRating) params.append('minRating', filters.minRating);
        if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);

        const response = await fetch(`${API_BASE_URL}/hotels?${params}`);
        if (!response.ok) throw new Error('Failed to fetch hotels');
        return await response.json();
    } catch (error) {
        console.error('Error fetching hotels:', error);
        return [];
    }
}

async function fetchHotelById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/hotels/${id}`);
        if (!response.ok) throw new Error('Failed to fetch hotel');
        return await response.json();
    } catch (error) {
        console.error('Error fetching hotel:', error);
        return null;
    }
}

async function fetchRoomsByHotel(hotelId) {
    try {
        const response = await fetch(`${API_BASE_URL}/rooms?hotelId=${hotelId}`);
        if (!response.ok) throw new Error('Failed to fetch rooms');
        return await response.json();
    } catch (error) {
        console.error('Error fetching rooms:', error);
        return [];
    }
}

async function checkRoomAvailability(roomId, checkIn, checkOut, numRooms) {
    try {
        const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/check-availability`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ checkIn, checkOut, numRooms })
        });
        if (!response.ok) throw new Error('Failed to check availability');
        return await response.json();
    } catch (error) {
        console.error('Error checking availability:', error);
        return { available: false };
    }
}

async function createBooking(bookingData) {
    try {
        const response = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });
        if (!response.ok) throw new Error('Failed to create booking');
        return await response.json();
    } catch (error) {
        console.error('Error creating booking:', error);
        throw error;
    }
}

async function fetchBookingByReference(reference) {
    try {
        const response = await fetch(`${API_BASE_URL}/bookings/reference/${reference}`);
        if (!response.ok) throw new Error('Failed to fetch booking');
        return await response.json();
    } catch (error) {
        console.error('Error fetching booking:', error);
        return null;
    }
}

async function fetchAllBookings(filters = {}) {
    try {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.email) params.append('email', filters.email);

        const response = await fetch(`${API_BASE_URL}/bookings?${params}`);
        if (!response.ok) throw new Error('Failed to fetch bookings');
        return await response.json();
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return [];
    }
}

async function updateBookingStatus(bookingId, status) {
    try {
        const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        if (!response.ok) throw new Error('Failed to update booking');
        return await response.json();
    } catch (error) {
        console.error('Error updating booking:', error);
        throw error;
    }
}

// Render Functions
function renderHotelCard(hotel) {
    const amenitiesHtml = hotel.amenities && hotel.amenities.length > 0
        ? hotel.amenities.slice(0, 3).map(a => `<span class="amenity-tag">${a}</span>`).join('')
        : '';

    return `
        <div class="card">
            <div class="card-image-wrapper">
                <img src="${hotel.main_image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'}" 
                     alt="${hotel.name}" 
                     class="card-image">
                ${hotel.star_rating ? `<div class="card-badge">${'⭐'.repeat(hotel.star_rating)}</div>` : ''}
            </div>
            <div class="card-content">
                <h3 class="card-title">${hotel.name}</h3>
                <p class="card-subtitle">📍 ${hotel.city}, ${hotel.country}</p>
                <p class="card-description">${hotel.description ? hotel.description.substring(0, 100) + '...' : ''}</p>
                
                <div class="amenities">
                    ${amenitiesHtml}
                </div>
                
                <div class="card-footer">
                    <div>
                        <div class="rating">
                            <span class="rating-stars">${renderStars(hotel.rating)}</span>
                            <span class="rating-value">${hotel.rating}</span>
                        </div>
                    </div>
                    <button class="btn btn-secondary btn-view-hotel" data-id="${hotel.id}">${t('view_details')}</button>
                </div>
            </div>
        </div>
    `;
}

function renderRoomCard(room, hotelId) {
    const amenitiesHtml = room.amenities && room.amenities.length > 0
        ? room.amenities.slice(0, 4).map(a => `<span class="amenity-tag">${a}</span>`).join('')
        : '';

    return `
        <div class="card">
            <div class="card-image-wrapper">
                <img src="${room.main_image || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800'}" 
                     alt="${room.room_type}" 
                     class="card-image">
            </div>
            <div class="card-content">
                <h3 class="card-title">${room.room_type}</h3>
                <p class="card-subtitle">🛏️ ${room.bed_type} | 👥 ${t('max_occupancy', { count: room.max_occupancy || 0 })}</p>
                <p class="card-description">${room.description || ''}</p>
                
                <div class="amenities">
                    ${amenitiesHtml}
                </div>
                
                <div class="card-footer">
                    <button class="btn btn-secondary btn-book-room" data-id="${room.id}" data-hotel-id="${hotelId}">${t('book_now')}</button>
                </div>
            </div>
        </div>
    `;
}

// Page-specific functions
async function loadFeaturedHotels() {
    const container = document.getElementById('featuredHotels');
    if (!container) return;

    const hotels = await fetchFeaturedHotels();

    if (hotels.length === 0) {
        container.innerHTML = `<p class="text-center">${t('no_hotels_match')}</p>`;
        return;
    }

    container.innerHTML = hotels.map(hotel => renderHotelCard(hotel)).join('');
}

function viewHotelDetails(hotelId) {
    window.location.href = `/hotel-details.html?id=${hotelId}`;
}

function bookRoom(roomId, hotelId) {
    // Store room and hotel IDs
    sessionStorage.setItem('selectedRoom', roomId);
    sessionStorage.setItem('selectedHotel', hotelId);
    window.location.href = '/booking.html';
}

// Export functions for use in HTML
window.loadFeaturedHotels = loadFeaturedHotels;
window.viewHotelDetails = viewHotelDetails;
window.bookRoom = bookRoom;
// window.formatCurrency removed
window.formatDate = formatDate;
window.calculateNights = calculateNights;
window.renderStars = renderStars;
window.fetchAllHotels = fetchAllHotels;
window.fetchHotelById = fetchHotelById;
window.fetchRoomsByHotel = fetchRoomsByHotel;
window.checkRoomAvailability = checkRoomAvailability;
window.createBooking = createBooking;
window.fetchBookingByReference = fetchBookingByReference;
window.fetchAllBookings = fetchAllBookings;
window.updateBookingStatus = updateBookingStatus;

document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('btn-view-hotel')) {
            viewHotelDetails(target.getAttribute('data-id'));
        }
        if (target.classList.contains('btn-book-room')) {
            bookRoom(target.getAttribute('data-id'), target.getAttribute('data-hotel-id'));
        }
    });
});
