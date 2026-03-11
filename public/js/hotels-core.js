let currentFilters = {};

async function loadHotels(filters = {}) {
    const container = document.getElementById('hotelsList');
    const countElement = document.getElementById('resultsCount');

    if (container) container.innerHTML = '<div class="spinner"></div>';

    const hotels = await fetchAllHotels(filters);

    if (countElement) countElement.textContent = t('found_hotels', { count: hotels.length });

    if (hotels.length === 0) {
        if (container) container.innerHTML = `<p class="text-center">${t('no_hotels_match')}</p>`;
        return;
    }

    if (container) {
        container.innerHTML = hotels.map(hotel => {
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
                        <p class="card-description">${hotel.description ? hotel.description.substring(0, 120) + '...' : ''}</p>
                        
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
                            <button class="btn btn-secondary btn-view-hotel-list" data-id="${hotel.id}">${t('view_details')}</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function applyFilters() {
    const filters = {};

    const searchInput = document.getElementById('searchQuery');
    const citySelect = document.getElementById('cityFilter');
    const minRatingSelect = document.getElementById('minRating');

    if (searchInput && searchInput.value) filters.search = searchInput.value;
    if (citySelect && citySelect.value) filters.city = citySelect.value;
    if (minRatingSelect && minRatingSelect.value) filters.minRating = minRatingSelect.value;

    currentFilters = filters;
    loadHotels(filters);
}

function clearFilters() {
    const searchInput = document.getElementById('searchQuery');
    const citySelect = document.getElementById('cityFilter');
    const minRatingSelect = document.getElementById('minRating');

    if (searchInput) searchInput.value = '';
    if (citySelect) citySelect.value = '';
    if (minRatingSelect) minRatingSelect.value = '';

    currentFilters = {};
    loadHotels();
}

document.addEventListener('DOMContentLoaded', () => {
    const searchParams = sessionStorage.getItem('searchParams');
    if (searchParams) {
        try {
            const params = JSON.parse(searchParams);
            if (params.destination) {
                const searchInput = document.getElementById('searchQuery');
                if (searchInput) {
                    searchInput.value = params.destination;
                    currentFilters.search = params.destination;
                }
            }
            sessionStorage.removeItem('searchParams');
        } catch (e) {
            console.error('Error parsing searchParams:', e);
        }
    }

    loadHotels(currentFilters);

    document.body.addEventListener('click', (e) => {
        const target = e.target;
        
        if (target.classList.contains('btn-view-hotel-list')) {
            viewHotelDetails(target.getAttribute('data-id'));
        }

        if (target.id === 'applyFiltersBtn') {
            applyFilters();
        }

        if (target.id === 'clearFiltersBtn') {
            clearFilters();
        }
    });

    window.addEventListener('languageChanged', () => {
        loadHotels(currentFilters);
    });
});
