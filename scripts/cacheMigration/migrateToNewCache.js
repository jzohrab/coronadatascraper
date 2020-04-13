// Get all the cache files from the log, and create the commands to
// move it to the new format.
//
// Run this from the project root dir.

const imports = require('esm')(module);
const fs = imports('fs');
const path imports('path');

// Get all the entries in the log_cacheCalls as json.
const raw = fs.readFileSync('log_cacheCalls.txt', 'utf-8');
const f = `[${raw}]`.replace(",\n]", "\n]");
// console.log(f);
const json = JSON.parse(f);
console.log(`All entries: ${json.length}`);


// Get all cache hits, these will be re-mapped.
const hits = json.filter(h => {
  return (h['cacheFileExists'] === true) && (h['cacheFilePath'].startsWith('coronadatascraper-cache')); 
});
console.log(`Hits: ${hits.length}`);


function sourceDirectoryName(origPath) {
  const re = /coronadatascraper.src.shared.scrapers\//;
  var ret = origPath
      .replace(re, '')
      .toLowerCase()
      .replace('index.js', '')
      .replace('.js', '')
      .replace(/${path.sep}/, '-');
  return ret;
}

// New filename format:
// crawler-cache/us-ca-san-francisco-county/2020-04-12/2020-04-12t00_47_14.145z-default-344b7.html

// For each date, find if any scrapers made multiple calls.  These
// need to have special keys created.  These will be in a data array,
// and if they're not, that's an error.
