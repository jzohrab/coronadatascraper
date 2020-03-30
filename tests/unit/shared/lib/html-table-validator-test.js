const imports = require('esm')(module);
const cheerio = require('cheerio');
const test = require('tape');
const path = require('path');
const { join } = require('path');

const shared = path.join(process.cwd(), 'src', 'shared');
const lib = path.join(shared, 'lib');

const HtmlTableValidator = require(join(process.cwd(), 'src', 'shared', 'lib', 'html-table-validator.js'));

// const HtmlTableValidator = require('../../../../src/shared/lib/html-table-validator.js');

// const HtmlTableValidator = imports(join(process.cwd(), 'src', 'shared', 'lib', 'html-table-validator.js'));
// const { HtmlTableValidator } = require(process.cwd(), 'src', 'shared', 'lib', 'html-table-validator.js');

// const HtmlTableValidator = require(process.cwd(), 'src', 'shared', 'lib', 'html-table-validator.js');


console.log('*************************');
console.log(HtmlTableValidator);
console.log('*************************');

// The html table that most tests will be using.
// Summarized:
//   apple county| 10| 20
//   deer county | 66| 77
const $html = `
<html>
  <body>
    <table id="tid">
      <tr>
        <th>location</th><th>cases</th><th>deaths</th>
      </tr>
      <tr>
        <td>apple county</td><td>10</td><td>20</td>
      </tr>
      <tr>
        <td>deer county</td><td>66</td><td>77</td>
      </tr>
    </table>
  </body>
</html>`;

// The table for the current test run.
let $table = null;

// The rules being used to verify $table.
let $rules = {};

// Validate $table using $rules.
function expectErrors(t, expected) {
  const v = new HtmlTableValidator($rules);
  const actual = v.errors($table);
  // console.log(actual);
  t.equal(actual.toString(), expected.toString());

  // Don't bother -- success() just checks error length.
  // const shouldBeSuccessful = expected.length === 0;
  // t.equal(v.success($table), shouldBeSuccessful);
}


function setup() {
  const $ = cheerio.load($html);
  $table = $('table#tid').eq(0);
}


// CONSTRUCTOR

test('constructor throws error if a bad rule is used', (t) => {
  setup();
  const rules = {
    headings: { 0: {} }
  };
  t.throws(() => {
    // eslint-disable-next-line no-new
    new HtmlTableValidator(rules);
  });
  t.end();
});


test('throws error if an invalid rule is passed', (t) => {
  setup();
  const rules = {
    badHeading: 'this should throw'
  };
  t.throws(() => {
    // eslint-disable-next-line no-new
    new HtmlTableValidator(rules);
  });
  t.end();
});

// SANITY CHECKS

test('no errors if no rules', (t) => {
  setup();
  expectErrors(t, []);
  t.end();
});

test('error if table is null', (t) => {
  setup();
  $table = null;
  expectErrors(t, ['null/undefined table']);
  t.end();
});

test('error if table is undefined', (t) => {
  setup();
  $table = undefined;
  expectErrors(t, ['null/undefined table']);
  t.end();
});

test('reports error if no rows in table', (t) => {
  setup();
  const norows = '<html><head><table id="tid"></table></head></html>';
  const c = cheerio.load(norows);
  $table = c('table#tid').eq(0);
  expectErrors(t, ['no rows in table']);
  t.end();
});

