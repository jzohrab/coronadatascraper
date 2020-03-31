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

  process.env.OVERRIDE_CACHE_PATH = testDir;
}

function teardown() {
  delete process.env.OVERRIDE_CACHE_PATH;
}

test('caching.saveFileToCache creates file and metadata file', async t => {
  setup();

  const date = '2020-06-06';
  const url = 'http://hi.com';
  const type = 'csv';
  await caching.saveFileToCache(url, type, date, 'data,stuff');
  const fname = caching.getCachedFileName(url, type);

  const basename = fname.replace(/\.csv$/, '');

  // Note: when OVERRIDE_CACHE_PATH is set, the files aren't stored in
  // subdirectories named '$date'.
  t.ok(fs.existsSync(path.join(testDir, fname)), `cache file ${fname} created`);

  const metadataFile = path.join(testDir, `metadata-${basename}.json`);
  t.ok(fs.existsSync(metadataFile), `metadata file ${metadataFile} created`);

  t.end();
  teardown();
});


console.log('TODO: metadata file contains expected data');

/*

{
    cachefile: {filename-with-extension},
    url: {source url},
    cachedatetime: date time cached,
    md5: {md5 of file content},

    // These are 'nice-to-have', because the callers
    // could derive this information from the above ...
    fullpath: {cache-date-folder}/{cachefile}
  },
 */

// Ensure teardown is done at the end!
teardown();
