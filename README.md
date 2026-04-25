# 🐍 霓虹貪食蛇 v6 — 賽博朋克多關卡版

## 遊戲特色
- 🌆 三個完全不同的關卡，每到200分自動換關
- 🗺️ 不同形狀邊界（矩形 → 六角形 → 菱形）
- 🧱 第2、3關有牆壁障礙
- ⭐ 道具系統：無敵(穿越自己)、雙倍分數、炸彈(踩到即死)
- 🔊 Web Audio 音效
- 🏆 PostgreSQL 永久排行榜

## 本地開發

```bash
npm install
npm start
# 開啟 http://localhost:3000
# （未設定 DATABASE_URL 會使用記憶體排行榜）
```

## 部署到 Render（含 PostgreSQL）

### 方法一：render.yaml 一鍵部署（推薦）
1. 推送到 GitHub
2. 登入 [render.com](https://render.com)
3. 點 **New → Blueprint**
4. 連結 repo → 點 **Apply**
5. Render 會自動建立 Web Service + PostgreSQL 資料庫並設定連線

### 方法二：手動設定
1. 先建立 PostgreSQL：**New → PostgreSQL** → 免費方案
2. 再建立 Web Service：
   - Build Command: `npm install`
   - Start Command: `npm start`
3. 在 Web Service 的 **Environment** 加入：
   - Key: `DATABASE_URL`
   - Value: 從 PostgreSQL 頁面複製「Internal Database URL」

## 關卡說明
| 關卡 | 名稱 | 邊界形狀 | 速度 |
|------|------|---------|------|
| 第1關 | 霓虹都市 | 矩形 | 正常 |
| 第2關 | 深淵廢墟 | 六角形 | 較快 |
| 第3關 | 星際核心 | 菱形 | 快速 |

## 道具說明
| 道具 | 效果 | 持續時間 |
|------|------|---------|
| ★ 無敵 | 可穿越自己身體 | 約7秒 |
| ✦ 雙倍 | 食物分數 x2 | 約7秒 |
| ✸ 炸彈 | 踩到立即死亡 | 自然消失 |