/*

test('sum should return the addition of two numbers', function (t) {
  t.equal(3, (1 + 2));
  t.end();
});


describe('html-table-schema-validator', () => {

  describe('sanity checks', () => {
  });

  describe('header checks', () => {
    test('can check header with regex', () => {
setup();
      $rules = {
        headings: {
          0: /shouldfail/
        }
      };
      expectErrors(['heading 0 "location" does not match /shouldfail/']);
    });

    test('can check multiple headers at once', () => {
setup();
      $rules = {
        headings: {
          0: /shouldfail/,
          1: /another_bad/
        }
      };
      expectErrors([
        'heading 0 "location" does not match /shouldfail/',
        'heading 1 "cases" does not match /another_bad/'
      ]);
    });

    test('passes if all regexes match', () => {
setup();
      $rules = {
        headings: {
          0: /location/,
          1: /cases/,
          2: /deaths/
        }
      };
      expectErrors([]);
    });

    test('can use exact-matching regexes', () => {
setup();
      $rules = {
        headings: {
          0: /location/,
          1: /^cases $/,
          2: /^ deaths $/
        }
      };
      expectErrors(['heading 1 "cases" does not match /^cases $/', 'heading 2 "deaths" does not match /^ deaths $/']);
    });

    test('can use case-insensitive regex', () => {
setup();
      $rules = {
        headings: {
          0: /LocaTion/i,
          1: /CASES/i,
          2: /DEATHS/i
        }
      };
      expectErrors([]);
    });

    test('can use <td> for header cells', () => {
setup();
      const trhtml = $html.replace(/<th>/g, '<td>').replace(/<\/th>/g, '</td>');
      const c = cheerio.load(trhtml);
      $table = c('table#tid').eq(0);
      $rules = {
        headings: {
          0: /something/,
          1: /Cases/
        }
      };
      expectErrors(['heading 0 "location" does not match /something/', 'heading 1 "cases" does not match /Cases/']);
    });

    test('reports error if a rule refers to a non-existent column', () => {
setup();
      $rules = {
        headings: {
          a: /something/,
          17: /Cases/
        }
      };
      expectErrors(['heading 17 "" does not match /Cases/', 'heading a "" does not match /something/']);
    });
  });

  describe('minrows', () => {
    test('fails if table has insufficient rows', () => {
setup();
      $rules = {
        minrows: 10
      };
      expectErrors(['expected at least 10 rows, only have 3']);
    });

    test('passes if table has sufficient rows', () => {
setup();
      $rules = {
        minrows: 2
      };
      expectErrors([]);
    });
  });

  describe('data row column checks', () => {
    beforeEach(() => {
      const $ = cheerio.load($html);
      $table = $('table#tid').eq(0);

      // Verify no screwups.
      const headerrow = $table.find('tr').first();
      expect(headerrow.find('th')).toHaveLength(3);
    });

    describe('any row', () => {
      test('passes if any row matches', () => {
setup();
        $rules = {
          data: [{ column: 0, row: 'ANY', rule: /apple/ }]
        };
        expectErrors([]);
      });

      test('fails if no row matches', () => {
setup();
        $rules = {
          data: [{ row: 'ANY', column: 0, rule: /UNKNOWN/ }]
        };
        expectErrors(['no row in column 0 matches /UNKNOWN/']);
      });

      test('can use numeric regex', () => {
setup();
        $rules = {
          data: [
            { column: 1, row: 'ANY', rule: /^[0-9]+$/ },
            { column: 2, row: 'ANY', rule: /^[a-z]+$/ }
          ]
        };
        expectErrors(['no row in column 2 matches /^[a-z]+$/']);
      });

      test('reports error if a rule refers to a non-existent column', () => {
setup();
        $rules = {
          data: [
            { column: 17, row: 'ANY', rule: /^[0-9]+$/ },
            { column: 'a', row: 'ANY', rule: /^[a-z]+$/ }
          ]
        };
        expectErrors(['no row in column 17 matches /^[0-9]+$/', 'no row in column a matches /^[a-z]+$/']);
      });
    });

    describe('all rows', () => {
      test('passes if all rows match', () => {
setup();
        $rules = {
          data: [
            { column: 0, row: 'ALL', rule: /county/ },
            { column: 1, row: 'ALL', rule: /^[0-9]+$/ }
          ]
        };
        expectErrors([]);
      });

      test('fails if any rows do not match', () => {
setup();
        $rules = {
          data: [
            { column: 0, row: 'ALL', rule: /apple/ },
            { column: 1, row: 'ALL', rule: /^[0-9]+$/ }
          ]
        };
        expectErrors(['"deer county" in column 0 does not match /apple/']);
      });
    });

    describe('single cell check', () => {
      test('passes if cell matches', () => {
setup();
        $rules = {
          data: [{ column: 0, row: 0, rule: /location/ }]
        };
        expectErrors([]);
      });

      test('treats bad cell references as empty', () => {
setup();
        $rules = {
          data: [
            { column: 0, row: 10000, rule: /location/ },
            { column: 5000, row: 2, rule: /outerspace/ }
          ]
        };
        expectErrors([
          'cell[10000, 0] value "" does not match /location/',
          'cell[2, 5000] value "" does not match /outerspace/'
        ]);
      });

      test('fails if cell does not match', () => {
setup();
        $rules = {
          data: [
            { column: 0, row: 0, rule: /area/ },
            { column: 0, row: 1, rule: /apple/ },
            { column: 1, row: 2, rule: /cat/ }
          ]
        };
        expectErrors([
          'cell[0, 0] value "location" does not match /area/',
          'cell[2, 1] value "66" does not match /cat/'
        ]);
      });
    });
  });

  describe('throwIfErrors', () => {
    test('throws if errors', () => {
setup();
      $rules = {
        headings: {
          0: /shouldfail/
        }
      };
      expect(() => {
        HtmlTableValidator.throwIfErrors($rules, $table, { logToConsole: false });
      }).toThrow(/1 validation errors/);
    });

    test('does not throw if no errors', () => {
setup();
      $rules = {
        headings: {
          0: /location/
        }
      };
      HtmlTableValidator.throwIfErrors($rules, $table, { logToConsole: false });
      expect(1 + 1).toBe(2); // :-)
    });

    test('can specify count of errors to include in thrown message', () => {
setup();
      $rules = {
        data: [
          { column: 0, row: 0, rule: /area/ },
          { column: 0, row: 1, rule: /apple/ },
          { column: 1, row: 2, rule: /cat/ }
        ]
      };

      // Sanity check of validation errors:
      expectErrors(['cell[0, 0] value "location" does not match /area/', 'cell[2, 1] value "66" does not match /cat/']);

      let errMsg;
      try {
        const opts = { includeErrCount: 1, logToConsole: false };
        HtmlTableValidator.throwIfErrors($rules, $table, opts);
      } catch (e) {
        errMsg = e.message;
      }

      expect(errMsg).toMatch(/value "location"/);
      expect(errMsg).not.toMatch(/value "66"/);
    });

    test('count of errors requested may be more than actual errors', () => {
setup();
      $rules = {
        data: [
          { column: 0, row: 0, rule: /area/ },
          { column: 0, row: 1, rule: /apple/ },
          { column: 1, row: 2, rule: /cat/ }
        ]
      };

      // Sanity check of validation errors:
      expectErrors(['cell[0, 0] value "location" does not match /area/', 'cell[2, 1] value "66" does not match /cat/']);

      let errMsg;
      try {
        const opts = { includeErrCount: 999, logToConsole: false };
        HtmlTableValidator.throwIfErrors($rules, $table, opts);
      } catch (e) {
        errMsg = e.message;
      }

      expect(errMsg).toMatch(/value "location"/);
      expect(errMsg).toMatch(/value "66"/);
    });
  });
});
*/
