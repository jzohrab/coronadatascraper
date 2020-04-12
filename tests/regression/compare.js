// Regression testing.
// Compare the json files in 2 folders.

const imports = require('esm')(module);
const path = require('path');
const fs = require('fs');
const yargs = imports('yargs');
const glob = require('fast-glob').sync;
const lib = path.join(process.cwd(), 'src', 'shared', 'lib');
const datetime = imports(path.join(lib, 'datetime', 'index.js')).default;


/** Filter function */
function containedIn(arr, expected) {
  return function arrContains(element) {
    return (expected == (arr.indexOf(element) >= 0));
  };
}

/** Compare dirs.
 * Returns array reporting differences.
 */
function compareReports(left, right) {
  let ret = [];

  const fnames = d => {
    return glob(path.join(d, '**', '*.*'))
      .map(s => s.replace(`${d}${path.sep}`, '')).
      sort();
  };
  const leftFiles = fnames(left);
  const rightFiles = fnames(right);
  // console.log(leftFiles);
  // console.log(rightFiles);

  const allFiles = leftFiles.concat(rightFiles);
  function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
  }
  var uniques = allFiles.filter(onlyUnique);
  // console.log("UNIQUES");
  // console.log(uniques);

  const reportMissing = (files, folderName) => {
    const missing = uniques.filter(containedIn(files, false));
    missing.forEach(f => {
      ret.push(`${f} missing in ${folderName}`);
    });
  };
  reportMissing(leftFiles, left);
  reportMissing(rightFiles, right);

  const commonFiles = leftFiles.filter(containedIn(rightFiles, true));
  // console.log("COMMON");
  // console.log(commonFiles);

  return ret;
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

// console.log(argv);

const differences = compareReports(argv.base, argv.other);
console.log(differences);
