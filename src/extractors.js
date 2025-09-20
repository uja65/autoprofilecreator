// src/extractors.js
/*const { emptyProfileExtensions } = require('./model');

function ensureArrays(person) {
  person.projects = Array.isArray(person.projects) ? person.projects : [];
  person.episodes = Array.isArray(person.episodes) ? person.episodes : [];
  person.engagements = Array.isArray(person.engagements) ? person.engagements : [];
  person.credits = Array.isArray(person.credits) ? person.credits : [];
  return person;
}

function mergeUniqueByKey(list, items, key) {
  const seen = new Set(list.map(x => x[key]).filter(Boolean));
  items.forEach(x => {
    const k = x[key];
    if (!k || !seen.has(k)) { list.push(x); if (k) seen.add(k); }
  });
  return list;
}

/**
 * Consume an array of { url, extracted } from scrapePage and build:
 * - credits[]
 * - projects[] (with year/role when derivable)
 
function buildCreditsFromScrapes(scrapedList) {
  const out = emptyProfileExtensions();
  scrapedList.forEach(s => {
    if (!s || !s.extracted) return;
    // IMDb credits
    if (s.extracted.source === 'imdb' && Array.isArray(s.extracted.credits)) {
      // push into credits
      out.credits = mergeUniqueByKey(out.credits, s.extracted.credits.map(c => ({
        title: c.title || null,
        year: c.year || null,
        url: c.url || null,
        role: c.role || null,
        department: c.department || null,
        type: c.type || null,
      })), 'title');
      // also mirror to projects (one project per title)
      const projects = s.extracted.credits
        .filter(c => c.title)
        .map(c => ({
          name: c.title,
          year: c.year || null,
          url: c.url || null,
          role: c.role || null,
          department: c.department || null,
          status: null,
          description: null,
          episodes: [],
        }));
      out.projects = mergeUniqueByKey(out.projects, projects, 'name');
    }

    // Wikipedia credits
    if (s.extracted.source === 'wikipedia' && Array.isArray(s.extracted.credits)) {
      out.credits = mergeUniqueByKey(out.credits, s.extracted.credits.map(c => ({
        title: c.title || null,
        year: c.year || null,
        url: c.url || null,
        role: c.role || null,
        department: c.department || null,
        type: c.type || null,
      })), 'title');

      const projects = s.extracted.credits
        .filter(c => c.title)
        .map(c => ({
          name: c.title,
          year: c.year || null,
          url: c.url || null,
          role: c.role || null,
          department: c.department || null,
          status: null,
          description: null,
          episodes: [],
        }));
      out.projects = mergeUniqueByKey(out.projects, projects, 'name');
    }
  });

  return out;
}

module.exports = { ensureArrays, buildCreditsFromScrapes, mergeUniqueByKey };
*/
// src/extractors.js

// Ensure the top-level arrays exist on the Person object
// src/extractors.js
const { emptyProfileExtensions } = require('./model');

// ---------- small helpers ----------
function ensureArrays(person) {
  person.projects     = Array.isArray(person.projects) ? person.projects : [];
  person.episodes     = Array.isArray(person.episodes) ? person.episodes : [];
  person.engagements  = Array.isArray(person.engagements) ? person.engagements : [];
  person.credits      = Array.isArray(person.credits) ? person.credits : [];
  return person;
}

function mergeUniqueByKey(list, items, key) {
  const seen = new Set(list.map(x => x && x[key]).filter(Boolean));
  for (const x of items || []) {
    const k = x && x[key];
    if (!k || !seen.has(k)) {
      list.push(x);
      if (k) seen.add(k);
    }
  }
  return list;
}

// Normalize a value to an array
const arr = (v) => (Array.isArray(v) ? v : (v == null ? [] : [v]));

// ---------- JSON-LD traversal & extraction ----------
/**
 * Walk a JSON-LD blob (object or array) and return an array of CreativeWork-like items
 * We consider @type including CreativeWork, Movie, TVSeries, TVEpisode, VideoObject, etc.
 */
