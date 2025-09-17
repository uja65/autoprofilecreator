// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const { runPipeline } = require('./src/pipeline');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// API to run pipeline
app.post('/api/run', async (req, res) => {
  try {
    const { url, industry } = req.body || {};
    if (!url || !industry) {
      return res.status(400).json({ error: 'Missing url or industry' });
    }
    const result = await runPipeline(url, industry);
    return res.json(result); // includes finalProfile, savedTo, stats
  } catch (e) {
    console.error('Pipeline error:', e);
    return res.status(500).json({ error: e?.message || 'Internal Error' });
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Web server running at http://localhost:${PORT}`);
});
