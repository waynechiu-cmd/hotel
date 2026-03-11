#!/bin/bash

# Configuration
APP_NAME="hotel-booking"
PORT=3000

echo "🔄 Starting safe restart for $APP_NAME..."

# 1. Stop the application via PM2
echo "⏹️ Stopping PM2 process..."
pm2 stop $APP_NAME || echo "⚠️ PM2 process probably not running."

# 2. Check for port 3000 usage (Zombie detection)
echo "🔍 Checking for zombie processes on port $PORT..."
# Find PID listening on port 3000 using ss
# Output format: LISTEN 0 511 *:3000 *:* users:(("node",pid=12345,fd=20))
ZOMBIE_PID=$(ss -lptn "sport = :$PORT" | grep "pid=" | sed 's/.*pid=\([0-9]*\).*/\1/')

if [ -n "$ZOMBIE_PID" ]; then
    echo "👻 Found zombie process PID: $ZOMBIE_PID on port $PORT"
    echo "🔪 Killing zombie process..."
    sudo kill -9 $ZOMBIE_PID
    echo "✅ Process killed."
else
    echo "✅ Port $PORT is free."
fi

# 3. Restart application
echo "🚀 Restarting application via PM2..."
pm2 restart $APP_NAME --update-env

# 4. Save PM2 list
pm2 save

echo "🎉 Safe restart complete!"
