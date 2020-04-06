// Crawler operations
import fetchSources from '../events/crawler/get-sources/index.js';
import scrapeData from '../events/crawler/scrape-data/index.js';

// Metadata + geo processing operations
import rateSources from '../events/processor/rate-sources/index.js';
import dedupeLocations from '../events/processor/dedupe-locations/index.js';
import reportScrape from '../events/processor/report/index.js';
import findFeatures from '../events/processor/find-features/index.js';
import findPopulations from '../events/processor/find-populations/index.js';
import transformIds from '../events/processor/transform-ids/index.js';
import cleanLocations from '../events/processor/clean-locations/index.js';
import writeData from '../events/processor/write-data/index.js';
import datetime from './lib/datetime/index.js';

/** Filter all sources (scrapers) on version. */
async function filterSources(args, sourceVersion = '') {
  args.sources = args.sources.filter(s => (s.scraperType || '') === sourceVersion);
  console.log(`For version = "${sourceVersion}", count = ${args.sources.length}`);
  return args;
}

/**
 * Entry file while we're still hosted on GitHub
 */
async function generate(date, options = {}) {
  options = { findFeatures: true, findPopulations: true, writeData: true, ...options };

  if (date) {
    process.env.SCRAPE_DATE = date;
  } else {
    delete process.env.SCRAPE_DATE;
  }

  if (options.quiet) {
    process.env.LOG_LEVEL = 'off';
  }

  // JSON used for reporting
  const report = {
    date: date || datetime.getYYYYMD()
  };

  // Crawler
  const output = await fetchSources({ date, report, options })
    .then(args => filterSources(args, ''))
    .then(scrapeData)
    // processor
    .then(rateSources)
    .then(dedupeLocations)
    .then(reportScrape)
    .then(options.findFeatures !== false && findFeatures)
    .then(options.findPopulations !== false && findPopulations)
    .then(transformIds)
    .then(cleanLocations)
    .then(options.writeData !== false && writeData); // To be retired

  return output;
}

export default generate;

//////////////////////////////////////////////////////////
// Cache.

/** POC cache, save data.
 * (*) scraper - the scraper object
 * (*) date - the date of the fetch from sources
 * (*) sources - array of sources, with methods, urls, and cache keys:
 *     [
 *       { url: 'url', type: 'page', cacheKey: 'A' },
 *       { url: 'url', type: 'json', cacheKey: 'B' },
 *       ...
 *     ]
 *     This is an array because each of these sources must be downloaded and
 *     saved for the dataset to be complete, otherwise the save should
 *     throw an exception and the downloaded files should be discarded.
 */
export async function saveMultiple(scraper, date, sources) {
  // Scraper is passed so that we can get the correct cache folder.
  // cacheDate should be the same for all files pulled from sources, saved
  // into same folder.
  console.log(scraper.sourcecodepath);
}

/** POC cache, save data.
 * could be combined with 'saveMultiple' above ... impl. detail.
 */
export async function savePage(scraper, url) {
  // Scraper is passed so that we can get the correct cache folder.
  console.log(scraper.sourcecodepath);
}

/** POC cache.
 * Gets the latest complete data set for a scraper.
 * Returns the data set, and the date:
 * returns: {
 *   cacheDate: latest date time before or equal to date.
 *   data: {
 *      'A': await, reads the source file
 *      'B': await, reads source file as json
 *      ...
 *   }
 */
export async function latestDatasetAsAt(scraper, date) {
  // Search the cache for the scraper to get the latest data set.
  // load all file read promises, return data.  
}

//////////////////////////////////
// Crawling

/** The crawl.
 * This method never throws, it logs exceptions.
 */
export async function crawlData(args) {
  args.sources.forEach(s => {
    /*
      // Get the latest crawler entry from s.crawler ...
      const crawlSpecs = s.crawlerAsAt(args.crawlDate);
     
      // execute the crawl:
      try {
        cache.saveMultiple(s, args.crawlDate, crawlSpecs);
      } catch(err) {
        logError(err);
      }
    */
  });
}

/** Entry point, crawl. */
export async function crawl(date, options = {}) {
  options = { findFeatures: true, findPopulations: true, writeData: true, ...options };

  if (date) {
    process.env.SCRAPE_DATE = date;
  } else {
    delete process.env.SCRAPE_DATE;
  }

  if (options.quiet) {
    process.env.LOG_LEVEL = 'off';
  }

  // JSON used for reporting
  const report = {
    date: date || datetime.getYYYYMD()
  };

  // Crawler
  await fetchSources({ date, report, options })
    .then(args => filterSources(args, 'crawl-and-scrape'))
    .then(crawlData);
}


//////////////////////////////////
// Scraping

/** The scrape.
 * This method never throws, it logs exceptions.
 */
export async function scrapeCache(args) {
  args.sources.forEach(s => {
    /*
      // Get the latest data set for this scraper
      const cached = cache.latestDatasetAsAt(scraper, args.scrapedate)
     
      const cachedDataSetDate = cached.cacheDate;
     
      const scraper = getBestScraperFor(cached.cacheDate);

      try {
        scraper(cached.data);
      } catch (err) {
        // This _should_ never happen.  All scrapers
        // should always work with all cached data.
      }
    */
  });
}

/** Entry point, scrape. */
export async function scrape(date, options = {}) {
  options = { findFeatures: true, findPopulations: true, writeData: true, ...options };

  if (date) process.env.SCRAPE_DATE = date;
  else delete process.env.SCRAPE_DATE;

  if (options.quiet) process.env.LOG_LEVEL = 'off';

  const report = { date: date || datetime.getYYYYMD() };

  // Scrape and report
  await fetchSources({ date, report, options })
    .then(args => filterSources(args, 'crawl-and-scrape'))
    .then(scrapeCache);
    // etc.
}
