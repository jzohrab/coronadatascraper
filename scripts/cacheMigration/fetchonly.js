/** TEMP SCRIPT ONLY. */

const imports = require('esm')(module);

const { join } = imports('path');

delete process.env.USE_OLD_DATETIME;

const src = join(__dirname, '..', '..', 'src');
const argv = imports(join(src, 'shared/cli/cli-args.js')).default;
const clearAllTimeouts = imports(join(src, 'shared/utils/timeouts.js')).default;
const fetchSources = imports(join(src, 'events/crawler/get-sources/index.js')).default;
const scrapeData = imports(join(src, 'events/crawler/scrape-data/index.js')).default;
const datetime = imports(join(src, 'shared/lib/datetime/index.js')).default;

/** Fetch and scrape the data only.
 * temp file to extract data only.
 */
async function fetchAndScrape(date, options = {}) {
  options = { findFeatures: true, findPopulations: true, writeData: true, ...options };

  // JSON used for reporting
  const report = {
    date: date || datetime.getYYYYMD()
  };

  // Crawler
  const output = await fetchSources({ date, report, options }).then(scrapeData);
  return output;
}

fetchAndScrape(argv.date, argv)
  .then(clearAllTimeouts)
  .catch(e => {
    clearAllTimeouts();
    throw e;
  });
