#!/bin/bash

# SSL Certificate Setup Script for Hotel Booking Platform
# This script installs and configures Let's Encrypt SSL certificate

set -e

REMOTE_HOST="104.199.235.223"
REMOTE_USER="root"
DOMAIN="hotel.cc-house.cc"
EMAIL="admin@cc-house.cc"  # Change this to your email

echo "🔒 Setting up SSL certificate for $DOMAIN..."

# Run setup on remote server
ssh $REMOTE_USER@$REMOTE_HOST << ENDSSH
set -e

echo "📦 Installing Certbot..."
apt-get update
apt-get install -y certbot python3-certbot-nginx

echo "🔒 Obtaining SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

echo "⚙️  Updating Nginx configuration..."
cat > /etc/nginx/sites-available/hotel-booking << 'EOF'
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Replace \$DOMAIN with actual domain
sed -i "s/\\\$DOMAIN/$DOMAIN/g" /etc/nginx/sites-available/hotel-booking

echo "🔄 Testing and reloading Nginx..."
nginx -t && systemctl reload nginx

echo "⏰ Setting up auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

echo "✅ SSL certificate installed successfully!"
echo "📍 Your site is now available at: https://$DOMAIN"
echo ""
echo "Certificate will auto-renew. Check renewal status with:"
echo "  certbot renew --dry-run"

ENDSSH

echo ""
echo "🎉 SSL setup completed!"
echo "🌐 Access your site at: https://$DOMAIN"
echo ""
echo "Note: Make sure DNS for $DOMAIN points to $REMOTE_HOST"
