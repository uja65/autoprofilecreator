                                        Auto Profile Creator

Auto Profile Creator is a Node.js + Express application that scrapes public profile pages (Wikipedia, IMDb, LinkedIn if public), enriches them with additional data via the Brave Search API, and synthesizes a structured schema.org/Person JSON using Google’s Gemini LLM.
It provides both a simple web UI (served from /public/index.html) and a CLI, letting you input a profile URL and an industry (e.g., “film”) to generate a comprehensive machine-readable profile including name, bio, works, awards, links, and image if available. 
The project uses Axios + Cheerio for scraping, Gemini (@google/genai) for LLM integration, and Express for routing, with results downloadable as profile.json. To run locally, clone the repo, install dependencies (npm install), add a .env file with GEMINI_API_KEY and BRAVE_SEARCH_API_KEY, then start with npm start and visit http://localhost:3000
, or run the CLI with npm run cli "<url>" "<industry>".
