// src/model.js  (NEW - optional helper to centralize shapes)

/**
 * @typedef Project
 * { name, year, url, role, department, status, description, episodes: Episode[] }
 *
 * @typedef Episode
 * { name, seriesName, season, episode, year, url, role, department, engagements: Engagement[] }
 *
 * @typedef Engagement
 * { type, title, organization, date, summary, url }
 *
 * @typedef Credit
 * { title, year, url, role, department, type } // type: Movie | TVSeries | Short | VideoGame...
 */

function emptyProfileExtensions() {
  return {
    projects: [],
    episodes: [],
    engagements: [],
    credits: [],
  };
}

module.exports = { emptyProfileExtensions };
