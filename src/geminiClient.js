/*
const { GoogleGenAI } = require('@google/genai');

// client api initilisation 
const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * initial Person profile JSON from primary page data.
 * @param {Object} primaryData - { url, textContent, jsonLd }
 * @param {String} industry - Industry context for the person.
 * @returns {Object} Parsed JSON profile.
 
async function generateInitialProfile(primaryData, industry) {
  // Construct the prompt with available data
  let prompt = `You are an AI that generates profiles in schema.org Person format.\n`;
  if (primaryData.jsonLd && primaryData.jsonLd.length > 0) {
    prompt += `Here is structured data from the page:\n${JSON.stringify(primaryData.jsonLd, null, 2)}\n`;
  }
  prompt += `Here is the text from the profile page:\n"""${primaryData.textContent}"""\n`;
  prompt += `The person works in the ${industry} industry.\n`;
  prompt += `Based on all the above information, output a JSON object following schema.org Person schema with relevant fields filled in (name, jobTitle, worksFor, alumniOf, birthDate, description, etc.). Do NOT include any extra explanation, only output the JSON.`;

  // Gemini API to generate JSON output
  const response = await aiClient.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  // Parse the JSON text returned by Gemini
  return JSON.parse(response.text);
}

/**
 * Refine the profile by merging information from multiple sources.
 * @param {Object} initialProfile - JSON object from initial profile.
 * @param {Array} secondaryDataList - Array of { url, textContent, jsonLd } from secondary sources.
 * @param {String} industry - Industry context.
 * @returns {Object} Final enriched profile JSON.
 
async function refineProfile(initialProfile, secondaryDataList, industry) {
  // Build prompt with initial profile and additional info from sources
  let prompt = `You are an AI that merges information into a schema.org Person profile.\n`;
  prompt += `Here is an initial profile in JSON:\n${JSON.stringify(initialProfile, null, 2)}\n`;
  prompt += `Additional information from various sources about this person:\n`;
  secondaryDataList.forEach((item, index) => {
    prompt += `Source ${index+1} (${item.url}) says: """${item.textContent}"""\n`;
  });
  prompt += `\nUsing all the above, update and complete the Person JSON profile. Include all relevant fields (e.g., name, jobTitle, worksFor, alumniOf, birthDate, awards, description, sameAs URLs, etc.) populated with information from the sources. Resolve any conflicting data by using the most reliable source. Output only the updated JSON.`;

  const response = await aiClient.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  return JSON.parse(response.text);
}

module.exports = { generateInitialProfile, refineProfile };

 */
// src/geminiClient.js
// src/geminiClient.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash'; // safe default
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function safeJson(text) {
  try { return JSON.parse(text); } catch {}
  // fallback: try to parse from first '{'
  const i = text.indexOf('{');
  if (i >= 0) {
    try { return JSON.parse(text.slice(i)); } catch {}
  }
  return null;
}
function personPrompt(primaryData, industryContext) {
  const jld = JSON.stringify(primaryData.jsonLd || []);
  const txt = (primaryData.textContent || '').slice(0, 12000);
  const scrapedImage = primaryData.image || null;
  const scrapedCredits = JSON.stringify(primaryData.credits || []);

  return `
You are an AI Data Extraction and Synthesis Agent that outputs ONLY a single JSON object in the schema.org Person format.

Industry context: "${industryContext}"
Primary page URL: ${primaryData.url}

Structured JSON-LD blocks:
${jld}

Raw text (truncated):
${txt}

Scraped hints:
- image: ${scrapedImage || 'null'}
- credits (CreativeWork[]): ${scrapedCredits}

REQUIREMENTS:
- Return ONE JSON object following schema.org/Person.
- Populate: name, description, jobTitle, image (URL), sameAs (include LinkedIn/Wikipedia/IMDb), performerIn (credits as CreativeWork with name, startDate, url if available), worksFor/affiliation, knowsAbout, award (when found).
- If unknown, use null or [] appropriately.

ADDITIONALLY include the following custom arrays as top-level keys (next to Person fields). If a value is not found, return an empty array:
- "projects": [{ "name": string, "year": string|null, "url": string|null, "role": string|null, "department": string|null, "status": string|null, "description": string|null, "episodes": [] }]
- "episodes": [{ "name": string|null, "seriesName": string|null, "season": number|null, "episode": number|null, "year": string|null, "url": string|null, "role": string|null, "department": string|null, "engagements": [] }]
- "engagements": [{ "type": string|null, "title": string|null, "organization": string|null, "date": string|null, "summary": string|null, "url": string|null }]
- "credits": [{ "title": string, "year": string|null, "url": string|null, "role": string|null, "department": string|null, "type": string|null }]

OUTPUT:
- Output ONLY a single JSON object with Person fields (e.g., "@context", "@type", "name", "image", etc.) AND these arrays at the top level.
`;
}
function refinePrompt(initialProfile, secondaryData, industryContext) {
  const secText = secondaryData
    .map((d, i) => `#${i + 1} ${d.url}\n${(d.textContent || '').slice(0, 8000)}`)
    .join('\n\n');

  const hints = {
    secondaryCredits: secondaryData.flatMap(d => d.credits || []),
    secondaryImages: secondaryData.map(d => d.image).filter(Boolean),
    urls: secondaryData.map(d => d.url)
  };

  return `
You update a schema.org Person JSON to be MORE COMPLETE. Output ONLY the final Person JSON.
Industry context: "${industryContext}"

Base JSON (trust unless clearly improved):
${JSON.stringify(initialProfile)}

Secondary scraped text (truncated):
${secText}

Hints:
${JSON.stringify(hints)}

Rules:
- Keep "@context":"https://schema.org" and "@type":"Person".
- Merge "sameAs" (dedupe).
- Merge "performerIn" with new credits (dedupe by name+url+startDate).
- Prefer valid/high-res image URLs.
- No hallucination; if unsure, leave null/[].

### IMPORTANT: Also populate and MERGE the custom arrays: projects, episodes, engagements, credits.
- Merge by name/title (case-insensitive). Deduplicate.
- Prefer structured sources (JSON-LD, infoboxes).
- Preserve existing entries but enrich missing fields (e.g., add {year, role, department, url}).
- If a project clearly belongs to a TV series with numbered episodes, add episodes under the project with {seriesName, season, episode, year, url}.
- Keep arrays at the top level of the returned object.

Return ONLY JSON.
`;
}


