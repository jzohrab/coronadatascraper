/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require  */
/* eslint-disable no-use-before-define */

const imports = require('esm')(module);
const { join } = require('path');
const test = require('tape');
const fastGlob = require('fast-glob');
const path = require('path');
const fsBuiltIn = require('fs');

const fs = imports(join(process.cwd(), 'src', 'shared', 'lib', 'fs.js'));
const runScraper = imports(join(process.cwd(), 'src', 'events', 'crawler', 'scrape-data', 'run-scraper.js'));
const sanitize = imports(join(process.cwd(), 'src', 'shared', 'lib', 'sanitize-url.js'));
const get = imports(join(process.cwd(), 'src', 'shared', 'lib', 'fetch', 'get.js'));

// GO THROUGH THIS WHILE FIXING
const SLICE_START = 4;

// import { looksLike } from '../../lib/iso-date.js';
const looksLike = {
  isoDate: s => /^\d{4}-\d{2}-\d{2}$/.test(s) // YYYY-DD-MM
};

// jest.mock('../../lib/fetch/get.js');

// This suite automatically tests a scraper's results against its test cases. To add test coverage for
// a scraper, see https://github.com/lazd/coronadatascraper/blob/master/docs/sources.md#testing-sources

// Utility functions

// e.g. `/coronadatascraper/src/shared/scrapers/USA/AK/tests` 🡒 `USA/AK`
const testdir = join(process.cwd(), 'tests', 'integration', 'scrapers', 'testcache');

// Splits folder path, returns hash.
// e.g. 'X/Y/2020-03-04' => { scraperName: 'X/Y', date: '2020-03-04' }
function scraperNameAndDateFromPath(s) {
  const parts = s.replace(`${testdir}${path.sep}`, '').split(path.sep);
  const scraper_name = parts.filter(s => !looksLike.isoDate(s)).join(path.sep);
  const dt = parts.filter(s => looksLike.isoDate(s));
  const date = dt.length === 0 ? null : dt[0];
  const ret = { scraperName: scraper_name, date: date };
  return ret;
}

// Remove geojson from scraper result
const stripFeatures = d => {
  delete d.feature;
  return d;
};

const testDirs = fastGlob.
      sync(join(testdir, '**'), { onlyDirectories: true }).
      filter(s => /\d{4}-\d{2}-\d{2}$/.test(s)).
      slice(SLICE_START, SLICE_START + 1);
console.log(testDirs);

// ONLY DOING ONE OF THEM

const scrapersAndDates = testDirs.map(s => scraperNameAndDateFromPath(s));
// console.log(scrapersAndDates);


const scraperSourcePathRoot = join(__dirname, '..', '..', '..', 'src', 'shared', 'scrapers');

test('Parsers', async t => {
  t.plan(testDirs.length);
  testDirs.forEach(async d => {

    const pair = scraperNameAndDateFromPath(d);
    const sname = pair.scraperName;
    const date = pair.date;
    const spath = join(scraperSourcePathRoot, sname, 'index.js');

    console.log(`******** TEST ${sname} ON ${date} ********************`);

    // Read sample responses for this scraper and pass them to the mock `get` function.
    const sampleResponses = fastGlob.sync(join(d, '*')).filter(p => !p.includes('expected'));
    console.log(sampleResponses);

    let getReturns = {}
    for (const filePath of sampleResponses) {
      // MAGIC HERE:
      // The filenames are stored as the sanitized-url values.
      const sanitizedURL = path.basename(filePath);
      const content = await fs.readFile(filePath);
      getReturns[sanitizedURL] = content.toString();
    }

    console.log("Fake returns and data sizes:");
    console.log("{");
    Object.keys(getReturns).forEach(k => {
      console.log("  " + k + ": " + getReturns[k].length);
    });
    console.log("}");
    
    get.get = async (url, type, date, options) => {
      console.log("CALLING FOR " + url);
      const sanurl = sanitize.sanitizeUrl(url);
      console.log("SANITIZED: " + sanurl);
      const ret = getReturns[sanurl];
      console.log("DO WE HAVE RET?" + (ret !== null && ret !== undefined));
      if (ret === null || ret === undefined) {
        console.log(`${sname}/${date}: missing data ${sanurl}`);
      }
      return ret;
    };

    const expected = await fs.readJSON(join(d, 'expected.json'));
    
    const scraperObj = imports(spath).default;
    process.env.SCRAPE_DATE = date;

    let result = null;
    try {
      console.log(`SCRAPING FOR ${sname} ON ${date} ********************`);
      result = await runScraper.runScraper(scraperObj);
    }
    catch (e) {
      t.fail(`error scraping: ${e}`);
    }

    if (result) {
      const actual = result.map(stripFeatures);
      await fs.writeJSON(join(d, 'expected.json.actual'), actual);
      t.deepEqual(JSON.stringify(actual), JSON.stringify(expected.map(stripFeatures)));
    }
    else {
      t.fail(`should have had a result for ${sname} on ${date}`);
    }

    delete process.env.SCRAPE_DATE;

    /*
    // Read sample responses for this scraper and pass them to the mock `get` function.
    const sampleResponses = glob(join(dateDir, '*')).filter(p => !p.includes('expected'));
    for (const filePath of sampleResponses) {
      const fileName = path.basename(filePath);
      const source = { [fileName]: fs.readFile(filePath).toString() };
      get.addSources(source);
    }

    process.env.SCRAPE_DATE = date;
    const result = await runScraper.runScraper(scraperObj);
    const expected = await fs.readJSON(join(dateDir, 'expected.json'));
    if (result) expect(result.map(stripFeatures)).toEqual(expected.map(stripFeatures));
    delete process.env.SCRAPE_DATE;
    */

  });
});

// Final cleanup.
delete process.env.SCRAPE_DATE;

/*
describe('all scrapers', () => {
  const testDirs = fastGlob.sync(join(__dirname, '..', '**', 'tests'), { onlyDirectories: true });

  for (const testDir of testDirs) {
    const scraperName = scraperNameFromPath(testDir); // e.g. `USA/AK`

    describe(`scraper: ${scraperName}`, () => {
      // dynamically import the scraper
      const scraperObj = require(join(testDir, '..', 'index.js')).default;
      const datedResults = fastGlob.sync(join(testDir, '*'), { onlyDirectories: true });

      for (const dateDir of datedResults) {
        const date = path.basename(dateDir);
        if (looksLike.isoDate(date)) {
          describe(date, () => {
            beforeAll(() => {
              // Read sample responses for this scraper and pass them to the mock `get` function.
              const sampleResponses = glob(join(dateDir, '*')).filter(p => !p.includes('expected'));
              for (const filePath of sampleResponses) {
                const fileName = path.basename(filePath);
                const source = { [fileName]: fs.readFile(filePath).toString() };
                get.addSources(source);
              }
            });
            it(`returns expected data`, async () => {
              process.env.SCRAPE_DATE = date;
              const result = await runScraper.runScraper(scraperObj);
              const expected = await fs.readJSON(join(dateDir, 'expected.json'));
              if (result) expect(result.map(stripFeatures)).toEqual(expected.map(stripFeatures));
            });
          });
        }
      }

      // clean up environment vars
      afterEach(() => {
        delete process.env.SCRAPE_DATE;
      });
    });
  }
});
*/