function extractCreativeWorksFromJsonLd(jsonLd) {
  const out = [];

  const queue = Array.isArray(jsonLd) ? jsonLd.slice() : [jsonLd];
  const pushCW = (node) => {
    const title =
      node?.name ??
      node?.headline ??
      node?.alternateName ??
      null;

    const url = node?.url ?? null;

    // best-effort year
    const year =
      (node?.datePublished || node?.dateCreated || '')
        .toString()
        .match(/\b(19|20)\d{2}\b/)?.[0] || null;

    const typeVal = arr(node?.['@type']);
    const type =
      typeVal.find(Boolean) ||
      null;

    out.push({ title, year, url, role: null, department: null, type });
  };

  while (queue.length) {
    const b = queue.shift();
    if (!b) continue;

    if (Array.isArray(b)) {
      queue.push(...b);
      continue;
    }

    if (typeof b === 'object') {
      // If it's a CreativeWork-ish node, collect it
      const types = arr(b?.['@type']).map(String);
      const isCW =
        types.includes('CreativeWork') ||
        types.some((t) =>
          ['Movie', 'TVSeries', 'TVEpisode', 'VideoObject', 'MovieSeries', 'Episode'].includes(t)
        );

      if (isCW) pushCW(b);

      // Dive into @graph if present
      if (Array.isArray(b?.['@graph'])) queue.push(...b['@graph']);

      // Dive into other object/array fields
      for (const v of Object.values(b)) {
        if (v && (typeof v === 'object')) queue.push(v);
      }
    }
  }

  return out;
}

/**
 * Build local (deterministic) credits & projects from scraped list.
 * Accepts: [{ url, textContent, jsonLd, extracted }, ...]
 * Returns: { credits: [], projects: [] }
 */
function buildCreditsFromScrapes(scrapedList = []) {
  const out = emptyProfileExtensions();

  for (const s of scrapedList) {
    if (!s) continue;

    // 1) Prefer site-specific extracted credits if your scrape() produced them
    if (s.extracted && Array.isArray(s.extracted.credits)) {
      // credits
      mergeUniqueByKey(
        out.credits,
        s.extracted.credits.map((c) => ({
          title: c.title || null,
          year: c.year || null,
          url: c.url || null,
          role: c.role || null,
          department: c.department || null,
          type: c.type || null,
        })),
        'title'
      );

      // mirror to projects
      const projects = s.extracted.credits
        .filter((c) => c.title)
        .map((c) => ({
          name: c.title,
          year: c.year || null,
          url: c.url || null,
          role: c.role || null,
          department: c.department || null,
          status: null,
          description: null,
          episodes: [],
        }));
      mergeUniqueByKey(out.projects, projects, 'name');
      continue; // skip to next page
    }

    // 2) Otherwise, attempt generic JSON-LD scan for CreativeWorks
    if (Array.isArray(s.jsonLd) && s.jsonLd.length) {
      let cw = [];
      for (const block of s.jsonLd) {
        if (!block) continue;
        cw = cw.concat(extractCreativeWorksFromJsonLd(block));
      }

      if (cw.length) {
        // credits
        mergeUniqueByKey(
          out.credits,
          cw.map((c) => ({
            title: c.title,
            year: c.year,
            url: c.url,
            role: c.role || null,
            department: c.department || null,
            type: c.type || null,
          })),
          'title'
        );

        // projects (mirrored unique by name)
        const projects = cw
          .filter((c) => c.title)
          .map((c) => ({
            name: c.title,
            year: c.year,
            url: c.url,
            role: c.role || null,
            department: c.department || null,
            status: null,
            description: null,
            episodes: [],
          }));

        mergeUniqueByKey(out.projects, projects, 'name');
      }
    }

    // (Optional) You could add a very light heuristic on textContent here to pull "Filmography" tables, etc.
  }

  return out;
}

module.exports = {
  ensureArrays,
  mergeUniqueByKey,
  buildCreditsFromScrapes,
};

