// Set minimum dates for check-in and check-out
document.addEventListener('DOMContentLoaded', () => {
    const checkInInput = document.getElementById('checkIn');
    const checkOutInput = document.getElementById('searchForm') ? document.getElementById('checkOut') : null;

    if (checkInInput && checkOutInput) {
        const today = new Date().toISOString().split('T')[0];
        checkInInput.setAttribute('min', today);
        checkOutInput.setAttribute('min', today);

        checkInInput.addEventListener('change', function () {
            const checkInDate = new Date(this.value);
            checkInDate.setDate(checkInDate.getDate() + 1);
            checkOutInput.setAttribute('min', checkInDate.toISOString().split('T')[0]);
        });
    }

    // Handle search form submission
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const destination = document.getElementById('destination').value;
            const checkIn = document.getElementById('checkIn').value;
            const checkOut = document.getElementById('checkOut').value;
            const guests = document.getElementById('guests').value;

            sessionStorage.setItem('searchParams', JSON.stringify({
                destination, checkIn, checkOut, guests
            }));

            loadFeaturedRooms(checkIn, checkOut, destination);
            const roomsContainer = document.getElementById('roomsContainer');
            if (roomsContainer) roomsContainer.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Static event listeners
    const modalCloseBtns = document.querySelectorAll('.modal-close, button[data-i18n="close"]');
    modalCloseBtns.forEach(btn => {
        btn.addEventListener('click', closeRoomModal);
    });

    const roomModal = document.getElementById('roomModal');
    if (roomModal) {
        roomModal.addEventListener('click', function (e) {
            if (e.target === this) {
                closeRoomModal();
            }
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeRoomModal();
        }
    });

    window.addEventListener('languageChanged', () => {
        const checkIn = document.getElementById('checkIn')?.value;
        const checkOut = document.getElementById('checkOut')?.value;
        loadFeaturedRooms(checkIn, checkOut);
    });

    // Delegated event listeners for dynamic cards
    document.body.addEventListener('click', (e) => {
        const target = e.target;

        // Modal thumbnail click
        if (target.classList.contains('modal-thumbnail')) {
            const img = target.src;
            changeMainImage(img, target);
        }

        // Room card click (using closest to handle clicks on children)
        const roomCard = target.closest('.room-card-link');
        if (roomCard) {
            e.preventDefault();
            const roomId = roomCard.getAttribute('data-id');
            openRoomModal(roomId);
        }

        // Book button on card
        if (target.classList.contains('btn-book-now-card')) {
            e.stopPropagation();
            const roomId = target.getAttribute('data-id');
            const hotelId = target.getAttribute('data-hotel-id');
            bookRoom(roomId, hotelId);
        }
    });

    // Initialize
    loadProjects();
    loadFeaturedRooms();
});

