// Test
import cheerio from 'cheerio';
import each from 'jest-each';

// TODO: move this to its own file
// TODO: code review on ... code style and everything, naming conventions, etc.
class HtmlTableValidor {
  constructor(rules) {
    let setrules = {
      headings: {},
      minrows: 0,
      data: []
    }
    for (var k in rules)
      setrules[k] = rules[k];

    HtmlTableValidor.validateRules(setrules);
    this.rules = setrules;
  }

  // Throws exception if the rules are not valid.
  static validateRules(rules) {
    for (var k in rules.headings) {
      var r = rules.headings[k];
      if (!(r instanceof RegExp)) {
        throw new Error(`${r} is not a RegExp`);
      }
    }

    rules.data.forEach((r) => {
      if (!(r.rule instanceof RegExp)) {
        throw new Error(`${r.rule} is not a RegExp`);
      }
    });
  }
  
  // TODO remove these elint things
  /* eslint-disable class-methods-use-this, no-unused-vars */
  success(table) {
    return this.errors(table).length === 0;
  }

  // Returns list of error messages.
  errors(table) {
    const result = [];
    if (table === null || table === undefined) {
      result.push('null/undefined table');
      return result;
    }

    // ASSUMPTION: table must have 1 header row,
    // and at least one data row.
    const trs = table.find('tr');
    if (trs.length <= 1) {
      return ['no rows in table'];
    }

    if ('headings' in this.rules) {
      const he = HtmlTableValidor.checkHeadings(table, this.rules.headings);
      result.push(...he);
    }

    if ('minrows' in this.rules) {
      const re = HtmlTableValidor.checkMinRows(table, this.rules.minrows);
      result.push(...re);
    }

    if ('data' in this.rules) {
      const de = HtmlTableValidor.checkData(table, this.rules.data);
      result.push(...de);
    }

    return result;
  }

  static checkHeadings(table, headingRules) {
    const trs = table.find('tr');
    
    // ASSUMPTION: header is on first row.
    const headerrow = trs.first();

    let headingCellTag = 'th';
    if (headerrow.find('th').length === 0) headingCellTag = 'td';

    const errs = [];
    // eslint-disable-next-line guard-for-in
    for (const column in headingRules) {
      if (isNaN(column)) {
        errs.push(`heading column ${column} does not exist`);
        continue;
      }

      const headings = headerrow.find(headingCellTag);

      if (parseInt(column) > headings.length) {
        errs.push(`heading column ${column} does not exist`);
        continue;
      }
      
      const heading = headings
        .eq(column)
        .text();
      const rule = headingRules[column];

      if (!rule.test(heading)) {
        const msg = `heading ${column} "${heading}" did not match regex ${rule}`;
        errs.push(msg);
      }
    }

    return errs;
  }

  static checkMinRows(table, minrows) {
    const trs = table.find('tr');
    if (trs.length < parseInt(minrows)) {
      return [`expected at least ${minrows} rows, only have ${trs.length}`];
    }
    return [];
  }


  static validColumnNumber(n, data_row) {
    if (isNaN(n))
      return false;
    if (parseInt(n) > data_row.find('td').length - 1)
      return false;
    return true;
  }
  
  static checkData(table, dataRules) {
    const trs = table.find('tr');

    // ASSUMPTION: data starts on the second row.
    const datatrs = trs.slice(1);
    // console.log(`Have ${datatrs.length} data rows`);

    const errs = [];

    // eslint-disable-next-line guard-for-in
    const badRules = dataRules.filter(r => !HtmlTableValidor.validColumnNumber(r.column, datatrs.eq(0)));
    badRules.forEach((rule) => {
      errs.push(`data column ${rule.column} does not exist`);
    });

    const validRules = dataRules.filter(r => HtmlTableValidor.validColumnNumber(r.column, datatrs.eq(0)));

    let anyRules = validRules.filter(r => (r.row === 'ANY'));
    
    anyRules.forEach((rule) => {
        let matches = false;
        // Using for loop to allow for break and exit
        // (can't break if we use forEach with anon function).
        for(var index = 0; index < datatrs.length; ++index) {
          // TODO code review: I feel this is brittle, and there's
          // probably a better way to do this.  I saw in some scrapers
          // people were doing magic like '$tr.find('td:last-child').text()',
          // and I saw they had defined '$' as a constant, but I couldn't figure
          // out how to do that in this code.
          let dr = datatrs.eq(index);
          console.log('DR CHILDREN **************************');
          console.log(dr.children);
          let td = dr.find('td').eq(rule.column);
          // let txt = td.children[0].data.trim();
          let txt = td.text();
          console.log(`    ${txt}`);
          if (rule.rule.test(txt)) {
            matches = true;
            break;
          }
        };
        if (!matches) {
          errs.push(`no row in column ${rule.column} matches regex ${rule.rule}`);
        }
      });

    return errs;
  }
  /* eslint-ensable class-methods-use-this, no-unused-vars */
  // TODO remove these elint things

} // end class


