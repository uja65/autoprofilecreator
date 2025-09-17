// src/pipeline.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { scrapePage } = require('./scrape');
const { generateInitialProfile, refineProfile } = require('./geminiClient');
const { searchPerson } = require('./searchClient');

function shortenNameForQuery(name = '') {
  const cleaned = name
    .replace(/[“”"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tokens = cleaned.split(' ').filter(Boolean);
  return tokens.slice(0, 3).join(' ');
}

async function runPipeline(profileUrl, industryContext) {
  if (!profileUrl || !industryContext) {
    throw new Error('profileUrl and industryContext are required');
  }

  // Step 2: Scrape grounding link
  const primaryData = await scrapePage(profileUrl);
  if (!primaryData) throw new Error('Failed to scrape primary profile page');

  // Step 3: Initial profile via Gemini
  const initialProfile = await generateInitialProfile(primaryData, industryContext);
  if (!initialProfile || typeof initialProfile !== 'object') {
    throw new Error('Initial profile generation returned no JSON');
  }

  // Build lean Brave query
  const shortName = shortenNameForQuery((initialProfile.name || '').trim());
  const searchQuery = [shortName, industryContext].filter(Boolean).join(' ').trim();
  if (!searchQuery) throw new Error('Empty search query computed from initial profile/name');

  // Step 4–5: Brave search + filtering
  const searchResults = await searchPerson(searchQuery, profileUrl);

  // Step 6: Scrape secondary sources
  const secondaryDataList = [];
  for (const res of searchResults) {
    const data = await scrapePage(res.url);
    if (data) secondaryDataList.push(data);
  }

  // Step 7: Refine with Gemini
  const finalProfile = await refineProfile(initialProfile, secondaryDataList, industryContext);
  if (!finalProfile || typeof finalProfile !== 'object') {
    throw new Error('Refinement returned no JSON');
  }

  // Step 8: Save to file
  const outPath = path.resolve(process.cwd(), 'profile.json');
  fs.writeFileSync(outPath, JSON.stringify(finalProfile, null, 2));

  return {
    finalProfile,
    savedTo: outPath,
    stats: {
      secondarySourcesFound: searchResults.length,
      secondarySourcesScraped: secondaryDataList.length
    }
  };
}

module.exports = { runPipeline };
