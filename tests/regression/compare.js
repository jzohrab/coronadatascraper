// Regression testing.
// Compare the json files in 2 folders.

const imports = require('esm')(module);
const path = require('path');
const fs = require('fs');
const yargs = imports('yargs');
const glob = require('fast-glob').sync;
const lib = path.join(process.cwd(), 'src', 'shared', 'lib');
const datetime = imports(path.join(lib, 'datetime', 'index.js')).default;


async function compareReports(base, other) {
  
}

const { argv } = yargs
  .option('base', {
    alias: 'b',
    description: 'Base folder',
    type: 'string',
    default: 'dist'
  })
  .option('other', {
    alias: 'o',
    description: 'Other folder',
    type: 'string'
  })
  .demand(['base', 'other'], 'Please specify both directories')
  .help();

console.log(argv);

compareReports(argv.base, argv.other);
