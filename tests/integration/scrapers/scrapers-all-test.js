/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require  */
/* eslint-disable no-use-before-define */

const imports = require('esm')(module);
const { join } = require('path');
const test = require('tape');
const fastGlob = require('fast-glob');
const path = require('path');
const fs = imports(join(process.cwd(), 'src', 'shared', 'lib', 'fs.js'));
const runScraper = imports(join(process.cwd(), 'src', 'events', 'crawler', 'scrape-data', 'run-scraper.js'));
const get = imports(join(process.cwd(), 'src', 'shared', 'lib', 'fetch', 'get.js'));

// TRY THIS
get.get = (aoeu) => { console.log('hi'); }

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

const scraperNameFromPath = s => s.replace(`${testdir}${path.sep}`, '').split(path.sep);

// Remove geojson from scraper result
const stripFeatures = d => {
  delete d.feature;
  return d;
};

const testDirs = fastGlob.sync(join(testdir, '**'), { onlyDirectories: true });
console.log(testDirs);
const scrnames = testDirs.map(s => scraperNameFromPath(s));
console.log(scrnames);

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
