// Regression testing.
// Compare the json files in 2 folders.

const imports = require('esm')(module);
const path = require('path');
const fs = require('fs');
const yargs = imports('yargs');
const glob = require('fast-glob').sync;
const lib = path.join(process.cwd(), 'src', 'shared', 'lib');
const datetime = imports(path.join(lib, 'datetime', 'index.js')).default;
const jsonDiff = imports(path.join(lib, 'diffing', 'json-diff.js'));
const stringDiff = imports(path.join(lib, 'diffing', 'string-diff.js'));

/** Compare two json files. */
function compareJson(leftFname, rightFname, formatters) {
  const loadJson = f => {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  }
  const left = loadJson(leftFname);
  const right = loadJson(rightFname);
  const errs = jsonDiff.jsonDiff(left, right, 10, formatters);
  if (errs.length === 0)
    console.log('  equal');
  else
    errs.forEach(e => { console.log(`* ${e}`); });
}

/** Compare two CSV files. */
function compareCsv(leftFname, rightFname) {
  const loadlines = f => {
    return fs.readFileSync(f, 'utf8').match(/[^\r\n]+/g);
  }
  const left = loadlines(leftFname);
  const right = loadlines(rightFname);

  const errs = [];
  if (left.length !== right.length) {
    errs.push(`Different line count (${left.length} vs ${right.length})`);
  }

  const minLength = (left.length < right.length) ? left.length : right.length;
  for (var i = 0; i < minLength; ++i) {
    const diff = stringDiff.stringDiff(left[i], right[i]);
    if (diff.column !== null)
      errs.push(`Line ${i}, col ${diff.column}: "${diff.left}" != "${diff.right}"`);
    if (errs.length >= 10)
      break;
  }

  if (errs.length === 0)
    console.log('  equal');
  else
    errs.forEach(e => { console.log(`* ${e}`); });
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


  const fpaths = d => { return glob(path.join(d, '**', '*.*')).sort(); }
  const leftPaths = fpaths(left);
  const rightPaths = fpaths(right);

  function findFile(files, regex) {
    const drs = files.filter(f => { return regex.test(f); });
    if (drs.length === 0) {
      console.log(`Missing ${regex} file.`);
      return null;
    }
    if (drs.length > 1) {
      console.log(`Multiple/ambiguous ${regex} files.`);
      return null;
    }
    return drs[0];
  }


  const runJsonCompare = (regex, formatters) => {
    const findLeftRightFiles = regex => {
      return [findFile(leftPaths, regex), findFile(rightPaths, regex)];
    };

    const [left, right] = findLeftRightFiles(regex);
    if (left && right) {
      console.log(left);
      compareJson(left, right, formatters);
    }
  };

  const runCsvCompare = (regex) => {
    const findLeftRightFiles = regex => {
      return [findFile(leftPaths, regex), findFile(rightPaths, regex)];
    };
    const [left, right] = findLeftRightFiles(regex);
    if (left && right) {
      console.log(left);
      compareCsv(left, right);
    }
  };

  const jsonReports = [
    {
      regex: /data(.*).json/,
      formatters: {
        '^[(\\d+)]$': (h, m) => { return `[${m[1]}, ${h['name']}]`; }
      }
    },
    {
      regex: /report.json/,
      formatters: {
        '^(.*?/sources)[(\\d+)]$': (h, m) => { return `${m[1]}[${m[2]}, ${h['url']}]`; }
      }
    },
    {
      regex: /ratings.json/,
      formatters: {
        '^[(\\d+)]$': (h, m) => { return `[${m[1]}, ${h['url']}]`; }
      }
    },
    /*  // disabled during dev -- slow
    {
      regex: /features(.*).json/,
      formatters: {}
    }
*/
  ]
  jsonReports.forEach(hsh => {
    runJsonCompare(hsh.regex, hsh.formatters);
  });

  const csvReports = [
    /crawler-report.csv/,
    /data(.*).csv/
  ];
  csvReports.forEach(regex => {
    runCsvCompare(regex);
  });

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

compareReports(argv.base, argv.other);
// console.log(differences);
