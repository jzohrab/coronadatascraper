import cheerio from 'cheerio';
import each from 'jest-each';
import HtmlTableValidor from '../html-table-validator.js';

describe('html-table-schema-validator', () => {
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

  beforeEach(() => {
    const $ = cheerio.load($html);
    $table = $('table#tid').eq(0);

    // Verify no screwups.
    const headerrow = $table.find('tr').first();
    expect(headerrow.find('th')).toHaveLength(3);
  });

  // Validate $table using $rules.
  function expectErrors(expected) {
    const v = new HtmlTableValidor($rules);
    const actual = v.errors($table);
    // console.log(actual);
    expect(actual).toEqual(expected);

    const shouldBeSuccessful = expected.length === 0;
    expect(v.success($table)).toBe(shouldBeSuccessful);
  }

  describe('constructor', () => {
    test('throws error if a bad rule is used', () => {
      const rules = {
        headings: { 0: {} }
      };
      expect(() => {
        // eslint-disable-next-line no-new
        new HtmlTableValidor(rules);
      }).toThrow();
    });

    test('throws error if an invalid rule is passed', () => {
      const rules = {
        badHeading: 'this should throw'
      };
      expect(() => {
        // eslint-disable-next-line no-new
        new HtmlTableValidor(rules);
      }).toThrow();
    });
  });

  describe('sanity checks', () => {
    test('no errors if no rules', () => {
      expectErrors([]);
    });

    const badTableTests = [null, undefined];
    each(badTableTests).test('error if table is %s', t => {
      $table = t;
      expectErrors(['null/undefined table']);
    });

    test('reports error if no rows in table', () => {
      const norows = '<html><head><table id="tid"></table></head></html>';
      const c = cheerio.load(norows);
      $table = c('table#tid').eq(0);
      expectErrors(['no rows in table']);
    });
  });

  describe('header checks', () => {
    test('can check header with regex', () => {
      $rules = {
        headings: {
          0: /shouldfail/
        }
      };
      expectErrors(['heading 0 "location" did not match /shouldfail/']);
    });

    test('can check multiple headers at once', () => {
      $rules = {
        headings: {
          0: /shouldfail/,
          1: /another_bad/
        }
      };
      expectErrors([
        'heading 0 "location" did not match /shouldfail/',
        'heading 1 "cases" did not match /another_bad/'
      ]);
    });

    test('passes if all regexes match', () => {
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
      $rules = {
        headings: {
          0: /location/,
          1: /^cases $/,
          2: /^ deaths $/
        }
      };
      expectErrors(['heading 1 "cases" did not match /^cases $/', 'heading 2 "deaths" did not match /^ deaths $/']);
    });

    test('can use case-insensitive regex', () => {
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
      const trhtml = $html.replace(/<th>/g, '<td>').replace(/<\/th>/g, '</td>');
      const c = cheerio.load(trhtml);
      $table = c('table#tid').eq(0);
      $rules = {
        headings: {
          0: /something/,
          1: /Cases/
        }
      };
      expectErrors(['heading 0 "location" did not match /something/', 'heading 1 "cases" did not match /Cases/']);
    });

    test('reports error if a rule refers to a non-existent column', () => {
      $rules = {
        headings: {
          a: /something/,
          17: /Cases/
        }
      };
      expectErrors(['heading column 17 does not exist', 'heading column a does not exist']);
    });
  });

  describe('minrows', () => {
    test('fails if table has insufficient rows', () => {
      $rules = {
        minrows: 10
      };
      expectErrors(['expected at least 10 rows, only have 3']);
    });

    test('passes if table has sufficient rows', () => {
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
        $rules = {
          data: [{ column: 0, row: 'ANY', rule: /apple/ }]
        };
        expectErrors([]);
      });

      test('fails if no row matches', () => {
        $rules = {
          data: [{ row: 'ANY', column: 0, rule: /UNKNOWN/ }]
        };
        expectErrors(['no row in column 0 matches /UNKNOWN/']);
      });

      test('can use numeric regex', () => {
        $rules = {
          data: [
            { column: 1, row: 'ANY', rule: /^[0-9]+$/ },
            { column: 2, row: 'ANY', rule: /^[a-z]+$/ }
          ]
        };
        expectErrors(['no row in column 2 matches /^[a-z]+$/']);
      });

      test('reports error if a rule refers to a non-existent column', () => {
        $rules = {
          data: [
            { column: 17, row: 'ANY', rule: /^[0-9]+$/ },
            { column: 'a', row: 'ANY', rule: /^[a-z]+$/ }
          ]
        };
        expectErrors(['data column 17 does not exist', 'data column a does not exist']);
      });
    });

    describe('all rows', () => {
      test('passes if all rows match', () => {
        $rules = {
          data: [
            { column: 0, row: 'ALL', rule: /county/ },
            { column: 1, row: 'ALL', rule: /^[0-9]+$/ }
          ]
        };
        expectErrors([]);
      });

      test('fails if any rows do not match', () => {
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
        $rules = {
          data: [{ column: 0, row: 0, rule: /location/ }]
        };
        expectErrors([]);
      });

      test('fails if cell does not match', () => {
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
});
