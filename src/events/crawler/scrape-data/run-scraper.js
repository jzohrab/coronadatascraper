import datetime from '../../../shared/lib/datetime/index.js';
import reporter from '../../../shared/lib/error-reporter.js';
import * as geography from '../../../shared/lib/geography/index.js';
import log from '../../../shared/lib/log.js';

// import { calculateScraperTz } from '../../../shared/lib/geography/timezone.js';

const numericalValues = ['cases', 'tested', 'recovered', 'deaths', 'active'];

/** Check if the provided data contains any invalid fields.
 * @param {any[]} data
 */
function isValid(data) {
  for (const [prop, value] of Object.entries(data)) {
    if (value === null) {
      throw new Error(`Invalid data: ${prop} is null`);
    }
    if (Number.isNaN(value)) {
      throw new Error(`Invalid data: ${prop} is not a number`);
    }
  }

  for (const prop of numericalValues) {
    if (data[prop] !== undefined && typeof data[prop] !== 'number') {
      throw new Error(`Invalid data: ${prop} is not a number`);
    }
  }

  return true;
}

/*
  Add output data to the cases array, input must be an object
*/
function processData(cases, location, data) {
  const caseInfo = { ...location, ...data };

  /*
  if (datetime.scrapeDate()) {
    // This must come from cache
    // caseInfo.collectedDate = datetime.scrapeDate();
  }
  else {
    // Add collection date as current UTC time
    // Even this is likely wrong -- it's gotta be cache aware
    caseInfo.collectedDate = (new Date()).toISOString();
  }
  */

  cases.push(caseInfo);
}

/*
  Add output data to the cases array. Input can be either an object or an array
*/
function addData(cases, location, result) {
  if (Array.isArray(result)) {
    if (result.length === 0) {
      throw new Error(`Invalid data: scraper for ${geography.getName(location)} returned 0 rows`);
    }
    for (const data of result) {
      if (isValid(data)) {
        processData(cases, location, data);
      }
    }
  } else if (isValid(result)) {
    processData(cases, location, result);
  }
}

/*
  Run the correct scraper for this location
*/
export async function runScraper(location) {
  const rejectUnauthorized = location.certValidation === false;
  if (rejectUnauthorized) {
    // Important: this prevents SSL from failing
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  // scraperTz will be used by the cache PR
  // eslint-disable-next-line no-unused-vars
  // const scraperTz = await calculateScraperTz(location);

  if (typeof location.scraper === 'function') {
    return location.scraper();
  }
  if (rejectUnauthorized) {
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  }
  if (typeof location.scraper === 'object') {
    // Find the closest date
    let env;
    if (process.env.SCRAPE_DATE) env = datetime.parse(process.env.SCRAPE_DATE);
    const targetDate = env || datetime.getDate();

    let scraperToUse = null;
    for (const [date, scraper] of Object.entries(location.scraper)) {
      if (datetime.dateIsBeforeOrEqualTo(date, targetDate)) {
        scraperToUse = scraper;
      }
    }
    if (scraperToUse === null) {
      throw new Error(
        `Could not find scraper for ${geography.getName(location)} at ${
          process.env.SCRAPE_DATE
        }, only have: ${Object.keys(location.scraper).join(', ')}`
      );
    }
    return scraperToUse.call(location);
  }

  throw new Error('Why on earth is the scraper for %s a %s?', geography.getName(location), typeof scraper);
}

// TODO - likely need to have mutex for shared structs location, errors
const runScraperRecordErrors = async (locations, location, errors) => {
  try {
    const data = await runScraper(location);
    // TODO - mutex this?
    // TODO - move this out -- separate running the scraper and fetching
    // the data to processing the data.
    addData(locations, location, data);
  } catch (err) {
    log.error('  ❌ Error processing %s: ', geography.getName(location), err);

    // TODO - mutex this?
    // TODO - move this out as well -- this method should return [ result, error ],
    // and then the post-processing could iterate through that.
    errors.push({
      name: geography.getName(location),
      url: location.url,
      type: err.name,
      err: err.toString()
    });

    reporter.logError('scraper failure', 'scraper failed', err.toString(), 'critical', location);
  }
};

const runScrapers = async args => {
  const { sources } = args;

  const locationsWithScrapers = sources.filter(loc => loc.scraper);

  const locations = [];
  const errors = [];

  // Hack shortcut.
  // return { ...args, locations, scraperErrors: errors };

  const numLocations = locationsWithScrapers.length;
  const batchSize = 50;
  for (let i = 0; i < numLocations; i += batchSize) {
    const requests = locationsWithScrapers
      .slice(i, i + batchSize)
      .map(location => runScraperRecordErrors(locations, location, errors));
    await Promise.all(requests).catch(e => console.log(`Error processing batch ${i} - ${e}`));
  }

  return { ...args, locations, scraperErrors: errors };
};

export default runScrapers;
