
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
