/*
const axios = require('axios');
const cheerio = require('cheerio');

// Fetches a URL and returns Cheerio-loaded HTML document
async function loadPage(url) {
  const response = await axios.get(url, { timeout: 10000 });
  return cheerio.load(response.data);
}

// Extract all JSON-LD structured data scripts from the page
function extractJsonLd($) {
  const jsonLdData = [];
  $('script[type="application/ld+json"]').each((i, element) => {
    try {
      const jsonText = $(element).html();
      const data = JSON.parse(jsonText);
      jsonLdData.push(data);
    } catch (e) {
      console.error('Error parsing JSON-LD:', e);
    }
  });
  return jsonLdData;
}

// Extract main textual content from the page (excluding headers/footers/nav)
function extractMainText($) {
  // Remove irrelevant sections (scripts, style, nav, footer, etc.)
  $('script, style, nav, header, footer').remove();
  let text = '';
  if ($('main').length > 0) {
    text = $('main').text();
  } else {
    text = $('body').text();
  }
  // Collapse whitespace and trim
  return text.replace(/\s+/g, ' ').trim();
}

// Scrape a page: returns an object with text content and JSON-LD data
async function scrapePage(url) {
  try {
    const $ = await loadPage(url);
    const jsonLd = extractJsonLd($);    // structured data (if any):contentReference[oaicite:3]{index=3}
    const textContent = extractMainText($);
    return {
      url,
      textContent,
      jsonLd   // array of JSON-LD objects (could be empty if none found)
    };
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error.message);
    return null;
  }
}

module.exports = { scrapePage };
*/



/*
// src/scrape.js
const axios = require('axios');
const cheerio = require('cheerio');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function loadPage(url) {
  const res = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*;q=0.8',
      Referer: 'https://www.google.com/'
    },
    // follow redirects by default
    maxRedirects: 5,
    validateStatus: s => s >= 200 && s < 400
  });
  return cheerio.load(res.data);
}

function extractJsonLd($) {
  const jsonLdData = [];
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const raw = $(el).contents().text().trim();
      if (!raw) return;
      // Some sites embed arrays or multiple objects; wrap parse in try/catch
      const parsed = JSON.parse(raw);
      jsonLdData.push(parsed);
    } catch {
      // ignore broken blocks
    }
  });
  return jsonLdData;
}

function extractMainText($) {
  $('script, style, nav, header, footer, noscript').remove();
  const root = $('main').length ? $('main') : $('body');
  return root.text().replace(/\s+/g, ' ').trim();
}

// --- Site-specific helpers (best-effort) ---
function sniffImage($, url) {
  // JSON-LD Person.image first
  const jld = extractJsonLd($).flat();
  const asArray = Array.isArray(jld) ? jld : [jld];
  for (const blk of asArray) {
    if (blk && blk['@type'] === 'Person' && blk.image) {
      if (typeof blk.image === 'string') return blk.image;
      if (blk.image?.contentUrl) return blk.image.contentUrl;
      if (Array.isArray(blk.image) && blk.image[0]?.contentUrl) return blk.image[0].contentUrl;
    }
  }

  // IMDb profile image
  if (/imdb\.com\/name\//i.test(url)) {
    const img = $('img.ipc-image').first().attr('src');
    if (img) return img;
  }

  // Wikipedia infobox image
  if (/wikipedia\.org\/wiki\//i.test(url)) {
    const img = $('table.infobox img').first().attr('src');
    if (img) return img.startsWith('http') ? img : `https:${img}`;
  }

  // LinkedIn public (very limited HTML); try og:image
  const og = $('meta[property="og:image"]').attr('content');
  if (og) return og;

  return null;
}

function sniffCredits($, url) {
  const credits = [];

  // IMDb: Known for tiles
  if (/imdb\.com\/name\//i.test(url)) {
    $('a[href*="/title/"]').each((_, el) => {
      const $el = $(el);
      const title = $el.text().trim();
      const href = $el.attr('href') || '';
      if (title && /\/title\/tt/.test(href)) {
        credits.push({
          '@type': 'CreativeWork',
          name: title,
          url: `https://www.imdb.com${href.split('?')[0]}`
        });
      }
    });
  }

  // Wikipedia: filmography tables (very rough)
  if (/wikipedia\.org\/wiki\//i.test(url)) {
    $('table.wikitable tr').each((_, tr) => {
      const cells = $(tr).find('td,th');
      if (cells.length >= 2) {
        const maybeYear = $(cells[0]).text().trim();
        const maybeTitle = $(cells[1]).text().trim();
        if (/\d{4}/.test(maybeYear) && maybeTitle) {
          credits.push({
            '@type': 'CreativeWork',
            name: maybeTitle,
            startDate: maybeYear
          });
        }
      }
    });
  }

  // LinkedIn doesn’t expose film credits; we’ll rely on Gemini + secondary sources.
  return dedupeCredits(credits).slice(0, 50);
}

function dedupeCredits(list) {
  const seen = new Set();
  const out = [];
  for (const it of list) {
    const key = (it.name || '') + '|' + (it.url || '') + '|' + (it.startDate || '');
    if (key.trim() && !seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  }
  return out;
}

// Main scrape function
async function scrapePage(url) {
  try {
    const $ = await loadPage(url);
    const jsonLd = extractJsonLd($);
    const textContent = extractMainText($);
    const image = sniffImage($, url);
    const credits = sniffCredits($, url);

    return {
      url,
      textContent,
      jsonLd,     // array
      image,      // string | null
      credits     // array of CreativeWork
    };
  } catch (err) {
    console.error(`Failed to scrape ${url}:`, err.message);
    return null;
  }
}

module.exports = { scrapePage };
*/
// src/scrape.js
const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function loadPage(url) {
  const res = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    // follow redirects by default
    maxRedirects: 5,
    validateStatus: (s) => s >= 200 && s < 400,
  });
  return cheerio.load(res.data);
}

