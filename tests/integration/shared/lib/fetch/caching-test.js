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

  const csvData = 'data,stuff';
  const csvDataMd5 = '6595d1b8e586b2fbfb2e59d48140b401';  // calculated during dev!
  
  await caching.saveFileToCache(url, type, date, csvData);

  const fname = caching.getCachedFileName(url, type);
  const basename = fname.replace(/\.csv$/, '');

  const metadataFileName = `metadata-${basename}.json`;
  const metadataFile = path.join(testDir, date, metadataFileName);
  t.ok(fs.existsSync(metadataFile), `metadata file ${metadataFile} created`);

  const actualMetadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
  console.log(actualMetadata);

  // The metadata file contains the date the file was created.
  // That's a hassle to test, so we'll just check that it's in fact a date.
  const yearString = actualMetadata.cachedatetime.substring(0, 4);
  t.equal(yearString, `${(new Date()).getFullYear()}`, 'date check');
  
  const expected = {
    cachefile: fname,
    url: url,
    cachedatetime: actualMetadata.cachedatetime,
    md5: csvDataMd5,
    cachepath: path.join(date, fname)
  };
  t.deepEqual(actualMetadata, expected);

  t.end();
  teardown();
});


/*
TODO
cache with huge PDF should still be OK.
works with null date
 */

// Ensure teardown is done at the end!
teardown();
