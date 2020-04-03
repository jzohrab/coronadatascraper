/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require  */
/* eslint-disable no-use-before-define */

const imports = require('esm')(module);
const { join } = require('path');
const test = require('tape');
const fastGlob = require('fast-glob');
const path = require('path');
const fsBuiltIn = require('fs');
const { EventEmitter } = require('events');

const fs = imports(join(process.cwd(), 'src', 'shared', 'lib', 'fs.js'));
const runScraper = imports(join(process.cwd(), 'src', 'events', 'crawler', 'scrape-data', 'run-scraper.js'));
const sanitize = imports(join(process.cwd(), 'src', 'shared', 'lib', 'sanitize-url.js'));
const get = imports(join(process.cwd(), 'src', 'shared', 'lib', 'fetch', 'get.js'));



// https://medium.com/trabe/synchronize-cache-updates-in-node-js-with-a-mutex-d5b395457138
class Lock {
  constructor(maxListeners = 20) {
    this._locked = false;
    this._ee = new EventEmitter();
    this._ee.setMaxListeners(maxListeners);
  }

  acquire() {
    return new Promise(resolve => {
      // If nobody has the lock, take it and resolve immediately
      if (!this._locked) {
        // Safe because JS doesn't interrupt you on synchronous operations,
        // so no need for compare-and-swap or anything like that.
        this._locked = true;
        return resolve();
      }

      // Otherwise, wait until somebody releases the lock and try again
      const tryAcquire = () => {
        if (!this._locked) {
          this._locked = true;
          this._ee.removeListener('release', tryAcquire);
          return resolve();
        }
      };
      this._ee.on('release', tryAcquire);
    });
  }

  release() {
    // Release the lock immediately
    this._locked = false;
    setImmediate(() => this._ee.emit('release'));
  }
}



// This suite automatically tests a scraper's results against its test
// cases. To add test coverage for a scraper, see
// docs/sources.md#testing-sources


// Splits folder path, returns hash.
// e.g. 'X/Y/2020-03-04' => { scraperName: 'X/Y', date: '2020-03-04' }
function scraperNameAndDateFromPath(s) {
  const parts = s.split(path.sep);

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const scraper_name = parts.filter(s => !dateRegex.test(s)).join(path.sep);
  const dt = parts.filter(s => dateRegex.test(s));

  const date = dt.length === 0 ? null : dt[0];
  const ret = { scraperName: scraper_name, date: date };
  return ret;
}

async function runTest(t, cacheRoot, testDirectory) {
  const pair = scraperNameAndDateFromPath(testDirectory);
  const sname = pair.scraperName;
  const date = pair.date;

  get.get = async (url, type, date, options) => {
    const sanurl = sanitize.sanitizeUrl(url);
    const respFile = join(testDirectory, sanurl);
    // console.log(`  Call: ${url}\n  Sanitized: ${sanurl}\n  Response: ${respFile}`);
    return await fs.readFile(join(cacheRoot, respFile));
  };

  const scraperSourcePathRoot = join(__dirname, '..', '..', '..', 'src', 'shared', 'scrapers');
  const spath = join(scraperSourcePathRoot, sname, 'index.js');
  const scraperObj = imports(spath).default;

  let result = null;
  try {
    process.env.SCRAPE_DATE = date;
    result = await runScraper.runScraper(scraperObj);
  }
  catch (e) {
    t.fail(`${sname} on ${date}, error scraping: ${e}`);
  }
  finally {
    delete process.env.SCRAPE_DATE;
  }

  if (result) {
    // Writing the actual scraper result so ppl can diff/investigate.
    // These are ignored in .gitignore.
    const actualFilepath = join(cacheRoot, testDirectory, 'actual.json');
    await fs.writeJSON(actualFilepath, result, { log: false });

    const expectedPath = join(cacheRoot, testDirectory, 'expected.json');
    const fullExpected = await fs.readJSON(expectedPath);

    // Ignore features (for now?).
    const removeFeatures = d => { delete d.feature; return d; };
    const actual = JSON.stringify(result.map(removeFeatures));
    const expected = JSON.stringify(fullExpected.map(removeFeatures));

    const msg = `${sname} on ${date} (actual.json file saved in ${testDirectory})`;
    t.equal(actual, expected, msg);
  }
  else {
    t.fail(`should have had a result for ${sname} on ${date}`);
  }

}


const cachePath = join(process.cwd(), 'tests', 'integration', 'scrapers', 'testcache');

const testDirs = fastGlob.
      sync(join(cachePath, '**'), { onlyDirectories: true }).
      filter(s => /\d{4}-\d{2}-\d{2}$/.test(s)).
      map(s => s.replace(`${cachePath}${path.sep}`, ''));

const lock = new Lock(testDirs.length);

test('Parsers', async t => {
  t.plan(testDirs.length);
  testDirs.forEach(async d => {
    await lock.acquire();
    try {
      await runTest(t, cachePath, d);
    }
    finally {
      lock.release();
    }
  });
});

// Final cleanup.
delete process.env.SCRAPE_DATE;
