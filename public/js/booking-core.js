let roomData = null;
let hotelData = null;
let roomId = null;
let hotelId = null;

async function loadBookingPage() {
    roomId = sessionStorage.getItem('selectedRoom');
    hotelId = sessionStorage.getItem('selectedHotel');

    if (!roomId || !hotelId) {
        window.location.href = '/hotels.html';
        return;
    }

    hotelData = await fetchHotelById(hotelId);
    if (hotelData && hotelData.rooms) {
        roomData = hotelData.rooms.find(r => r.id == roomId);
    }

    if (!roomData) {
        window.location.href = '/hotels.html';
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const checkInInput = document.getElementById('checkIn');
    const checkOutInput = document.getElementById('checkOut');

    if (checkInInput) checkInInput.setAttribute('min', today);
    if (checkOutInput) checkOutInput.setAttribute('min', today);

    const searchParamsStr = sessionStorage.getItem('searchParams');
    if (searchParamsStr) {
        try {
            const searchParams = JSON.parse(searchParamsStr);
            if (searchParams.checkIn && checkInInput) checkInInput.value = searchParams.checkIn;
            if (searchParams.checkOut && checkOutInput) checkOutInput.value = searchParams.checkOut;
            if (searchParams.guests) document.getElementById('numGuests').value = searchParams.guests;
        } catch (e) {
            console.error('Error parsing searchParams:', e);
        }
    }

    updateSummary();

    if (checkInInput) checkInInput.addEventListener('change', updateSummary);
    if (checkOutInput) checkOutInput.addEventListener('change', updateSummary);
}

async function updateSummary() {
    const checkInInput = document.getElementById('checkIn');
    const checkOutInput = document.getElementById('checkOut');
    if (!checkInInput || !checkOutInput) return;

    const checkIn = checkInInput.value;
    const checkOut = checkOutInput.value;
    const numRooms = 1;

    let nights = 0;

    if (checkIn && checkOut) {
        nights = calculateNights(checkIn, checkOut);

        const checkInDate = new Date(checkIn);
        checkInDate.setDate(checkInDate.getDate() + 1);
        checkOutInput.setAttribute('min', checkInDate.toISOString().split('T')[0]);

        const availability = await checkRoomAvailability(roomId, checkIn, checkOut, numRooms);
        const roomSelect = document.getElementById('roomInstance');
        const messageDiv = document.getElementById('availabilityMessage');

        if (availability.available && availability.instances && availability.instances.length > 0) {
            roomSelect.disabled = false;
            roomSelect.innerHTML = `<option value="">${t('select_room_number')}</option>` +
                availability.instances.map(inst => `<option value="${inst.id}">${t('room_prefix')} ${inst.room_number}</option>`).join('');

            messageDiv.className = 'hidden';
        } else {
            roomSelect.disabled = true;
            roomSelect.innerHTML = `<option value="">${t('no_available_rooms')}</option>`;

            messageDiv.className = 'status-badge bg-red-error text-red-error block';
            messageDiv.textContent = t('no_available_rooms');
        }
    } else {
        const roomSelect = document.getElementById('roomInstance');
        if (roomSelect) {
            roomSelect.disabled = true;
            roomSelect.innerHTML = `<option value="">${t('select_date_first')}</option>`;
        }
    }

    const summaryHtml = `
        <div class="mb-1">
            <img src="${roomData.main_image || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400'}" 
                 alt="${roomData.room_type}"
                 class="summary-img">
        </div>
        <h4 class="room-title-lg">${roomData.room_type}</h4>
        
        <div class="summary-grid">
            <div class="summary-item-label">${t('layout')}: <br><span class="summary-item-value">${roomData.layout || '-'}</span></div>
            <div class="summary-item-label">${t('bed_type')}: <br><span class="summary-item-value">${roomData.bed_type || '-'}</span></div>
            <div class="summary-item-label">${t('max_occupancy').split('{count}')[0]}: <br><span class="summary-item-value">${roomData.max_occupancy ? roomData.max_occupancy + ' ' + t('guest_count').replace('{count}', '') : '-'}</span></div>
            <div class="summary-item-label">${t('room_size')}: <br><span class="summary-item-value">${roomData.size_sqm ? roomData.size_sqm + ' m²' : '-'}</span></div>
        </div>
        
        <div class="border-t-secondary">
            ${checkIn && checkOut ? `
                <div class="flex-between">
                    <span>${t('check_in')}</span>
                    <span class="font-bold">${formatDate(checkIn)}</span>
                </div>
                <div class="flex-between">
                    <span>${t('check_out')}</span>
                    <span class="font-bold">${formatDate(checkOut)}</span>
                </div>
                <div class="flex-between">
                    <span>住宿天數</span>
                    <span class="font-bold">${t('nights_count', { count: nights })}</span>
                </div>
            ` : `<p class="text-gray-500">${t('select_date_first')}</p>`}
            <div class="flex-between">
                <span>房間數量</span>
                <span class="font-bold">${t('room_count', { count: 1 })}</span>
            </div>
        </div>
    `;

    document.getElementById('bookingSummary').innerHTML = summaryHtml;
}

document.addEventListener('DOMContentLoaded', () => {
    loadBookingPage();

    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const checkIn = document.getElementById('checkIn').value;
            const checkOut = document.getElementById('checkOut').value;
            const numRooms = 1;
            const roomInstanceId = document.getElementById('roomInstance').value;
            const numGuests = parseInt(document.getElementById('numGuests').value);
            const guestName = document.getElementById('guestName').value;
            const guestEmail = document.getElementById('guestEmail').value;
            const guestPhone = document.getElementById('guestPhone').value;
            const guestMobile = document.getElementById('guestMobile').value;
            const specialRequests = document.getElementById('specialRequests').value;

            if (!roomInstanceId) {
                alert(t('alert_select_room'));
                return;
            }

            const mobileRegex = /^09\d{8}$/;
            if (!mobileRegex.test(guestMobile)) {
                alert(t('alert_invalid_phone'));
                return;
            }

            if (!guestName || !guestEmail || !guestPhone) {
                alert(t('alert_fill_required'));
                return;
            }

            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = t('processing');

            try {
                const bookingData = {
                    roomId: parseInt(roomId),
                    hotelId: parseInt(hotelId),
                    guestName,
                    guestEmail,
                    guestPhone,
                    guestMobile,
                    checkInDate: checkIn,
                    checkOutDate: checkOut,
                    numGuests,
                    numRooms,
                    specialRequests: specialRequests || null,
                    roomInstanceId: parseInt(roomInstanceId)
                };

                const response = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || t('error_booking_failed'));
                }

                document.getElementById('bookingReference').textContent = result.bookingReference;
                const modal = document.getElementById('successModal');
                modal.classList.remove('hidden');
                modal.classList.add('display-flex');

            } catch (error) {
                const messageDiv = document.getElementById('availabilityMessage');
                messageDiv.className = 'status-badge status-cancelled bg-error text-error';
                messageDiv.classList.remove('hidden');
                messageDiv.classList.add('display-block');
                messageDiv.textContent = `${t('confirm_booking')}失敗：${error.message}`;
                submitBtn.disabled = false;
                submitBtn.textContent = t('confirm_booking');
            }
        });
    }

    const backHomeBtn = document.getElementById('backToHomeBtn');
    if (backHomeBtn) {
        backHomeBtn.addEventListener('click', () => {
            sessionStorage.removeItem('selectedRoom');
            sessionStorage.removeItem('selectedHotel');
            window.location.href = '/';
        });
    }

    window.addEventListener('languageChanged', updateSummary);
});
