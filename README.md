# 🐍 NEON SNAKE — Cyberpunk Edition

霓虹賽博朋克風貪食蛇遊戲，Node.js + Express 後端。

## 功能
- 🎮 經典貪食蛇遊戲邏輯
- 🌆 霓虹賽博朋克視覺風格（掃描線、網格、粒子效果）
- 🔊 Web Audio API 音效（吃食物、死亡、移動）
- 🏆 排行榜（Top 10，伺服器端儲存）
- 📱 手機 D-pad 觸控支援

## 本地開發

```bash
npm install
npm start
# 開啟 http://localhost:3000
```

## 部署到 Render

### 方法一：使用 render.yaml（推薦）
1. 把此專案推送到 GitHub / GitLab
2. 登入 [render.com](https://render.com)
3. 點 **New → Blueprint**
4. 連結你的 repo，Render 會自動讀取 `render.yaml`
5. 點 **Apply** 完成 🎉

### 方法二：手動建立
1. 登入 [render.com](https://render.com)
2. 點 **New → Web Service**
3. 連結你的 GitHub repo
4. 設定：
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. 點 **Create Web Service**

## 注意事項
- 排行榜資料目前存在記憶體中，Render 免費方案每次重啟會清空
- 如需永久儲存，可串接 Render 的 PostgreSQL 或 Redis 服務

## 操控方式
| 鍵位 | 功能 |
|------|------|
| ↑↓←→ / WASD | 移動 |
| SPACE | 暫停 |
| R | 重新開始 |
| 手機 D-pad | 觸控移動 |
