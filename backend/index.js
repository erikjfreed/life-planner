const express = require('express');
const cors = require('cors');
const db = require('./database');
const { computeTimeline } = require('./compute');
const DEFAULT_PARAMS = require('./defaultParams');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Load parameters from DB, falling back to defaults
function loadParams() {
  const rows = db.prepare('SELECT key, value FROM parameters').all();
  const stored = Object.fromEntries(rows.map(r => [r.key, JSON.parse(r.value)]));
  return { ...DEFAULT_PARAMS, ...stored };
}

// GET /api/parameters
app.get('/api/parameters', (req, res) => {
  res.json(loadParams());
});

// POST /api/parameters — update one or more parameters
app.post('/api/parameters', (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO parameters (key, value) VALUES (?, ?)');
  const upsertMany = db.transaction((updates) => {
    for (const [key, value] of Object.entries(updates)) {
      if (key in DEFAULT_PARAMS) {
        upsert.run(key, JSON.stringify(value));
      }
    }
  });
  upsertMany(req.body);
  res.json(loadParams());
});

// GET /api/timeline — compute from current parameters
app.get('/api/timeline', (req, res) => {
  const params = loadParams();
  const rows = computeTimeline(params);
  res.json(rows);
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
