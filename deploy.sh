#!/bin/bash

# Hotel Booking Platform Deployment Script
# This script deploys the application to the remote server

set -e

REMOTE_HOST="104.199.235.223"
REMOTE_USER="wayne.chiu"
SSH_KEY="/c/Users/24289/.ssh/GCP_103903"
APP_DIR="/var/www/hotel-booking"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting deployment to $REMOTE_HOST..."

# Create remote directory
echo "📁 Creating remote directory..."
ssh -i "$SSH_KEY" $REMOTE_USER@$REMOTE_HOST "mkdir -p $APP_DIR"

# Copy application files
echo "📦 Copying application files..."
rsync -avz -e "ssh -i $SSH_KEY" --exclude 'node_modules' --exclude '.git' --exclude '.env' \
    $PROJECT_DIR/ $REMOTE_USER@$REMOTE_HOST:$APP_DIR/

# Copy environment file
echo "🔐 Copying environment configuration..."
scp -i "$SSH_KEY" $PROJECT_DIR/.env $REMOTE_USER@$REMOTE_HOST:$APP_DIR/.env

# Install dependencies and setup on remote server
echo "⚙️  Setting up application on remote server..."
ssh -i "$SSH_KEY" $REMOTE_USER@$REMOTE_HOST << 'ENDSSH'
cd /var/www/hotel-booking

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install dependencies
echo "Installing npm dependencies..."
npm install --production

# Install PM2 for process management
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Stop existing application
pm2 stop hotel-booking || true
pm2 delete hotel-booking || true

# Start application with PM2
echo "Starting application..."
pm2 start server.js --name hotel-booking
pm2 save
pm2 startup

# Install and configure Nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get update
    apt-get install -y nginx
fi

# Configure Nginx
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

# Enable site
ln -sf /etc/nginx/sites-available/hotel-booking /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t && systemctl reload nginx

echo "✅ Application deployed successfully!"
ENDSSH

# Initialize database
echo "🗄️  Initializing database..."
ssh -i "$SSH_KEY" $REMOTE_USER@$REMOTE_HOST << 'ENDSSH'
cd /var/www/hotel-booking
mysql -h 35.201.240.143 -u hotel -p'.F$~Jio$m$4D]MSA' hotel < schema.sql
echo "✅ Database initialized!"
ENDSSH

echo ""
echo "🎉 Deployment completed successfully!"
echo "📍 Your application is now running at: http://$REMOTE_HOST"
echo ""
echo "Useful commands:"
echo "  - View logs: ssh $REMOTE_USER@$REMOTE_HOST 'pm2 logs hotel-booking'"
echo "  - Restart app: ssh $REMOTE_USER@$REMOTE_HOST 'pm2 restart hotel-booking'"
echo "  - Stop app: ssh $REMOTE_USER@$REMOTE_HOST 'pm2 stop hotel-booking'"
