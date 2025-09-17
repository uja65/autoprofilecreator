
# Auto Profile Creator

An **AI-powered profile builder** that scrapes public profile pages (Wikipedia, IMDb, LinkedIn if public), enriches them with **Brave Search** results, and synthesizes a structured **`schema.org/Person` JSON** using Google’s **Gemini LLM**.

The result: a **comprehensive, machine-readable profile** including name, bio, works, awards, links, and even a profile photo (if available).

---

## ✨ Features

- **Web scraping** with [Axios](https://github.com/axios/axios) + [Cheerio](https://cheerio.js.org/)  
- **Initial profile generation** via [Gemini](https://ai.google.dev/) (`@google/genai`)  
- **Secondary enrichment** using [Brave Search API](https://brave.com/search/api/)  
- **Profile refinement** with Gemini → structured **schema.org/Person JSON**  
- **Frontend UI** (static HTML/CSS/JS) + **Express backend** API  
- **Downloadable profile.json** (client-side generated)  
- Runs both as:
  - 🌐 **Web app** (via Express server or Vercel deploy)  
  - 💻 **CLI tool** (`node src/index.js "<url>" "<industry>"`)  

---

## 📂 Project Structure

auto-profile-creator/
├── public/ # Frontend (index.html + styles + JS)
├── src/
│ ├── pipeline.js # Orchestrates scraping + LLM + search
│ ├── scrape.js # Scraper (Axios + Cheerio)
│ ├── geminiClient.js # Gemini API integration
│ ├── searchClient.js # Brave API integration
│ └── index.js # CLI entry point
├── server.js # Express server (serves UI + /api/run)
├── package.json
└── .env # API keys (not committed)

---

## ⚙️ Setup

1. **Clone repo**
   ```bash
   git clone https://github.com/<your-username>/auto-profile-creator.git
   cd auto-profile-creator
Install deps


npm install
Environment variables
Create a .env file:


GEMINI_API_KEY=your_gemini_key
BRAVE_SEARCH_API_KEY=your_brave_key
PORT=3000

🚀 Run locally
Web app

npm start
Visit http://localhost:3000 → enter a profile URL + industry → generate JSON.

CLI

npm run cli "https://en.wikipedia.org/wiki/Emma_Watson" "film"
Outputs profile.json locally.

☁️ Deploy to Vercel
Push project to GitHub.

In Vercel Dashboard, click New Project → Import repo.

Add env vars under Settings → Environment Variables:

GEMINI_API_KEY

BRAVE_SEARCH_API_KEY

Deploy → get live URL:


https://auto-profile-creator-yourname.vercel.app

🛠️ Tech Stack

Node.js + Express

Axios + Cheerio (scraping)

@google/genai (Gemini LLM API)

Brave Search API

HTML/CSS/Vanilla JS frontend

Vercel (deployment)

📌 Roadmap

 Add caching of scraped results

 Improve LinkedIn fallback → auto-resolve to Wikipedia/IMDb

 Extend to other creative domains (music, books, games)

 Add small metrics dashboard (sources, latency, token cost)

⚠️ Notes

LinkedIn often blocks scraping. Resolver fallback is recommended.

Vercel functions are ephemeral → client-side JSON download implemented.

LLM prompts enforce JSON output with responseMimeType: "application/json".
