// Regression testing.
const imports = require('esm')(module);
const path = require('path');
const yargs = imports('yargs');
const glob = require('fast-glob').sync;
const lib = path.join(process.cwd(), 'src', 'shared', 'lib');
const datetime = imports(path.join(lib, 'datetime', 'index.js')).default;

                                   
/** Get the latest folder date in coronadatascraper-cache. */
// TODO - this belongs in the cache class.  Also move fast-glob there.
function latestCompleteCacheDate() {
  const cache = path.join(process.cwd(), 'coronadatascraper-cache');
  const folders = glob(path.join(cache, '*'), { onlyDirectories: true });
  const dates = folders
        .map(f => f.split(path.sep).pop())
        .filter(s => /\d{4}-\d{1,2}-\d{1,2}$/.test(s))
        .map(s => new Date(s));
  const maxDate=new Date(Math.max.apply(null,dates));
  return datetime.getYYYYMD(maxDate);
}


function runRegression(argv) {
  console.log(argv.origin);
  console.log(argv.branch);
  console.log(argv.commit);
}


const { argv } = yargs
  .option('origin', {
    alias: 'o',
    description: 'Upstream origin',
    type: 'string',
    default: 'origin'
  })
  .option('branch', {
    alias: 'b',
    description: 'Upstream branch',
    type: 'string',
    default: 'master'
  })
  .option('commit', {
    alias: 'c',
    description: 'Upstream commit',
    type: 'string',
    default: 'HEAD'
  })
  .help();

console.log(argv);

const cacheDate = latestCompleteCacheDate();

const execSync = imports('child_process').execSync;

// import { execSync } from 'child_process';  // replace ^ if using ES modules


var output = '';
output = execSync('ls', { encoding: 'utf-8' });  // the default is 'buffer'
console.log('Output was:\n', output);

// Update things
// git submodule update --remote

/*
output = execSync('git checkout master', { encoding: 'utf-8' });  // the default is 'buffer'
console.log('Output was:\n', output);
*/
