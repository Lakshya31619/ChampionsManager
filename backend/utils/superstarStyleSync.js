const axios = require('axios');

const ALL_SUPERSTARS_URL = 'https://prod-api-new.wwechampions.com/superstar-guide/superstars/all';

let styleCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetches all superstars and returns a map of ID/groupId to playStyle.
 */
const fetchStyleMap = async () => {
  const now = Date.now();
  if (styleCache && (now - lastFetchTime < CACHE_TTL)) {
    return styleCache;
  }

  try {
    console.log('Fetching superstar style data from WWE API (paginated)...');
    const perPage = 30;
    let skip = 0;
    let allData = [];
    let hasMore = true;

    while (hasMore) {
      const url = `${ALL_SUPERSTARS_URL}?perPage=${perPage}&skip=${skip}`;
      console.log(`Fetching page: skip=${skip}...`);
      const response = await axios.get(url);
      
      const pageData = response.data && response.data.data ? response.data.data : [];
      if (pageData.length === 0) {
        hasMore = false;
      } else {
        allData = allData.concat(pageData);
        skip += perPage;
        
        // If we got fewer than perPage, it's likely the last page
        if (pageData.length < perPage) {
          hasMore = false;
        }
      }

      // Safety break to prevent infinite loops in case of API oddities
      if (skip > 2000) {
        console.warn('Reached safety limit for superstar style pagination.');
        hasMore = false;
      }
    }

    const map = {};
    allData.forEach(s => {
      const style = s.playStyle;
      if (style) {
        if (s.groupId) map[s.groupId] = style;
        if (s.superstarId) map[String(s.superstarId)] = style;
      }
    });

    styleCache = map;
    lastFetchTime = now;
    console.log(`Cached styles for ${Object.keys(map).length} superstar IDs from ${allData.length} entries.`);
    return map;
  } catch (error) {
    console.error('Error fetching superstar styles:', error.message);
    return styleCache || {}; // Return stale cache if available
  }
};

/**
 * Resolves the style for a given wrestler ID.
 */
const getStyleForWrestler = async (wrestlerId) => {
  const map = await fetchStyleMap();
  const style = map[wrestlerId];
  
  // Ensure the style matches our enum: Chaotic, Aggressive, Defensive, Focused
  const STYLE_OPTIONS = ['Chaotic', 'Aggressive', 'Defensive', 'Focused'];
  if (STYLE_OPTIONS.includes(style)) {
    return style;
  }
  
  return null;
};

module.exports = {
  fetchStyleMap,
  getStyleForWrestler
};
