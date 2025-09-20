// src/pipeline.js
/*
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



// src/pipeline.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { scrapePage } = require('./scrape');
const { generateInitialProfile, refineProfile } = require('./geminiClient');
const { searchPerson } = require('./searchClient');
const { ensureArrays, buildCreditsFromScrapes, mergeUniqueByKey } = require('./extractors');

function shortenNameForQuery(name = '') {
  const cleaned = name.replace(/[“”"']/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.split(' ').slice(0, 3).join(' ');
}

async function runPipeline(profileUrl, industryContext) {
  // 1) Scrape grounding link (supports IMDb/Wikipedia/LinkedIn)
  const primaryData = await scrapePage(profileUrl);
  if (!primaryData) throw new Error('Failed to scrape primary profile page');

  // 2) Initial Person JSON
  const initialProfile = await generateInitialProfile(primaryData, industryContext);
  if (!initialProfile || typeof initialProfile !== 'object') {
    throw new Error('Initial profile generation returned no JSON');
  }

  // 3) Brave search with lean query
  const shortName = shortenNameForQuery((initialProfile.name || '').trim());
  const searchQuery = [shortName, industryContext].filter(Boolean).join(' ');
  const searchResults = await searchPerson(searchQuery, profileUrl);

  // 4) Scrape secondary sources
  const secondaryDataList = [];
  for (const r of searchResults) {
    const page = await scrapePage(r.url);
    if (page) secondaryDataList.push(page);
  }
 
  // 5) Refine & merge
  let finalProfile = await refineProfile(initialProfile, secondaryDataList, industryContext);
  if (!finalProfile || typeof finalProfile !== 'object') {
    throw new Error('Refinement returned no JSON');
  }

  // If image is missing but we scraped one from the primary page, inject it
  if (!finalProfile.image && primaryData.image) {
    finalProfile.image = primaryData.image;
  }

  // Save a convenience copy (as before)
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
*/

// src/pipeline.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { scrapePage } = require('./scrape');
const { generateInitialProfile, refineProfile } = require('./geminiClient');
const { searchPerson } = require('./searchClient');
const { ensureArrays, buildCreditsFromScrapes, mergeUniqueByKey } = require('./extractors');

function shortenNameForQuery(name = '') {
  const cleaned = name.replace(/[“”"']/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.split(' ').slice(0, 3).join(' ');
}

async function runPipeline(profileUrl, industryContext) {
  if (!profileUrl || !industryContext) {
    throw new Error('profileUrl and industryContext are required');
  }

  // 1) Scrape grounding link (supports IMDb/Wikipedia/LinkedIn)
  const primaryData = await scrapePage(profileUrl);
  if (!primaryData) throw new Error('Failed to scrape primary profile page');

  // 2) Initial Person JSON (ask LLM to include custom arrays in geminiClient prompts)
  const initialProfile = await generateInitialProfile(primaryData, industryContext);
  if (!initialProfile || typeof initialProfile !== 'object') {
    throw new Error('Initial profile generation returned no JSON');
  }

  // 3) Brave search with lean query
  const shortName = shortenNameForQuery((initialProfile.name || '').trim());
  const searchQuery = [shortName, industryContext].filter(Boolean).join(' ').trim();
  if (!searchQuery) throw new Error('Empty search query computed from initial profile/name');

  const searchResults = await searchPerson(searchQuery, profileUrl);

  // 4) Scrape secondary sources
  const secondaryDataList = [];
  for (const r of searchResults) {
    const page = await scrapePage(r.url);
    if (page) secondaryDataList.push(page);
  }

  // ---- 4.5) LOCAL PASS: build credits/projects deterministically from all scrapes ----
  const scrapedAll = [primaryData, ...secondaryDataList].filter(Boolean);
  const local = buildCreditsFromScrapes(scrapedAll); // { credits:[], projects:[] }

  // 5) Refine with LLM (will also try to populate credits/projects/episodes/engagements)
  let finalProfile = await refineProfile(initialProfile, secondaryDataList, industryContext);
  if (!finalProfile || typeof finalProfile !== 'object') {
    throw new Error('Refinement returned no JSON');
  }

  // 5.5) Merge LOCAL → FINAL (dedupe)
  ensureArrays(finalProfile);
  finalProfile.credits  = mergeUniqueByKey(finalProfile.credits,  local.credits,  'title');
  finalProfile.projects = mergeUniqueByKey(finalProfile.projects, local.projects, 'name');

  // If image missing but scraped one from primary page, inject it
  if (!finalProfile.image && primaryData.image) {
    finalProfile.image = primaryData.image;
  }

  // 6) Save to file
  const outPath = path.resolve(process.cwd(), 'profile.json');
  fs.writeFileSync(outPath, JSON.stringify(finalProfile, null, 2));

  return {
    finalProfile,
    savedTo: outPath,
    stats: {
      secondarySourcesFound: searchResults.length,
      secondarySourcesScraped: secondaryDataList.length,
      localCredits: local.credits.length,
      localProjects: local.projects.length,
    },
  };
}

module.exports = { runPipeline };
