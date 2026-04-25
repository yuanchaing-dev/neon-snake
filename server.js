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

    // 舊版資料表若已存在，CREATE TABLE IF NOT EXISTS 不會自動補欄位。
    // 這裡補上必要欄位，避免 Render / PostgreSQL 舊資料庫寫入分數失敗。
    await pool.query(`
      ALTER TABLE leaderboard
      ADD COLUMN IF NOT EXISTS stage INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leaderboard_score_created_at
      ON leaderboard (score DESC, created_at ASC);
    `);

    dbReady = true;
    console.log('✅ 資料庫已就緒');
  } catch (err) {
    dbReady = false;
    console.error('❌ 資料庫初始化失敗，改用記憶體排行榜:', err.message);
  }
}

// 記憶體備援
// 用途：
// 1. 本機或 Render 未設定 DATABASE_URL 時，仍可使用排行榜。
// 2. PostgreSQL 寫入暫時失敗時，仍先讓玩家本次分數出現在排行榜，避免前端看起來像沒有上傳。
let memLeaderboard = [];
let dbReady = false;

function normalizeEntry(entry) {
  return {
    name: String(entry.name || '').slice(0, 20).trim() || '匿名玩家',
    score: Math.max(0, Math.floor(Number(entry.score) || 0)),
    stage: Math.max(1, Math.floor(Number(entry.stage) || 1)),
    created_at: entry.created_at || new Date().toISOString()
  };
}

function sortLeaderboard(rows) {
  return rows
    .map(normalizeEntry)
    .sort((a, b) => b.score - a.score || new Date(a.created_at) - new Date(b.created_at))
    .slice(0, 10);
}

function addMemoryScore(entry) {
  memLeaderboard = sortLeaderboard([...memLeaderboard, entry]);
}

function getMemoryLeaderboard() {
  return sortLeaderboard(memLeaderboard);
}

function mergeLeaderboard(dbRows = []) {
  // DB 可讀但 DB 寫入失敗時，memLeaderboard 內的本次分數也要顯示出來。
  return sortLeaderboard([...dbRows, ...memLeaderboard]);
}

// ─── Middleware ────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ─── API: 取得排行榜 ───────────────────────────────────────────────────
async function getLeaderboardRows() {
  if (!pool || !dbReady) {
    return getMemoryLeaderboard();
  }

  try {
    const result = await pool.query(
      'SELECT name, score, COALESCE(stage, 1) AS stage, created_at FROM leaderboard ORDER BY score DESC, created_at ASC LIMIT 10'
    );
    return mergeLeaderboard(result.rows);
  } catch (err) {
    console.error('查詢排行榜失敗，改用記憶體排行榜:', err.message);
    return getMemoryLeaderboard();
  }
}

app.get(['/api/leaderboard', '/api/scores'], async (req, res) => {
  const rows = await getLeaderboardRows();
  res.set('Cache-Control', 'no-store');
  res.json(rows);
});

// ─── API: 提交分數 ─────────────────────────────────────────────────────
app.post(['/api/leaderboard', '/api/scores'], async (req, res) => {
  const { name, score, stage } = req.body;
  const numericScore = Number(score);
  const numericStage = Number(stage || 1);

  if (!Number.isFinite(numericScore)) {
    return res.status(400).json({ success: false, error: '分數格式錯誤' });
  }

  const entry = normalizeEntry({
    name,
    score: numericScore,
    stage: Number.isFinite(numericStage) ? numericStage : 1
  });

  if (!pool || !dbReady) {
    addMemoryScore(entry);
    return res.json({ success: true, entry, storage: 'memory', leaderboard: getMemoryLeaderboard() }); // FIXED: 上傳後直接回傳右側排行榜資料
  }

  try {
    await pool.query(
      'INSERT INTO leaderboard (name, score, stage) VALUES ($1, $2, $3)',
      [entry.name, entry.score, entry.stage]
    );
    const leaderboard = await getLeaderboardRows(); // FIXED: 讀取寫入後的同一份排行榜資料
    res.json({ success: true, entry, storage: 'database', leaderboard });
  } catch (err) {
    // 不讓玩家端直接失敗；但必須留下 warning，方便 Render Logs 追查真正 DB 問題。
    console.error('寫入排行榜失敗，改寫入記憶體排行榜:', err.message);
    addMemoryScore(entry);
    res.json({
      success: true,
      entry,
      storage: 'memory-fallback',
      leaderboard: await getLeaderboardRows(), // FIXED: 備援時也回傳包含本次成績的排行榜
      warning: '資料庫暫時無法寫入，已使用記憶體排行榜備援'
    });
  }
});

// ─── API: 健康檢查 ───────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    databaseConfigured: Boolean(pool),
    databaseReady: dbReady,
    memoryScores: memLeaderboard.length
  });
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
