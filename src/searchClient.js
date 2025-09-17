// src/searchClient.js
const axios = require('axios');

/**
 * Normalize a name/industry query into something Brave will accept.
 * - No quotes
 * - ASCII-only fallback
 * - Max ~120 chars
 */
function normalizeQuery(q) {
  if (!q) return '';
  // remove smart quotes / quotes
  q = q.replace(/[“”"']/g, ' ');
  // collapse whitespace
  q = q.replace(/\s+/g, ' ').trim();
  // hard cap length (Brave can choke on very long queries)
  if (q.length > 120) q = q.slice(0, 120);
  // basic ASCII fallback if needed
  return q.normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
}

async function callBrave(q, count = 20) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) throw new Error('BRAVE_SEARCH_API_KEY not set');

  const url = 'https://api.search.brave.com/res/v1/web/search';
  const params = { q, count: Math.min(Math.max(parseInt(count, 10) || 10, 1), 20) };

  const res = await axios.get(url, {
    params,
    headers: {
      'X-Subscription-Token': apiKey,
      'Accept': 'application/json',
      'User-Agent': 'AutoProfileCreator/1.0 (+https://risidio.example)'
    },
    timeout: 15000,
    validateStatus: () => true // we will handle non-2xx explicitly
  });

  if (res.status === 200) return res.data;
  const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data || {});
  throw new Error(`Brave ${res.status}: ${body.slice(0, 400)}`);
}

/**
 * Search for secondary sources about the person.
 * - Cleans query
 * - Retries with a fallback query if 422
 * - Filters out original domain + duplicates
 */
async function searchPerson(rawQuery, originalUrl) {
  // 1) primary normalized query
  let q = normalizeQuery(rawQuery);
  if (!q) throw new Error('Empty search query after normalization');

  let data;
  try {
    data = await callBrave(q, 20);
  } catch (err) {
    // 422 often due to odd characters or query structure; fallback to simpler query
    if (String(err.message).includes('Brave 422')) {
      const simpleQ = normalizeQuery(q.split(' ').slice(0, 3).join(' ')); // keep first 2-3 tokens
      data = await callBrave(simpleQ, 10);
    } else {
      throw err;
    }
  }

  const results = (data && data.web && Array.isArray(data.web.results)) ? data.web.results : [];
  let originalHost;
  try { originalHost = new URL(originalUrl).hostname.replace(/^www\./, ''); } catch {}

  const seen = new Set();
  const filtered = [];

  for (const r of results) {
    const url = r.url || r.link;
    if (!url) continue;

    // filter same domain as the grounding link
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      if (originalHost && host.includes(originalHost)) continue;
    } catch {}

    if (seen.has(url)) continue;
    seen.add(url);

    filtered.push({
      title: r.title || '',
      url,
      description: r.description || r.snippet || ''
    });
  }
  return filtered;
}

module.exports = { searchPerson };