/*
function personPrompt(primaryData, industryContext) {
  const jld = JSON.stringify(primaryData.jsonLd || []);
  const txt = (primaryData.textContent || '').slice(0, 12000);
  const scrapedImage = primaryData.image || null;
  const scrapedCredits = JSON.stringify(primaryData.credits || []);

  return `
You are an AI Data Extraction and Synthesis Agent that outputs ONLY a single JSON object in the schema.org Person format.

Industry context: "${industryContext}"
Primary page URL: ${primaryData.url}

Structured JSON-LD blocks:
${jld}

Raw text (truncated):
${txt}

Scraped hints:
- image: ${scrapedImage || 'null'}
- credits (CreativeWork[]): ${scrapedCredits}

REQUIREMENTS:
- Return ONE JSON object following schema.org/Person.
- Populate: name, description, jobTitle, image (URL), sameAs (include LinkedIn/Wikipedia/IMDb), performerIn (credits as CreativeWork with name, startDate, url if available), worksFor/affiliation, knowsAbout, award (when found).
- If unknown, use null or [] appropriately.
- Output ONLY JSON.
`;
}

function refinePrompt(initialProfile, secondaryData, industryContext) {
  const secText = secondaryData
    .map((d, i) => `#${i + 1} ${d.url}\n${(d.textContent || '').slice(0, 8000)}`)
    .join('\n\n');

  const hints = {
    secondaryCredits: secondaryData.flatMap(d => d.credits || []),
    secondaryImages: secondaryData.map(d => d.image).filter(Boolean),
    urls: secondaryData.map(d => d.url)
  };

  return `
You update a schema.org Person JSON to be MORE COMPLETE. Output ONLY the final Person JSON.

Industry context: "${industryContext}"

Base JSON (trust unless clearly improved):
${JSON.stringify(initialProfile)}

Secondary scraped text (truncated):
${secText}

Hints:
${JSON.stringify(hints)}

Rules:
- Keep "@context":"https://schema.org" and "@type":"Person".
- Merge "sameAs" (dedupe).
- Merge "performerIn" with new credits (dedupe by name+url+startDate).
- Prefer valid/high-res image URLs.
- No hallucination; if unsure, leave null/[].
Return ONLY JSON.
`;
}
*/
async function generateInitialProfile(primaryData, industryContext) {
  const model = genAI.getGenerativeModel({ model: MODEL });
  const resp = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: personPrompt(primaryData, industryContext) }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });
  const text = resp?.response?.text() || '';
  return safeJson(text);
}

async function refineProfile(initialProfile, secondaryData, industryContext) {
  const model = genAI.getGenerativeModel({ model: MODEL });
  const resp = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: refinePrompt(initialProfile, secondaryData, industryContext) }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });
  const text = resp?.response?.text() || '';
  return safeJson(text);
}

module.exports = { generateInitialProfile, refineProfile };
