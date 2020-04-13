// Get all the cache files from the log, and create the commands to
// move it to the new format.
//
// Run this from the project root dir.

const imports = require('esm')(module);
const fs = imports('fs');
const { join } = imports('path');

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
