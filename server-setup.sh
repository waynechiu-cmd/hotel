#!/bin/bash

# Manual Deployment Guide - Execute these commands on the server
# Copy this entire script to your server and run it

set -e

echo "🚀 Hotel Booking Platform - Manual Deployment"
echo "=============================================="
echo ""

# Step 1: Install Node.js
echo "📦 Step 1: Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    echo "✅ Node.js installed: $(node --version)"
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Step 2: Create application directory
echo ""
echo "📁 Step 2: Creating application directory..."
mkdir -p /var/www/hotel-booking
cd /var/www/hotel-booking
echo "✅ Directory created: /var/www/hotel-booking"

# Step 3: Create package.json
echo ""
echo "📝 Step 3: Creating package.json..."
cat > package.json << 'EOF'
{
  "name": "hotel-booking-platform",
  "version": "1.0.0",
  "description": "Hotel booking platform with MySQL database",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "node test-db-connection.js"
  },
  "keywords": ["hotel", "booking", "reservation"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.5",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "body-parser": "^1.20.2"
  }
}
EOF
echo "✅ package.json created"

# Step 4: Install dependencies
echo ""
echo "📦 Step 4: Installing npm dependencies..."
npm install --production
echo "✅ Dependencies installed"

# Step 5: Create .env file
echo ""
echo "🔐 Step 5: Creating environment configuration..."
cat > .env << 'EOF'
DB_HOST=35.201.240.143
DB_USER=hotel
DB_PASSWORD=.F$~Jio$m$4D]MSA
DB_NAME=hotel
DB_PORT=3306
PORT=3000
NODE_ENV=production
EOF
echo "✅ .env file created"

# Step 6: Install PM2
echo ""
echo "⚙️  Step 6: Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    echo "✅ PM2 installed"
else
    echo "✅ PM2 already installed"
fi

# Step 7: Install Nginx
echo ""
echo "🌐 Step 7: Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get update
    apt-get install -y nginx
    echo "✅ Nginx installed"
else
    echo "✅ Nginx already installed"
fi

# Step 8: Configure Nginx
echo ""
echo "⚙️  Step 8: Configuring Nginx..."
cat > /etc/nginx/sites-available/hotel-booking << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/hotel-booking /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "✅ Nginx configured"

echo ""
echo "=============================================="
echo "✅ Infrastructure setup complete!"
echo ""
echo "⚠️  NEXT STEPS:"
echo "1. Upload application files to /var/www/hotel-booking"
echo "2. Run the database initialization"
echo "3. Start the application with PM2"
echo ""
echo "See MANUAL-DEPLOY-STEPS.txt for detailed instructions"
