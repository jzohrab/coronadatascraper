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
  const maxDate = new Date(Math.max.apply(null, dates));
  return datetime.getYYYYMD(maxDate);
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
  .option('writeTo', {
    alias: 'w',
    description: 'Write to dir',
    type: 'string'
  })
  .demand('writeTo', 'Please specify directory to write to')
  .help();

console.log(argv);

const cacheDate = latestCompleteCacheDate();

const { execSync } = imports('child_process');

function runCommand(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

// First run of reports, going through public interface.
// For stdio 'inherit', see
// https://stackoverflow.com/questions/30134236/use-child-process-execsync-but-keep-output-in-console
const baseCmd = `yarn start --date ${cacheDate} --useOnlyCache --writeTo ${argv.writeTo}`;
runCommand(baseCmd);

// Check out the other branch
// run command to another report location
// compar the files

// var output = '';
// output = execSync('ls', { encoding: 'utf-8' });  // the default is 'buffer'
// console.log('Output was:\n', output);

// Update things
// git submodule update --remote
