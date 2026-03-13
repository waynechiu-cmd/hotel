-- Hotel Booking Platform Database Schema
-- Database: hotel (use existing database)

-- Users table for authentication and customer management
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role ENUM('customer', 'admin') DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hotels table
CREATE TABLE IF NOT EXISTS hotels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address VARCHAR(500) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    rating DECIMAL(2,1) DEFAULT 0.0,
    star_rating INT DEFAULT 3,
    amenities JSON,
    main_image VARCHAR(500),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_city (city),
    INDEX idx_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Room types table
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hotel_id INT NOT NULL,
    room_type VARCHAR(100) NOT NULL,
    description TEXT,
    max_occupancy INT NOT NULL DEFAULT 2,
    bed_type VARCHAR(100),
    size_sqm DECIMAL(6,2),
    price_per_night DECIMAL(10,2) NOT NULL,
    total_rooms INT NOT NULL DEFAULT 1,
    amenities JSON,
    main_image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    INDEX idx_hotel_id (hotel_id),
    INDEX idx_price (price_per_night)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Room images table
CREATE TABLE IF NOT EXISTS room_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    caption VARCHAR(255),
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    INDEX idx_room_id (room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    hotel_id INT NOT NULL,
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(50) NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    num_guests INT NOT NULL DEFAULT 1,
    num_rooms INT NOT NULL DEFAULT 1,
    total_price DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    special_requests TEXT,
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE RESTRICT,
    INDEX idx_booking_reference (booking_reference),
    INDEX idx_check_in_date (check_in_date),
    INDEX idx_status (status),
    INDEX idx_guest_email (guest_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data for demonstration

-- Sample hotels
INSERT INTO hotels (name, description, address, city, country, phone, email, rating, star_rating, amenities, main_image) VALUES
('Grand Plaza Hotel', 'Luxury hotel in the heart of the city with stunning views and world-class amenities.', '123 Main Street', 'Taipei', 'Taiwan', '+886-2-1234-5678', 'info@grandplaza.com', 4.5, 5, 
'["Free WiFi", "Swimming Pool", "Fitness Center", "Restaurant", "Bar", "Room Service", "Parking", "Spa"]', 
'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'),

('Seaside Resort', 'Beautiful beachfront resort perfect for relaxation and family vacations.', '456 Ocean Drive', 'Kaohsiung', 'Taiwan', '+886-7-8765-4321', 'contact@seasideresort.com', 4.3, 4,
'["Free WiFi", "Beach Access", "Swimming Pool", "Restaurant", "Water Sports", "Kids Club", "Parking"]',
'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'),

('Mountain View Lodge', 'Cozy mountain retreat with breathtaking views and hiking trails nearby.', '789 Mountain Road', 'Hualien', 'Taiwan', '+886-3-9876-5432', 'info@mountainview.com', 4.7, 4,
'["Free WiFi", "Mountain View", "Restaurant", "Hiking Trails", "Fireplace", "Parking"]',
'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800');

-- Sample rooms for Grand Plaza Hotel (id=1)
INSERT INTO rooms (hotel_id, room_type, description, max_occupancy, bed_type, size_sqm, price_per_night, total_rooms, amenities, main_image) VALUES
(1, 'Deluxe Room', 'Spacious room with city view and modern amenities', 2, 'King Bed', 35.00, 3500.00, 10,
'["Air Conditioning", "Mini Bar", "Safe", "TV", "Coffee Maker", "Bathtub"]',
'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800'),

(1, 'Executive Suite', 'Luxurious suite with separate living area and premium furnishings', 4, '1 King + 1 Sofa Bed', 65.00, 6500.00, 5,
'["Air Conditioning", "Mini Bar", "Safe", "TV", "Coffee Maker", "Bathtub", "Living Room", "Work Desk"]',
'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800');

-- Sample rooms for Seaside Resort (id=2)
INSERT INTO rooms (hotel_id, room_type, description, max_occupancy, bed_type, size_sqm, price_per_night, total_rooms, amenities, main_image) VALUES
(2, 'Ocean View Room', 'Beautiful room with direct ocean views and balcony', 2, 'Queen Bed', 30.00, 2800.00, 15,
'["Air Conditioning", "Balcony", "Mini Fridge", "TV", "Ocean View"]',
'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'),

(2, 'Family Suite', 'Spacious suite perfect for families with connecting rooms', 6, '2 Queen Beds', 55.00, 4500.00, 8,
'["Air Conditioning", "Balcony", "Mini Fridge", "TV", "Ocean View", "Kitchenette"]',
'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800');

-- Sample rooms for Mountain View Lodge (id=3)
INSERT INTO rooms (hotel_id, room_type, description, max_occupancy, bed_type, size_sqm, price_per_night, total_rooms, amenities, main_image) VALUES
(3, 'Standard Room', 'Cozy room with mountain view and rustic charm', 2, 'Double Bed', 25.00, 2200.00, 12,
'["Air Conditioning", "Mountain View", "TV", "Coffee Maker"]',
'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'),

(3, 'Premium Cabin', 'Private cabin with fireplace and stunning mountain panorama', 4, '1 King + 2 Twin', 50.00, 4000.00, 6,
'["Air Conditioning", "Mountain View", "TV", "Coffee Maker", "Fireplace", "Private Balcony", "Kitchenette"]',
'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800');

-- Sample admin user (password: admin123 - should be hashed in production)
INSERT INTO users (email, password_hash, full_name, phone, role) VALUES
('admin@hotel.com', '$2b$10$rKvvJQMw8qF5K5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5', 'Admin User', '+886-912-345-678', 'admin');