// Load and display rooms
async function loadFeaturedRooms(checkIn = '', checkOut = '', projectName = '') {
    const container = document.getElementById('roomsContainer');
    if (!container) return;

    container.innerHTML = '<div class="spinner"></div>';

    try {
        let url = '/api/rooms';
        const params = new URLSearchParams();
        if (checkIn) params.append('checkIn', checkIn);
        if (checkOut) params.append('checkOut', checkOut);
        if (projectName) params.append('projectName', projectName);

        if (params.toString()) {
            url += '?' + params.toString();
        }

        const res = await fetch(url);
        const rooms = await res.json();

        if (rooms.length === 0) {
            container.innerHTML = `<p class="text-center w-full">${t('no_rooms')}</p>`;
            return;
        }

        container.innerHTML = rooms.map(room => `
            <div class="card room-card-link cursor-pointer" data-id="${room.id}">
                <div class="card-image-wrapper">
                    <img src="${room.main_image || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800'}" 
                         alt="${room.room_type}" 
                         class="card-image">
                    ${room.available_count !== undefined ? `<div class="card-badge bg-primary-fallback">${t('remaining_rooms', { count: room.available_count })}</div>` : ''}
                </div>
                <div class="card-content">
                    <h3 class="card-title">${room.room_type}</h3>
                    <p class="card-subtitle">🛏️ ${room.bed_type} | 👥 ${t('max_occupancy', { count: room.max_occupancy })}</p>
                    <p class="card-description">${room.description || ''}</p>
                    
                    <div class="amenities">
                        ${Array.isArray(room.amenities) ? room.amenities.slice(0, 3).map(a => `<span class="amenity-tag">${a}</span>`).join('') : ''}
                    </div>
                    
                    ${checkIn && checkOut ? `
                    <div class="card-footer-action mt-1">
                        <button class="btn btn-secondary btn-book-now-card w-full" data-id="${room.id}" data-hotel-id="${room.hotel_id}">${t('book_now')}</button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading rooms:', error);
        container.innerHTML = `<p class="text-center text-red-500">${t('error_loading_rooms')}</p>`;
    }
}

// Initialize rooms and load projects
async function loadProjects() {
    try {
        const res = await fetch('/api/rooms/projects');
        const projects = await res.json();
        const select = document.getElementById('destination');
        if (!select) return;

        let html = `<option value="" data-i18n="hotel_destination_all">-- 所有專案 --</option>`;

        projects.forEach(p => {
            html += `<option value="${p}">${p}</option>`;
        });

        if (!projects.includes('其他')) {
            html += `<option value="其他" data-i18n="hotel_destination_other">其他</option>`;
        }

        select.innerHTML = html;

        if (window.i18n && typeof window.i18n.updateDOM === 'function') {
            window.i18n.updateDOM();
        }
    } catch (err) {
        console.error('Failed to load projects:', err);
    }
}

let currentRoomData = null;

async function openRoomModal(roomId) {
    try {
        const response = await fetch(`/api/rooms/${roomId}`);
        if (!response.ok) throw new Error('Failed to fetch room details');

        const room = await response.json();
        currentRoomData = room;

        document.getElementById('modalRoomType').textContent = room.room_type || t('room_details');
        document.getElementById('modalLayout').textContent = room.layout || '-';
        document.getElementById('modalBedType').textContent = room.bed_type || '-';
        document.getElementById('modalMaxOccupancy').textContent = room.max_occupancy ? `${room.max_occupancy} ${t('guest_count').replace('{count}', '')}` : '-';
        document.getElementById('modalRoomSize').textContent = room.size_sqm ? `${room.size_sqm} m²` : '-';
        document.getElementById('modalDescription').textContent = room.description || t('no_amenities');

        const mainImage = document.getElementById('modalMainImage');
        let images = [];

        if (room.images && Array.isArray(room.images) && room.images.length > 0) {
            images = room.images.map(img => img.image_url || img);
        }

        if (images.length === 0 && room.main_image) {
            images = [room.main_image];
        }

        if (images.length === 0) {
            images = ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800'];
        }

        mainImage.src = images[0];
        mainImage.alt = room.room_type;

        const thumbnailContainer = document.getElementById('modalThumbnails');
        if (images.length > 1) {
            thumbnailContainer.innerHTML = images.map((img, idx) => `
                <img src="${img}" 
                     alt="${room.room_type} - 圖片 ${idx + 1}" 
                     class="modal-thumbnail ${idx === 0 ? 'active' : ''}">
            `).join('');
            thumbnailContainer.classList.remove('hidden');
        } else {
            thumbnailContainer.classList.add('hidden');
        }

        const amenitiesContainer = document.getElementById('modalAmenities');
        const amenities = Array.isArray(room.amenities) ? room.amenities : [];
        if (amenities.length > 0) {
            amenitiesContainer.innerHTML = amenities.map(amenity => `
                <div class="modal-amenity-item">
                    <span>✓</span>
                    <span>${amenity}</span>
                </div>
            `).join('');
        } else {
            amenitiesContainer.innerHTML = `<p class="modal-description">${t('no_amenities')}</p>`;
        }

        document.getElementById('modalBookButton').onclick = () => {
            window.location.href = `/hotel-details.html?id=${room.hotel_id}`;
        };

        const modal = document.getElementById('roomModal');
        modal.classList.add('active');
        document.body.classList.add('overflow-hidden-body');
    } catch (error) {
        console.error('Error loading room details:', error);
        alert(t('error_loading_rooms'));
    }
}

function closeRoomModal() {
    const modal = document.getElementById('roomModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('overflow-hidden-body');
    }
    currentRoomData = null;
}

function changeMainImage(imageSrc, thumbnailElement) {
    document.getElementById('modalMainImage').src = imageSrc;
    document.querySelectorAll('.modal-thumbnail').forEach(thumb => {
        thumb.classList.remove('active');
    });
    thumbnailElement.classList.add('active');
}
