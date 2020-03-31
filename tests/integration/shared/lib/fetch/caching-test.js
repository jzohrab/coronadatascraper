const imports = require('esm')(module);
const { join } = require('path');
const test = require('tape');

const fs = require('fs');
const path = require('path');

const caching = imports(join(process.cwd(), 'src', 'shared', 'lib', 'fetch', 'caching.js'));

const testDir = path.join(process.cwd(), 'tests', 'integration', 'shared', 'lib', 'fetch', 'testcache');

function setup() {
  // console.log('setting up');
  fs.readdirSync(testDir, (err, files) => {
    if (err) throw err;
    files = files.filter(f => {
      return f !== '.gitignore';
    });
    for (const file of files) {
      // console.log(`unlinking ${file}`);
      fs.unlinkSync(path.join(testDir, file), err => {
        if (err) throw err;
      });
    }
  });

  process.env.OVERRIDE_DEFAULT_CACHE_PATH = testDir;
}

function teardown() {
  delete process.env.OVERRIDE_DEFAULT_CACHE_PATH;
}

test('caching.saveFileToCache creates file and metadata file', async t => {
  setup();

  const date = '2020-06-06';
  const url = 'http://hi.com';
  const type = 'csv';
  await caching.saveFileToCache(url, type, date, 'data,stuff');
  const fname = caching.getCachedFileName(url, type);
  const basename = fname.replace(/\.csv$/, '');

  t.ok(fs.existsSync(path.join(testDir, date, fname)), `cache file ${fname} created`);

  const metadataFile = path.join(testDir, date, `metadata-${basename}.json`);
  t.ok(fs.existsSync(metadataFile), `metadata file ${metadataFile} created`);

  t.end();
  teardown();
});


test('caching.saveFileToCache metadata file contains expected data', async t => {
  setup();

  const date = '2020-06-06';
  const url = 'http://hi.com';
  const type = 'csv';

  await caching.saveFileToCache(url, type, date, 'data,stuff');

  const fname = caching.getCachedFileName(url, type);
  const basename = fname.replace(/\.csv$/, '');

  const metadataFileName = `metadata-${basename}.json`;
  const metadataFile = path.join(testDir, date, metadataFileName);
  t.ok(fs.existsSync(metadataFile), `metadata file ${metadataFile} created`);

  const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));

  const expected = {
    cachefile: fname,
    url: url,
    cachedatetime: 'date time the file was written',
    md5: '{md5 of file content}',
    cachepath: `${path.join(date, metadataFileName)}`
  };
  t.equal(metadata, expected);

  t.end();
  teardown();
});


/*
TODO - cache with huge PDF should still be OK.
 */

// Ensure teardown is done at the end!
teardown();
