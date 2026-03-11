#!/bin/bash

# Quick Deployment Check Script
# This script checks if the application is properly deployed and running

REMOTE_HOST="104.199.235.223"
REMOTE_USER="root"

echo "🔍 Checking deployment status for Hotel Booking Platform..."
echo "=================================================="
echo ""

# Test SSH connection
echo "1️⃣  Testing SSH connection..."
if ssh -o ConnectTimeout=5 -o BatchMode=yes $REMOTE_USER@$REMOTE_HOST "echo 'SSH OK'" 2>/dev/null; then
    echo "   ✅ SSH connection successful"
else
    echo "   ❌ SSH connection failed"
    echo ""
    echo "   Possible solutions:"
    echo "   - Ensure you have SSH key access configured"
    echo "   - Try: ssh $REMOTE_USER@$REMOTE_HOST"
    echo "   - Check if server is online"
    echo ""
    echo "   If you need to deploy, please follow DEPLOYMENT-CHECKLIST.md"
    exit 1
fi

echo ""
echo "2️⃣  Checking server components..."

ssh $REMOTE_USER@$REMOTE_HOST << 'ENDSSH'

# Check Node.js
if command -v node &> /dev/null; then
    echo "   ✅ Node.js installed: $(node --version)"
else
    echo "   ❌ Node.js not installed"
fi

# Check PM2
if command -v pm2 &> /dev/null; then
    echo "   ✅ PM2 installed"
else
    echo "   ❌ PM2 not installed"
fi

# Check Nginx
if command -v nginx &> /dev/null; then
    echo "   ✅ Nginx installed: $(nginx -v 2>&1)"
else
    echo "   ❌ Nginx not installed"
fi

echo ""
echo "3️⃣  Checking application deployment..."

# Check application directory
if [ -d "/var/www/hotel-booking" ]; then
    echo "   ✅ Application directory exists"
    echo "   📁 Files: $(ls -1 /var/www/hotel-booking | wc -l) items"
else
    echo "   ❌ Application not deployed to /var/www/hotel-booking"
    echo ""
    echo "   Please run: ./deploy.sh"
    exit 1
fi

echo ""
echo "4️⃣  Checking application status..."

# Check PM2 status
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null | grep -c "hotel-booking")
    if [ "$PM2_STATUS" -gt 0 ]; then
        echo "   ✅ Application is running in PM2"
        pm2 status hotel-booking --no-color
    else
        echo "   ❌ Application not running in PM2"
        echo "   Start with: pm2 start /var/www/hotel-booking/server.js --name hotel-booking"
    fi
fi

echo ""
echo "5️⃣  Checking Nginx status..."

if systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx is running"
else
    echo "   ❌ Nginx is not running"
    echo "   Start with: systemctl start nginx"
fi

echo ""
echo "6️⃣  Checking network ports..."

# Check if ports are listening
if netstat -tlnp 2>/dev/null | grep -q ":3000"; then
    echo "   ✅ Port 3000 (Node.js) is listening"
else
    echo "   ❌ Port 3000 (Node.js) is not listening"
fi

if netstat -tlnp 2>/dev/null | grep -q ":80"; then
    echo "   ✅ Port 80 (HTTP) is listening"
else
    echo "   ❌ Port 80 (HTTP) is not listening"
fi

echo ""
echo "7️⃣  Testing application response..."

# Test local connection
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo "   ✅ Application responds on localhost:3000"
else
    echo "   ⚠️  Application not responding on localhost:3000"
fi

ENDSSH

echo ""
echo "=================================================="
echo "🌐 Access your application at:"
echo "   http://104.199.235.223"
echo "   http://hotel.cc-house.cc (if DNS configured)"
echo ""
echo "📚 For troubleshooting, see: DEPLOYMENT-CHECKLIST.md"
