// Regression testing.
// Compare the json files in 2 folders.

const imports = require('esm')(module);
const path = require('path');
const fs = require('fs');
const yargs = imports('yargs');
const glob = require('fast-glob').sync;
const lib = path.join(process.cwd(), 'src', 'shared', 'lib');
const datetime = imports(path.join(lib, 'datetime', 'index.js')).default;
const jsonDiff = imports(path.join(lib, 'json-diff.js'));

/** Compare two json files. */
function compareJson(leftFname, rightFname, formatters) {
  const loadJson = f => {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  }
  const left = loadJson(leftFname);
  const right = loadJson(rightFname);
  return jsonDiff.jsonDiff(left, right, 10, formatters);
}

/** Compare two files.
 * Pushes differences onto errs.
 */
function compareFiles(leftFname, rightFname, errs) {
  const ext = path.extname(leftFname);
  console.log(`\n${leftFname} vs ${rightFname}`);
  if (ext === '.json') {
    const errs = compareJson(leftFname, rightFname);
    if (errs.length === 0)
      console.log('  equal');
    else
      errs.forEach(e => { console.log(`* ${e}`); });
  }
  else {
    console.log(`CAN'T HANDLE THIS: ${leftFname}`);
  }
}

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
  const commonFiles = leftFiles.filter(containedIn(rightFiles, true));
  
  const allFiles = leftFiles.concat(rightFiles);
  function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
  }
  var uniques = allFiles.filter(onlyUnique);

  const reportMissing = (files, folderName) => {
    const missing = uniques.filter(containedIn(files, false));
    missing.forEach(f => {
      ret.push(`${f} missing in ${folderName}`);
    });
  };
  reportMissing(leftFiles, left);
  reportMissing(rightFiles, right);


  const getDataRpt = files => {
    const drs = files.filter(f => { return /data(.*).json/.test(f); });
    if (drs.length === 0) {
      console.log("Missing data(.*).json file.");
      return null;
    }
    if (drs.length > 1) {
      console.log("Multiple/ambiguous data(.*).json files.");
      return null;
    }
    return drs[0];
  }

  const fpaths = d => { return glob(path.join(d, '**', '*.*')).sort(); }
  const leftPaths = fpaths(left);
  const rightPaths = fpaths(right);

  const leftDataJson = getDataRpt(leftPaths);
  const rightDataJson = getDataRpt(rightPaths);
  console.log(leftDataJson);
  if (leftDataJson && rightDataJson) {
    const formatters = {
      '^[(\\d+)]$': (hsh, m) => { return `[${m[1]}, ${hsh['name']}]`; }
    };
    const errs = compareJson(leftDataJson, rightDataJson, formatters);
    if (errs.length === 0)
      console.log('  equal');
    else
      errs.forEach(e => { console.log(`* ${e}`); });
  }


  commonFiles.forEach(f => {
    compareFiles(path.join(left, f), path.join(right, f), ret);
  });

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
