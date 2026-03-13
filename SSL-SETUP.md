# SSL 憑證設定指南

本指南說明如何為您的訂房平台設定 SSL/HTTPS 憑證。

## 前置需求

1. ✅ 域名 DNS 已設定指向伺服器
   - 域名：`hotel.cc-house.cc`
   - IP：`104.199.235.223`
   
2. ✅ 確認 DNS 已生效（可能需要等待幾分鐘到幾小時）
   ```bash
   # 檢查 DNS 是否已指向正確 IP
   nslookup hotel.cc-house.cc
   # 或
   dig hotel.cc-house.cc
   ```

3. ✅ 伺服器的 80 和 443 端口已開放

## 自動安裝 SSL 憑證

### 方法一：使用自動化腳本（推薦）

```bash
cd /home/wayne.chiu/.gemini/antigravity/scratch/hotel-booking-platform
./setup-ssl.sh
```

此腳本會自動：
- 安裝 Certbot（Let's Encrypt 客戶端）
- 獲取 SSL 憑證
- 配置 Nginx 使用 HTTPS
- 設定 HTTP 到 HTTPS 的自動重定向
- 啟用憑證自動更新

### 方法二：手動安裝

如果自動腳本遇到問題，可以手動執行以下步驟：

#### 1. 連接到伺服器
```bash
ssh root@104.199.235.223
```

#### 2. 安裝 Certbot
```bash
apt-get update
apt-get install -y certbot python3-certbot-nginx
```

#### 3. 獲取 SSL 憑證
```bash
certbot --nginx -d hotel.cc-house.cc --email admin@cc-house.cc
```

按照提示操作：
- 同意服務條款（輸入 Y）
- 選擇是否接收郵件通知
- 選擇重定向選項（建議選擇 2 - 自動重定向到 HTTPS）

#### 4. 驗證安裝
```bash
# 檢查憑證狀態
certbot certificates

# 測試 Nginx 配置
nginx -t

# 重新載入 Nginx
systemctl reload nginx
```

## 憑證管理

### 檢查憑證狀態
```bash
ssh root@104.199.235.223 "certbot certificates"
```

### 手動更新憑證
```bash
ssh root@104.199.235.223 "certbot renew"
```

### 測試自動更新
```bash
ssh root@104.199.235.223 "certbot renew --dry-run"
```

### 查看自動更新計時器狀態
```bash
ssh root@104.199.235.223 "systemctl status certbot.timer"
```

## Nginx 配置說明

SSL 設定後，Nginx 配置將包含：

### HTTP (Port 80)
- 自動重定向到 HTTPS

### HTTPS (Port 443)
- SSL/TLS 加密
- HTTP/2 支援
- 安全標頭（HSTS, X-Frame-Options 等）
- 反向代理到 Node.js 應用（Port 3000）

## 安全性增強

配置已包含以下安全措施：

1. **強制 HTTPS**
   - HTTP 自動重定向到 HTTPS
   - HSTS 標頭（防止降級攻擊）

2. **現代 TLS 協議**
   - 僅支援 TLS 1.2 和 1.3
   - 使用強加密套件

3. **安全標頭**
   - `Strict-Transport-Security` - 強制 HTTPS
   - `X-Frame-Options` - 防止點擊劫持
   - `X-Content-Type-Options` - 防止 MIME 類型嗅探
   - `X-XSS-Protection` - XSS 保護

## 憑證自動更新

Let's Encrypt 憑證有效期為 90 天，但會自動更新：

- **自動更新**：Certbot 計時器每天檢查兩次
- **更新時機**：憑證到期前 30 天自動更新
- **無需手動操作**：完全自動化

## 故障排除

### DNS 未生效
如果 DNS 還未指向伺服器，Certbot 會失敗。請確認：
```bash
nslookup hotel.cc-house.cc
```
應該返回 `104.199.235.223`

### 防火牆問題
確保端口 80 和 443 已開放：
```bash
# 檢查防火牆狀態
ufw status

# 如果需要開放端口
ufw allow 80/tcp
ufw allow 443/tcp
```

### Nginx 配置錯誤
檢查 Nginx 配置：
```bash
nginx -t
```

查看 Nginx 錯誤日誌：
```bash
tail -f /var/log/nginx/error.log
```

### 憑證獲取失敗
查看 Certbot 日誌：
```bash
tail -f /var/log/letsencrypt/letsencrypt.log
```

## 訪問您的網站

SSL 設定完成後：

- **HTTPS**：https://hotel.cc-house.cc
- **HTTP**：http://hotel.cc-house.cc （自動重定向到 HTTPS）
- **IP**：http://104.199.235.223 （仍可訪問，但建議使用域名）

## 憑證資訊

- **發行機構**：Let's Encrypt
- **憑證類型**：Domain Validation (DV)
- **有效期**：90 天
- **費用**：免費
- **自動更新**：是

## 更新應用程式配置

如果應用程式需要知道它運行在 HTTPS 下，可以更新 `.env`：

```env
NODE_ENV=production
SITE_URL=https://hotel.cc-house.cc
```

## 相關指令

```bash
# 查看所有憑證
certbot certificates

# 更新憑證
certbot renew

# 撤銷憑證
certbot revoke --cert-path /etc/letsencrypt/live/hotel.cc-house.cc/cert.pem

# 刪除憑證
certbot delete --cert-name hotel.cc-house.cc
```

## 支援

如有問題，請檢查：
1. DNS 設定是否正確
2. 防火牆是否允許 80 和 443 端口
3. Nginx 是否正常運行
4. Certbot 日誌中的錯誤訊息