// ############## SAMPLE CODE - will be removed #############
/*
  const $ = cheerio.load(h);
  console.log($.html());
  console.log(
  $('table#tid')
  .first()
  .html()
  );

  const $table = $('table#tid').eq(0);
  const $trs = $table.find('tr');
  console.log(`got ${$trs.length} trs`);
  $trs.each((index, tr) => {
    const $tr = $(tr);
    console.log($tr.find('td:first-child').text());
  });
*/

// ############## END SAMPLE CODE - will be removed #############



// #########################################################
// Tests - everything above this will be removed, or go into another file

// TODO - refactor tests, lots of duplication on checking validation good or not.

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
        <th>county</th><th>cases</th><th>deaths</th>
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
    var shouldBeSuccessful = (expected.length === 0);
    const v = new HtmlTableValidor($rules);
    expect(v.success($table)).toBe(shouldBeSuccessful);
    let actual = v.errors($table);
    console.log(actual);
    expect(actual).toEqual(expected);
  }


  describe('constructor', () => {
    test('throws error if a bad rule is used', () => {
      const rules = {
        headings: { 0: {} }
      };
      expect(() => {
        const v = new HtmlTableValidor(rules);
      }).toThrow();
    });

    test.todo('checks invalid schema rules');
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
      expectErrors(['heading 0 "county" did not match regex /shouldfail/']);
    });

    test('can check multiple headers at once', () => {
      $rules = {
        headings: {
          0: /shouldfail/,
          1: /another_bad/
        }
      };
      expectErrors([
        'heading 0 "county" did not match regex /shouldfail/',
        'heading 1 "cases" did not match regex /another_bad/'
      ]);
    });

    test('passes if all regexes match', () => {
      $rules = {
        headings: {
          0: /county/,
          1: /cases/,
          2: /deaths/
        }
      };
      expectErrors([]);
    });

    test('can use exact-matching regexes', () => {
      $rules = {
        headings: {
          0: /county/,
          1: /^cases $/,
          2: /^ deaths $/
        }
      };
      expectErrors([
        'heading 1 "cases" did not match regex /^cases $/',
        'heading 2 "deaths" did not match regex /^ deaths $/'
      ]);
    });

    test('can use case-insensitive regex', () => {
      $rules = {
        headings: {
          0: /county/i,
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
      expectErrors([
        'heading 0 "county" did not match regex /something/',
        'heading 1 "cases" did not match regex /Cases/'
      ]);
    });

    test('reports error if a rule refers to a non-existent column', () => {
      $rules = {
        headings: {
          'a': /something/,
          17: /Cases/
        }
      };
      expectErrors([
        'heading column 17 does not exist',
        'heading column a does not exist',
      ]);
    });
  });

  describe('minrows', () => {
    test('fails if table has insufficient rows', () => {
      $rules = {
        minrows: 10
      };
      expectErrors([
        'expected at least 10 rows, only have 3'
      ]);
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
          data: [
            { column: 0, row: 'ANY', rule: /apple/ }
          ]
        };
        expectErrors([]);
      });
      
      test('fails if no row matches', () => {
        $rules = {
          data: [ { row: 'ANY', column: 0, rule: /UNKNOWN/ } ]
        };
        expectErrors([
          'no row in column 0 matches regex /UNKNOWN/'
        ]);
      });
        
      test.only('can use numeric regex', () => {
        $rules = {
          data: [
            { column: 1, row: 'ANY', rule: /^[0-9]+$/ },
            { column: 2, row: 'ANY', rule: /^[a-z]+$/ }
          ]
        };
        expectErrors([
          'no row in column 2 matches regex /^[a-z]+$/'
        ]);
      });
      
      test('reports error if a rule refers to a non-existent column', () => {
        $rules = {
          data: [
            { column: 17, row: 'ANY', rule: /^[0-9]+$/ },
            { column: 'a', row: 'ANY', rule: /^[a-z]+$/ }
          ]
        };
        expectErrors([
          'data column 17 does not exist',
          'data column a does not exist',
        ]);
    });

    });

    describe('all rows', () => {
      test.todo('passes if all rows match');
      test.todo('fails if any row does not match');
      test.todo('can use numeric regex');
      test.todo('bad column');
    });

    describe('single cell', () => {
      test.todo('passes if match');
      test.todo('fails if does not match');
      test.todo('bad cell coords');
    });

  
  });

});
