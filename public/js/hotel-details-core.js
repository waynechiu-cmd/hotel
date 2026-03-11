async function loadHotelDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const hotelId = urlParams.get('id');

    if (!hotelId) {
        window.location.href = '/hotels.html';
        return;
    }

    const hotel = await fetchHotelById(hotelId);

    if (!hotel) {
        document.getElementById('hotelDetails').innerHTML = `
            <div class="container section">
                <p class="text-center">${t('no_hotels_match')}</p>
            </div>
        `;
        return;
    }

    window.currentHotel = hotel;

    const amenitiesHtml = hotel.amenities && hotel.amenities.length > 0
        ? hotel.amenities.map(a => `<span class="amenity-tag">${a}</span>`).join('')
        : '';

    const roomsHtml = hotel.rooms && hotel.rooms.length > 0
        ? hotel.rooms.map((room, index) => {
            const roomAmenities = room.amenities && room.amenities.length > 0
                ? room.amenities.slice(0, 5).map(a => `<span class="amenity-tag">${a}</span>`).join('')
                : '';

            return `
                <div class="card">
                    <div class="card-image-wrapper relative">
                        <img src="${room.main_image || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800'}" 
                             alt="${room.room_type}" 
                             class="card-image btn-open-gallery cursor-pointer"
                             data-index="${index}">
                        <button class="btn-open-gallery btn-open-gallery-style" data-index="${index}">
                            📷 查看照片 (${(room.images ? room.images.length : 0) + 1})
                        </button>
                    </div>
                    <div class="card-content">
                        <h3 class="card-title">${room.room_type}</h3>
                        <p class="card-subtitle">🛏️ ${room.bed_type} | 👥 ${t('max_occupancy', { count: room.max_occupancy })} | 📐 ${room.size_sqm || 'N/A'} m²</p>
                        <p class="card-description">${room.description || ''}</p>
                        
                        <div class="amenities">
                            ${roomAmenities}
                        </div>
                        
                        <div class="card-footer">
                            <button class="btn btn-secondary btn-book-room-details" data-room-id="${room.id}" data-hotel-id="${hotel.id}">${t('book_now')}</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('')
        : `<p class="text-center">${t('no_available_rooms')}</p>`;

    document.getElementById('hotelDetails').innerHTML = `
        <!-- Hero Image -->
        <div class="hotel-hero-container">
            <img src="${hotel.main_image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200'}" 
                 alt="${hotel.name}"
                 class="hotel-hero-img">
            <div class="hotel-hero-overlay">
                <div class="container">
                    <h1 class="hotel-hero-title">${hotel.name}</h1>
                    <p class="hotel-hero-subtitle">📍 ${hotel.address}, ${hotel.city}, ${hotel.country}</p>
                    <div class="hotel-rating-container">
                        <span class="hotel-rating-stars">${renderStars(hotel.rating)}</span>
                        <span class="hotel-rating-value">${hotel.rating}</span>
                        <span class="hotel-star-text">${'⭐'.repeat(hotel.star_rating)} 飯店</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Hotel Info -->
        <section class="section">
            <div class="container">
                <div class="details-layout">
                    <div>
                        <h2 data-i18n="about_hotel">${t('about_hotel')}</h2>
                        <p class="hotel-desc-lg">${hotel.description || t('no_amenities')}</p>
                    </div>
                    <div class="card">
                        <div class="card-content">
                            <h3 data-i18n="contact_info">${t('contact_info')}</h3>
                            <p class="contact-info-mt1">📞 ${hotel.phone || 'N/A'}</p>
                            <p>📧 ${hotel.email || 'N/A'}</p>
                            <p>📍 ${hotel.address}</p>
                            <p>${hotel.city}, ${hotel.country} ${hotel.postal_code || ''}</p>
                        </div>
                    </div>
                </div>
                
                <div class="mb-3">
                    <h2 data-i18n="hotel_amenities">${t('hotel_amenities')}</h2>
                    <div class="amenities amenities-mt1">
                        ${amenitiesHtml}
                    </div>
                </div>
                
                <div>
                    <h2 class="mb-2" data-i18n="available_rooms">${t('available_rooms')}</h2>
                    <div class="grid grid-2">
                        ${roomsHtml}
                    </div>
                </div>
            </div>
        </section>
    `;
}

let currentGalleryImages = [];
let currentGalleryIndex = 0;

function openGallery(roomIndex) {
    if (!window.currentHotel || !window.currentHotel.rooms) return;
    const room = window.currentHotel.rooms[roomIndex];
    if (!room) return;

    currentGalleryImages = [
        { image_url: room.main_image || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800' },
        ...(room.images || [])
    ];
    currentGalleryIndex = 0;
    updateGallery();
    document.getElementById('galleryModal').classList.remove('hidden');
}

function closeGallery() {
    document.getElementById('galleryModal').classList.add('hidden');
}

function nextImage() {
    if (currentGalleryImages.length === 0) return;
    currentGalleryIndex = (currentGalleryIndex + 1) % currentGalleryImages.length;
    updateGallery();
}

function prevImage() {
    if (currentGalleryImages.length === 0) return;
    currentGalleryIndex = (currentGalleryIndex - 1 + currentGalleryImages.length) % currentGalleryImages.length;
    updateGallery();
}

function updateGallery() {
    const img = currentGalleryImages[currentGalleryIndex];
    if (img) {
        document.getElementById('galleryImage').src = img.image_url;
        document.getElementById('galleryCounter').textContent = `${currentGalleryIndex + 1} / ${currentGalleryImages.length}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadHotelDetails();

    document.body.addEventListener('click', (e) => {
        const target = e.target;

        if (target.classList.contains('btn-open-gallery')) {
            openGallery(target.getAttribute('data-index'));
        }

        if (target.classList.contains('btn-book-room-details')) {
            bookRoom(target.getAttribute('data-room-id'), target.getAttribute('data-hotel-id'));
        }

        if (target.id === 'closeGalleryBtn') {
            closeGallery();
        }

        if (target.id === 'prevImageBtn') {
            prevImage();
        }

        if (target.id === 'nextImageBtn') {
            nextImage();
        }
    });

    window.addEventListener('languageChanged', loadHotelDetails);
});
