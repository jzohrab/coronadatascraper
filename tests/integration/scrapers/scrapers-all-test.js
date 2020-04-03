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
  constructor() {
    this._locked = false;
    this._ee = new EventEmitter();
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
// https://github.com/lazd/coronadatascraper/blob/master/docs/sources.md#testing-sources

// Utility functions

const testdir = join(process.cwd(), 'tests', 'integration', 'scrapers', 'testcache');

const looksLike = {
  isoDate: s => /^\d{4}-\d{2}-\d{2}$/.test(s) // YYYY-DD-MM
};

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
      filter(s => /\d{4}-\d{2}-\d{2}$/.test(s));


async function runTest(t, d) {

  const pair = scraperNameAndDateFromPath(d);
  const sname = pair.scraperName;
  const date = pair.date;

  const scraperSourcePathRoot = join(__dirname, '..', '..', '..', 'src', 'shared', 'scrapers');
  const spath = join(scraperSourcePathRoot, sname, 'index.js');

  get.get = async (url, type, date, options) => {
    const sanurl = sanitize.sanitizeUrl(url);
    const respFile = join(d, sanurl);
    // console.log("CALLING FOR " + url);
    // console.log("SANITIZED: " + sanurl);
    // console.log("RESPONSE FILE: " + respFile);
    return await fs.readFile(respFile);
  };

  const expected = await fs.readJSON(join(d, 'expected.json'));
    
  const scraperObj = imports(spath).default;
  process.env.SCRAPE_DATE = date;

  let result = null;
  try {
    result = await runScraper.runScraper(scraperObj);
  }
  catch (e) {
    t.fail(`error scraping: ${e}`);
  }

  delete process.env.SCRAPE_DATE;

  if (result) {
    await fs.writeJSON(join(d, 'actual.json'), result);
    const actual = result.map(stripFeatures);
    t.equal(JSON.stringify(actual), JSON.stringify(expected.map(stripFeatures)));
  }
  else {
    t.fail(`should have had a result for ${sname} on ${date}`);
  }

}


const lock = new Lock();

test('Parsers', async t => {
  t.plan(testDirs.length);
  testDirs.forEach(async d => {
    await lock.acquire();
    try {
      await runTest(t, d);
    }
    finally {
      lock.release();
    }
  });
});

// Final cleanup.
delete process.env.SCRAPE_DATE;
