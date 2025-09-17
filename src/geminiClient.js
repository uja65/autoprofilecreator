
const { GoogleGenAI } = require('@google/genai');

// client api initilisation 
const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * initial Person profile JSON from primary page data.
 * @param {Object} primaryData - { url, textContent, jsonLd }
 * @param {String} industry - Industry context for the person.
 * @returns {Object} Parsed JSON profile.
 */
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
 */
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