function extractJsonLd($) {
  const out = [];
  $('script[type="application/ld+json"]').each((i, el) => {
    const raw = $(el).contents().text().trim();
    if (!raw) return;
    try {
      // pages sometimes have arrays or multiple objects in one tag
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch (_) {}
  });
  return out;
}

function extractMeta($) {
  const pick = (sel, attr) => ($(sel).attr(attr) || '').trim();
  return {
    ogTitle: pick('meta[property="og:title"]', 'content'),
    ogDesc: pick('meta[property="og:description"]', 'content'),
    ogImage: pick('meta[property="og:image"]', 'content'),
    twitterTitle: pick('meta[name="twitter:title"]', 'content'),
    twitterDesc: pick('meta[name="twitter:description"]', 'content'),
    twitterImage: pick('meta[name="twitter:image"]', 'content') || pick('meta[name="twitter:image:src"]', 'content'),
  };
}

function extractMainText($) {
  $('script, style, nav, header, footer, noscript').remove();
  const main = $('main').text() || $('article').text() || $('body').text();
  return (main || '').replace(/\s+/g, ' ').trim();
}

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

/* ---------- DOMAIN PARSERS ---------- */

// 1) LinkedIn public profile (best-effort for public, non-auth pages)
function parseLinkedInPublicProfile($, url, jsonLd, meta) {
  // LinkedIn public pages sometimes expose JSON-LD with Person
  let personBlock = jsonLd.find(j => (j['@type'] === 'Person' || (Array.isArray(j['@type']) && j['@type'].includes('Person'))));
  const image =
    (typeof personBlock?.image === 'string' && personBlock.image) ||
    personBlock?.image?.contentUrl ||
    meta.ogImage ||
    meta.twitterImage ||
    null;

  const name = personBlock?.name ||
    $('h1').first().text().trim() ||
    (meta.ogTitle || '').split(' - ')[0];

  // Headline and location hints
  const headline =
    personBlock?.jobTitle ||
    $('div.text-body-medium').first().text().trim() ||
    meta.ogDesc ||
    meta.twitterDesc ||
    '';

  return {
    source: 'linkedin',
    person: {
      name: name || null,
      image: image || null,
      jobTitle: headline || null,
      sameAs: [url],
    },
  };
}

// 2) IMDb filmography (credits)
function parseImdbNamePage($, url) {
  // IMDb has structured JSON in a big JS blob sometimes; we’ll also scrape visible filmography groups
  const credits = [];
  // Typical filmography sections have ids like #filmography, with category lists
  // We look for title columns + year + role
  $('[data-testid="filmography-section"] [data-testid="filmography-item"]').each((i, el) => {
    const $el = $(el);
    const title = $el.find('[data-testid="title"]').text().trim();
    const year = $el.find('[data-testid="year"]').text().trim();
    const role = $el.find('[data-testid="characters"]').text().trim();
    const type = $el.closest('[data-testid="filmography-section"]').find('h3').first().text().trim() || 'Credit';
    if (title) {
      credits.push({
        title,
        year: year || null,
        role: role || null,
        department: type || null,
        url: $el.find('a[href*="/title/"]').attr('href') ? new URL($el.find('a[href*="/title/"]').attr('href'), 'https://www.imdb.com').toString() : null,
        type: null,
      });
    }
  });

  // Fallback: older markup
  if (!credits.length) {
    $('#filmography .filmo-row').each((i, el) => {
      const $el = $(el);
      const title = $el.find('b a').text().trim();
      const year = $el.find('.year_column').text().trim();
      const role = $el.text().split('...')[1]?.trim() || '';
      const dept = $el.attr('id')?.split('-')[0] || 'Credit';
      if (title) {
        credits.push({
          title,
          year: year || null,
          role: role || null,
          department: dept,
          url: $el.find('b a').attr('href') ? new URL($el.find('b a').attr('href'), 'https://www.imdb.com').toString() : null,
          type: null,
        });
      }
    });
  }

  return { source: 'imdb', credits };
}

// 3) Wikipedia filmography/basic credits
function parseWikipediaPersonPage($, url) {
  const credits = [];
  // Try tables with caption "Filmography" / "Selected filmography"
  $('table.wikitable').each((i, table) => {
    const $table = $(table);
    const caption = $table.find('caption').text().toLowerCase();
    if (caption.includes('filmography')) {
      const headers = [];
      $table.find('th').each((i, th) => headers.push($(th).text().trim().toLowerCase()));
      $table.find('tr').each((i, tr) => {
        const tds = $(tr).find('td');
        if (!tds.length) return;
        const row = tds.map((i, td) => $(td).text().trim()).get();
        // naive mapping: year | title | role
        const year = row[0] || null;
        const title = row[1] || null;
        const role = row[2] || null;
        if (title) {
          // attempt to get link
          const linkEl = $(tr).find('td a[href^="/wiki/"]').first();
          const link = linkEl.length ? new URL(linkEl.attr('href'), 'https://en.wikipedia.org').toString() : null;
          credits.push({
            title,
            year,
            role,
            department: null,
            url: link,
            type: null,
          });
        }
      });
    }
  });

  // Try infobox image/name too
  const image =
    $('table.infobox a.image img').attr('src') ? `https:${$('table.infobox a.image img').attr('src')}` : null;

  const name =
    $('h1#firstHeading').text().trim() ||
    $('table.infobox caption').first().text().trim() ||
    null;

  return { source: 'wikipedia', credits, person: { name, image } };
}

/* ---------- MAIN SCRAPE ---------- */

async function scrapePage(url) {
  try {
    const d = domainOf(url);
    const $ = await loadPage(url);
    const jsonLd = extractJsonLd($);
    const meta = extractMeta($);
    const textContent = extractMainText($);

    const domainHints = { domain: d, isLinkedIn: d.includes('linkedin.com'), isImdb: d.includes('imdb.com'), isWikipedia: d.includes('wikipedia.org') };
    const extracted = {};

    if (domainHints.isLinkedIn) Object.assign(extracted, parseLinkedInPublicProfile($, url, jsonLd, meta));
    if (domainHints.isImdb) Object.assign(extracted, parseImdbNamePage($, url));
    if (domainHints.isWikipedia) Object.assign(extracted, parseWikipediaPersonPage($, url));

    return { url, textContent, jsonLd, meta, domainHints, extracted };
  } catch (e) {
    console.error(`Failed to scrape ${url}: ${e.message}`);
    return null;
  }
}

module.exports = { scrapePage };
