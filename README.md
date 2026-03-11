# 🏨 Hotel Booking Platform

完整的飯店訂房平台，使用 Node.js + Express + MySQL 開發。

## 功能特色

- ✨ 現代化、響應式設計
- 🔍 飯店搜尋與篩選
- 📅 即時房間可用性檢查
- 💳 完整的訂房流程
- 📊 管理後台儀表板
- 🗄️ MySQL 資料庫整合

## 技術架構

### 後端
- **Node.js** + **Express.js** - RESTful API 伺服器
- **MySQL** - 資料庫
- **mysql2** - MySQL 驅動程式

### 前端
- **HTML5** + **CSS3** + **JavaScript**
- 現代化 CSS 設計系統
- 漸層效果與玻璃擬態設計
- 完全響應式佈局

## 快速開始

### 前置需求

- Node.js 14+ 
- MySQL 資料庫訪問權限
- SSH 訪問遠端伺服器（用於部署）

### 本地開發

1. 安裝依賴：
```bash
npm install
```

2. 設定環境變數（`.env` 檔案已包含資料庫配置）

3. 初始化資料庫：
```bash
mysql -h 35.201.240.143 -u hotel -p hotel < schema.sql
# 密碼: .F$~Jio$m$4D]MSA
```

4. 啟動開發伺服器：
```bash
npm start
```

5. 訪問應用程式：http://localhost:3000

### 部署到遠端伺服器

#### 自動部署（推薦）

使用提供的部署腳本：

```bash
./deploy.sh
```

此腳本會自動：
- 複製檔案到遠端伺服器
- 安裝 Node.js 和依賴
- 設定 PM2 進程管理
- 配置 Nginx 反向代理
- 初始化資料庫

#### SSL/HTTPS 設定

部署完成後，設定 SSL 憑證以啟用 HTTPS：

**前置需求**：
1. 確保域名 DNS 已指向伺服器 IP (hotel.cc-house.cc → 104.199.235.223)
2. 等待 DNS 生效（可能需要幾分鐘到幾小時）

**執行 SSL 設定**：
```bash
./setup-ssl.sh
```

此腳本會自動：
- 安裝 Let's Encrypt Certbot
- 獲取免費 SSL 憑證
- 配置 HTTPS 和自動重定向
- 設定憑證自動更新

詳細說明請參考 [SSL-SETUP.md](SSL-SETUP.md)

#### 手動部署

1. **連接到遠端伺服器**：
```bash
ssh root@104.199.235.223
```

2. **安裝 Node.js**（如果尚未安裝）：
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
```

3. **建立應用程式目錄**：
```bash
mkdir -p /var/www/hotel-booking
cd /var/www/hotel-booking
```

4. **從本地複製檔案**（在本地機器執行）：
```bash
rsync -avz --exclude 'node_modules' \
  /home/wayne.chiu/.gemini/antigravity/scratch/hotel-booking-platform/ \
  root@104.199.235.223:/var/www/hotel-booking/
```

5. **在遠端伺服器上安裝依賴**：
```bash
cd /var/www/hotel-booking
npm install --production
```

6. **初始化資料庫**：
```bash
mysql -h 35.201.240.143 -u hotel -p'.F$~Jio$m$4D]MSA' hotel < schema.sql
```

7. **安裝並配置 PM2**：
```bash
npm install -g pm2
pm2 start server.js --name hotel-booking
pm2 save
pm2 startup
```

8. **安裝並配置 Nginx**：
```bash
apt-get update
apt-get install -y nginx

# 建立 Nginx 配置
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
    }
}
EOF

# 啟用站點
ln -sf /etc/nginx/sites-available/hotel-booking /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

9. **訪問應用程式**：http://104.199.235.223

## API 端點

### 飯店
- `GET /api/hotels` - 取得所有飯店（支援篩選）
- `GET /api/hotels/:id` - 取得單一飯店詳情
- `GET /api/hotels/featured/top` - 取得精選飯店

### 房間
- `GET /api/rooms?hotelId=X` - 取得飯店的房間
- `GET /api/rooms/:id` - 取得單一房間詳情
- `POST /api/rooms/:id/check-availability` - 檢查房間可用性

### 訂單
- `POST /api/bookings` - 建立新訂單
- `GET /api/bookings/:id` - 取得訂單詳情
- `GET /api/bookings/reference/:ref` - 透過訂單編號取得訂單
- `GET /api/bookings` - 取得所有訂單（管理用）
- `PUT /api/bookings/:id` - 更新訂單狀態
- `DELETE /api/bookings/:id` - 取消訂單

## 資料庫架構

- **hotels** - 飯店資訊
- **rooms** - 房型資訊
- **room_images** - 房間圖片
- **bookings** - 訂單記錄
- **users** - 使用者帳號

## 專案結構

```
hotel-booking-platform/
├── config/
│   └── database.js          # 資料庫配置
├── routes/
│   ├── hotels.js            # 飯店 API 路由
│   ├── rooms.js             # 房間 API 路由
│   └── bookings.js          # 訂單 API 路由
├── public/
│   ├── css/
│   │   └── style.css        # 主要樣式表
│   ├── js/
│   │   └── app.js           # 前端 JavaScript
│   ├── index.html           # 首頁
│   ├── hotels.html          # 飯店列表頁
│   ├── hotel-details.html   # 飯店詳情頁
│   ├── booking.html         # 訂房頁面
│   └── admin.html           # 管理後台
├── server.js                # Express 伺服器
├── schema.sql               # 資料庫架構
├── package.json             # 專案配置
├── .env                     # 環境變數
└── deploy.sh                # 部署腳本
```

## 管理指令

### PM2 進程管理
```bash
pm2 status                    # 查看狀態
pm2 logs hotel-booking        # 查看日誌
pm2 restart hotel-booking     # 重啟應用
pm2 stop hotel-booking        # 停止應用
```

### Nginx
```bash
systemctl status nginx        # 查看狀態
systemctl restart nginx       # 重啟 Nginx
nginx -t                      # 測試配置
```

## 環境變數

在 `.env` 檔案中配置：

```env
DB_HOST=35.201.240.143
DB_USER=hotel
DB_PASSWORD=.F$~Jio$m$4D]MSA
DB_NAME=hotel
DB_PORT=3306
PORT=3000
NODE_ENV=production
```

## 安全性建議

1. 更改預設的資料庫密碼
2. 設定 SSL/HTTPS（使用 Let's Encrypt）
3. 實作使用者認證
4. 設定防火牆規則
5. 定期備份資料庫

## 授權

此專案僅供學習和開發使用。

## 支援

如有問題，請聯絡系統管理員。
