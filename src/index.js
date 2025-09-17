// src/index.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { scrapePage } = require('./scrape');
const { generateInitialProfile, refineProfile } = require('./geminiClient');
const { searchPerson } = require('./searchClient');

// ---- CLI args ----
const [,, profileUrl, industryContext] = process.argv;
if (!profileUrl || !industryContext) {
  console.error('Usage: node src/index.js "<profile_url>" "<industry_context>"');
  process.exit(1);
}

// ---- Helpers ----
function shortenNameForQuery(name = '') {
  // Trim, collapse spaces, drop quotes/smart quotes, keep first 2–3 tokens
  const cleaned = name
    .replace(/[“”"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tokens = cleaned.split(' ').filter(Boolean);
  return tokens.slice(0, 3).join(' ');
}

(async () => {
  try {
    console.log(`🔍 Scraping primary profile: ${profileUrl}`);

    // Step 2: Scrape grounding link
    const primaryData = await scrapePage(profileUrl);
    if (!primaryData) {
      throw new Error('Failed to scrape the primary profile page.');
    }

    // Step 3: Generate initial profile with Gemini
    const initialProfile = await generateInitialProfile(primaryData, industryContext);
    if (!initialProfile || typeof initialProfile !== 'object') {
      throw new Error('Initial profile generation returned no JSON.');
    }
    console.log('✅ Initial profile generated from primary source.');

    // ---- REWRITTEN SECTION: Build a lean Brave query ----
    // Prefer the model-provided name; fall back to parsing from URL if missing
    const rawName = (initialProfile.name || '').trim();
    const shortName = shortenNameForQuery(rawName);
    // High-signal, compact query: "<shortName> <industry>"
    const searchQuery = [shortName, industryContext]
      .filter(Boolean)
      .join(' ')
      .trim();

    console.log(`🌐 Searching Brave for: ${searchQuery || '(empty query!)'}`);
    if (!searchQuery) {
      throw new Error('Empty search query computed from initial profile/name.');
    }

    // Step 4–5: Brave search + filtering
    const searchResults = await searchPerson(searchQuery, profileUrl);
    console.log(`🔗 Found ${searchResults.length} secondary sources.`);

    // Step 6: Scrape each secondary source
    const secondaryDataList = [];
    for (const res of searchResults) {
      console.log(`📄 Scraping secondary source: ${res.url}`);
      const data = await scrapePage(res.url);
      if (data) secondaryDataList.push(data);
    }
    console.log(`✅ Scraped ${secondaryDataList.length} secondary sources.`);

    // Step 7: Refine profile with Gemini
    const finalProfile = await refineProfile(initialProfile, secondaryDataList, industryContext);
    if (!finalProfile || typeof finalProfile !== 'object') {
      throw new Error('Refinement returned no JSON.');
    }
    console.log('✨ Final enriched profile generated.');

    // Step 8: Save to file (ensure output dir)
    const outPath = path.resolve(process.cwd(), 'profile.json');
    fs.writeFileSync(outPath, JSON.stringify(finalProfile, null, 2));
    console.log(`💾 Enriched profile saved to ${outPath}`);
  } catch (err) {
    console.error('❌ Error:', err?.message || err);
    process.exit(1);
  }
})();
