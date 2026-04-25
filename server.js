const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// In-memory leaderboard (resets on server restart)
// For persistent storage on Render, consider using a database
let leaderboard = [];

app.get('/api/leaderboard', (req, res) => {
  res.json(leaderboard.slice(0, 10));
});

app.post('/api/leaderboard', (req, res) => {
  const { name, score } = req.body;
  if (!name || typeof score !== 'number') {
    return res.status(400).json({ error: 'Invalid data' });
  }
  const entry = { name: name.slice(0, 12), score, date: new Date().toISOString() };
  leaderboard.push(entry);
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10);
  res.json({ success: true, rank: leaderboard.findIndex(e => e === entry) + 1 });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🐍 Neon Snake running on http://localhost:${PORT}`);
});
