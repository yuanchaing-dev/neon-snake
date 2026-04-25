const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── PostgreSQL 連線 ───────────────────────────────────────────────────
// 在 Render 上設定環境變數 DATABASE_URL 即可自動連線
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : null;

// 初始化資料庫表格
async function initDB() {
  if (!pool) {
    console.log('⚠️  未設定 DATABASE_URL，使用記憶體排行榜');
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        name VARCHAR(20) NOT NULL,
        score INTEGER NOT NULL,
        stage INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ 資料庫已就緒');
  } catch (err) {
    console.error('❌ 資料庫初始化失敗:', err.message);
  }
}

// 記憶體備援
let memLeaderboard = [];

// ─── Middleware ────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ─── API: 取得排行榜 ───────────────────────────────────────────────────
app.get('/api/leaderboard', async (req, res) => {
  if (!pool) {
    return res.json(memLeaderboard.slice(0, 10));
  }
  try {
    const result = await pool.query(
      'SELECT name, score, stage FROM leaderboard ORDER BY score DESC LIMIT 10'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('查詢排行榜失敗:', err.message);
    res.status(500).json({ error: '資料庫錯誤' });
  }
});

// ─── API: 提交分數 ─────────────────────────────────────────────────────
app.post('/api/leaderboard', async (req, res) => {
  const { name, score, stage } = req.body;
  if (!name || typeof score !== 'number') {
    return res.status(400).json({ error: '資料格式錯誤' });
  }
  const safeName = String(name).slice(0, 20).trim() || '匿名玩家';
  const safeScore = Math.max(0, Math.floor(score));
  const safeStage = Math.max(1, Math.floor(stage || 1));

  if (!pool) {
    memLeaderboard.push({ name: safeName, score: safeScore, stage: safeStage });
    memLeaderboard.sort((a, b) => b.score - a.score);
    memLeaderboard = memLeaderboard.slice(0, 10);
    return res.json({ success: true });
  }
  try {
    await pool.query(
      'INSERT INTO leaderboard (name, score, stage) VALUES ($1, $2, $3)',
      [safeName, safeScore, safeStage]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('寫入排行榜失敗:', err.message);
    res.status(500).json({ error: '資料庫錯誤' });
  }
});

// ─── 啟動 ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🐍 霓虹貪食蛇 v2 啟動於 http://localhost:${PORT}`);
  });
});
