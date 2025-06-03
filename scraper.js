/**
 * Scrapes Jeopardy! game data by season from j-archive.com and saves it to a JSON file.
 *
 * - Fetches all season links from the main season list.
 * - For each season, retrieves game details (game_id, show_number, air_date, season).
 * - Merges new data with existing JSON, deduplicates by game_id, and sorts by show_number.
 * - Skips abnormal or already-scraped seasons.
 *
 * Dependencies: axios, cheerio, fs
 *
 * @fileoverview Scrapes and stores Jeopardy! game metadata by season.
 */
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const OUTPUT_FILE = 'games_list.json';
const BASE_URL = 'http://www.j-archive.com';

async function getSeasonLinks() {
  const res = await axios.get(`${BASE_URL}/listseasons.php`);
  const $ = cheerio.load(res.data);
  return $('td a')
    .map((i, el) => $(el).attr('href'))
    .get()
    .filter(href => href.startsWith('showseason'));
}

/**
 * Fetches and parses a list of games from a given season page URL.
 *
 * Uses axios to retrieve the HTML content and cheerio to parse it.
 * Extracts game information from anchor tags with hrefs starting with "showgame.php".
 *
 * @async
 * @function fetchGamesFromSeason
 * @param {string} url - The  URL of the season page (e.g., "showseason.php?season=1").
 * @returns {Promise<Array<{game_id: number, show_number: number, air_date: string}>>} 
 *  Resolves to an array of game objects with game_id, show_number, and air_date.
 */
async function getGamesBySeason(url) {
  const res = await axios.get(`${BASE_URL}/${url}`);
  const $ = cheerio.load(res.data);
  const games = [];
  const seasonMatch = url.match(/season=(\d+)/);
  let seasonNumber = seasonMatch[1];

  // make it a number, if possible
  if (!isNaN(Number(seasonNumber))) {
    seasonNumber = Number(seasonNumber);
  }

  $('td a[href^="showgame.php"]').each((i, el) => {
    const text = $(el).text();
    const href = $(el).attr('href');

    // Extracts the game ID from the href query string: 
    const gameIdMatch = href.match(/game_id=(\d+)/);
    // Extracts the show number, which appears after a '#'
    const showMatch = text.match(/#(\d+)/);

    // Extracts the air date in YYYY-MM-DD format
    const dateMatch = text.match(/aired\s*(\d{4}-\d{2}-\d{2})/);

    if (gameIdMatch && showMatch && dateMatch) {
      games.push({
        game_id: parseInt(gameIdMatch[1]),
        show_number: parseInt(showMatch[1]),
        air_date: dateMatch[1],
        season: seasonNumber
      });
    }
  });

  return games;
}

async function update() {
  let existing = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    } catch {
      console.warn('⚠️ Failed to parse existing JSON. Starting fresh.');
    }
  }

  // Ensure existing data is sorted by show_number
  let lastSeason = 1;
  if (existing.length > 0) {
    lastSeason = existing[existing.length - 1].season
  }

  const allGames = [];
  let seasonLinks = await getSeasonLinks();

  // remove abnormal jeopardy seasons and 
  // skip seasons before the last one scraped
  // make sure always scrape the last season
  seasonLinks = seasonLinks.filter(str => {
    val = Number(str.split("=")[1]);
    if (isNaN(val) || val < lastSeason)
      // skip seasons that are not numbers 
      // or before the last scraped season
      return false;
    else
      return true;
  });


  for (const link of seasonLinks) {
    const games = await getGamesBySeason(link);
    allGames.push(...games);
    console.log(`Scraped ${link} (${games.length} games)`);
  }

  const merged = [...existing, ...allGames];
  // create a mapping to overwrite duplicates from the merged array
  // extract the values since were keep the array sorted by show number
  const deduped = Array.from(new Map(merged.map(item => [item.game_id, item])).values());
  deduped.sort((a, b) => a.show_number - b.show_number);


  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(deduped, null, 2));
  console.log(`✅ Done! Saved ${deduped.length} games to ${OUTPUT_FILE}`);
}

update();
