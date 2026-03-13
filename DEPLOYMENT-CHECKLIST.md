# 部署檢查清單與故障排除

## 問題：網頁無法訪問

如果您無法訪問網站，請按照以下步驟檢查：

## 📋 部署前檢查清單

### 1. SSH 訪問權限 ✓
確認您可以連接到伺服器：

```bash
ssh root@104.199.235.223
```

**如果無法連接**：
- 確認您有 SSH 私鑰
- 檢查私鑰權限：`chmod 600 ~/.ssh/id_rsa`
- 或者詢問伺服器管理員添加您的公鑰

### 2. 應用程式是否已部署？

**檢查方法**：
```bash
ssh root@104.199.235.223 "ls -la /var/www/hotel-booking"
```

**如果目錄不存在** → 應用程式尚未部署，需要執行部署

---

## 🚀 快速部署步驟

### 選項 A：自動部署（需要 SSH 訪問）

```bash
cd /home/wayne.chiu/.gemini/antigravity/scratch/hotel-booking-platform
./deploy.sh
```

### 選項 B：手動部署

如果自動腳本無法使用，請按照以下步驟：

#### 步驟 1：連接到伺服器
```bash
ssh root@104.199.235.223
```

#### 步驟 2：安裝 Node.js（如果未安裝）
```bash
# 檢查是否已安裝
node --version

# 如果未安裝，執行：
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
```

#### 步驟 3：建立應用程式目錄
```bash
mkdir -p /var/www/hotel-booking
cd /var/www/hotel-booking
```

#### 步驟 4：上傳檔案

**方法 1 - 使用 rsync（從本地機器執行）**：
```bash
rsync -avz --exclude 'node_modules' \
  /home/wayne.chiu/.gemini/antigravity/scratch/hotel-booking-platform/ \
  root@104.199.235.223:/var/www/hotel-booking/
```

**方法 2 - 使用 SCP（從本地機器執行）**：
```bash
cd /home/wayne.chiu/.gemini/antigravity/scratch/hotel-booking-platform
tar -czf hotel-booking.tar.gz --exclude='node_modules' .
scp hotel-booking.tar.gz root@104.199.235.223:/var/www/
ssh root@104.199.235.223 "cd /var/www && tar -xzf hotel-booking.tar.gz -C hotel-booking"
```

**方法 3 - 使用 Git（如果有 Git 倉庫）**：
```bash
# 在伺服器上
cd /var/www/hotel-booking
git clone <your-repo-url> .
```

**方法 4 - 手動複製貼上（小型專案）**：
可以手動建立檔案並複製內容

#### 步驟 5：安裝依賴
```bash
cd /var/www/hotel-booking
npm install --production
```

#### 步驟 6：設定環境變數
```bash
cat > /var/www/hotel-booking/.env << 'EOF'
DB_HOST=35.201.240.143
DB_USER=hotel
DB_PASSWORD=.F$~Jio$m$4D]MSA
DB_NAME=hotel
DB_PORT=3306
PORT=3000
NODE_ENV=production
EOF
```

#### 步驟 7：初始化資料庫
```bash
cd /var/www/hotel-booking
mysql -h 35.201.240.143 -u hotel -p'.F$~Jio$m$4D]MSA' hotel < schema.sql
```

#### 步驟 8：安裝 PM2
```bash
npm install -g pm2
```

#### 步驟 9：啟動應用程式
```bash
cd /var/www/hotel-booking
pm2 start server.js --name hotel-booking
pm2 save
pm2 startup
```

#### 步驟 10：安裝 Nginx
```bash
apt-get update
apt-get install -y nginx
```

#### 步驟 11：配置 Nginx
```bash
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

# 啟用站點
ln -sf /etc/nginx/sites-available/hotel-booking /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 測試並重新載入
nginx -t && systemctl reload nginx
```

---

## 🔍 故障排除

### 問題 1：無法連接到伺服器

**症狀**：`ssh: connect to host 104.199.235.223 port 22: Connection refused`

**解決方案**：
1. 檢查伺服器是否在線
2. 確認 SSH 服務正在運行
3. 檢查防火牆設定

### 問題 2：Permission denied (publickey)

**症狀**：SSH 連接被拒絕

**解決方案**：
1. 確認您有正確的 SSH 私鑰
2. 使用密碼登入（如果啟用）：`ssh -o PreferredAuthentications=password root@104.199.235.223`
3. 聯絡伺服器管理員添加您的公鑰

### 問題 3：應用程式無法啟動

**檢查應用程式狀態**：
```bash
ssh root@104.199.235.223 "pm2 status"
```

**查看日誌**：
```bash
ssh root@104.199.235.223 "pm2 logs hotel-booking --lines 50"
```

**常見錯誤**：
- **資料庫連接失敗**：檢查 `.env` 檔案中的資料庫設定
- **端口被佔用**：更改 `.env` 中的 PORT 設定
- **模組未找到**：執行 `npm install`

### 問題 4：Nginx 錯誤

**檢查 Nginx 狀態**：
```bash
ssh root@104.199.235.223 "systemctl status nginx"
```

**測試配置**：
```bash
ssh root@104.199.235.223 "nginx -t"
```

**查看錯誤日誌**：
```bash
ssh root@104.199.235.223 "tail -f /var/log/nginx/error.log"
```

### 問題 5：網頁顯示 502 Bad Gateway

**原因**：Node.js 應用程式未運行

**解決方案**：
```bash
ssh root@104.199.235.223 "pm2 restart hotel-booking"
```

### 問題 6：網頁顯示 404 Not Found

**原因**：Nginx 配置錯誤或未啟用

**解決方案**：
```bash
ssh root@104.199.235.223 "ln -sf /etc/nginx/sites-available/hotel-booking /etc/nginx/sites-enabled/ && systemctl reload nginx"
```

---

## ✅ 驗證部署成功

### 1. 檢查應用程式運行狀態
```bash
ssh root@104.199.235.223 "pm2 status"
```
應該看到 `hotel-booking` 狀態為 `online`

### 2. 檢查 Nginx 狀態
```bash
ssh root@104.199.235.223 "systemctl status nginx"
```
應該顯示 `active (running)`

### 3. 測試本地連接
```bash
ssh root@104.199.235.223 "curl http://localhost:3000"
```
應該返回 HTML 內容

### 4. 測試外部訪問
在瀏覽器中訪問：
- http://104.199.235.223
- http://hotel.cc-house.cc（如果 DNS 已設定）

---

## 📞 需要協助？

如果以上步驟都無法解決問題，請提供以下資訊：

1. **SSH 連接狀態**：
   ```bash
   ssh root@104.199.235.223 "echo 'Connected successfully'"
   ```

2. **伺服器資訊**：
   ```bash
   ssh root@104.199.235.223 "uname -a && node --version && nginx -v"
   ```

3. **應用程式狀態**：
   ```bash
   ssh root@104.199.235.223 "pm2 status && pm2 logs hotel-booking --lines 20"
   ```

4. **錯誤訊息**：複製任何錯誤訊息

---

## 🎯 快速檢查指令

一次性檢查所有關鍵狀態：

```bash
ssh root@104.199.235.223 << 'EOF'
echo "=== Node.js 版本 ==="
node --version || echo "Node.js 未安裝"

echo -e "\n=== PM2 狀態 ==="
pm2 status || echo "PM2 未安裝"

echo -e "\n=== Nginx 狀態 ==="
systemctl status nginx --no-pager || echo "Nginx 未安裝"

echo -e "\n=== 應用程式目錄 ==="
ls -la /var/www/hotel-booking || echo "應用程式未部署"

echo -e "\n=== 端口監聽 ==="
netstat -tlnp | grep -E ':(80|443|3000)'

echo -e "\n=== 最近的應用程式日誌 ==="
pm2 logs hotel-booking --lines 10 --nostream || echo "無日誌"
EOF
```

這個指令會顯示所有關鍵資訊，幫助診斷問題。
