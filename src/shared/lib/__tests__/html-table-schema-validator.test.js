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
    // TODO - remove all commented out console.log calls.
    console.log("CHECKING RULES ***********"); // TODO
    console.log(rules); // TODO
    
    for (var k in rules.headings) {
      var r = rules.headings[k];
      console.log(r); // TODO
      console.log(typeof(r)); // TODO
      console.log(r instanceof RegExp); // TODO
      if (!(r instanceof RegExp)) {
        throw new Error(`${r} is not a RegExp`);
      }
    }

    rules.data.forEach((r) => {
      if (!(r.rule instanceof RegExp)) {
        console.error(r.rule);
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

      if (rule instanceof RegExp) {
        if (!rule.test(heading)) {
          const msg = `heading ${column} "${heading}" did not match regex ${rule}`;
          errs.push(msg);
        }
      } else if (typeof rule === 'string') {
        if (rule !== heading) {
          const msg = `heading ${column} "${heading}" did not match string "${rule}"`;
          errs.push(msg);
        }
      } else {
        const msg = `Unhandled heading rule ${rule} of type ${typeof rule}`;
        throw new Error(msg);
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
    for (const rule in badRules) {
      errs.push(`Data column ${rule.column} does not exist`);
    }

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
          let dr = datatrs[index];
          let td = dr.children[rule.column];
          let txt = td.children[0].data;
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
  // For some tests, we replace the data tokens
  // A_* and B_* with actual values.
  const $html = `
<html>
  <body>
    <table id="tid">
      <tr>
        <th>county</th><th>cases</th><th>deaths</th>
      </tr>
      <tr>
        <td>A_NAME</td><td>A_C</td><td>A_D</td>
      </tr>
      <tr>
        <td>B_NAME</td><td>B_C</td><td>B_D</td>
      </tr>
    </table>
  </body>
</html>`;

  let $table = null;

  beforeEach(() => {
    const $ = cheerio.load($html);
    $table = $('table#tid').eq(0);

    // Verify no screwups.
    const headerrow = $table.find('tr').first();
    expect(headerrow.find('th')).toHaveLength(3);
  });

  describe('errors', () => {
    test('no errors if no rules', () => {
      const v = new HtmlTableValidor({});
      expect(v.success($table)).toBe(true);
      expect(v.errors($table)).toEqual([]);
    });

    const noTable = [null, undefined];
    each(noTable).test('error if table is %s', t => {
      const v = new HtmlTableValidor({});
      expect(v.success(t)).toBe(false);
      expect(v.errors(t)).toEqual(['null/undefined table']);
    });

    test('no error if empty table but no rules', () => {
      const norows = '<html><head><table id="tid"></table></head></html>';
      const c = cheerio.load(norows);
      $table = c('table#tid').eq(0);
      const rules = {};
      const v = new HtmlTableValidor(rules);
      expect(v.success($table)).toBe(true);
    });
  });

  describe('headers', () => {
    test('can check header with regex', () => {
      const rules = {
        headings: {
          0: /shouldfail/
        }
      };
      const v = new HtmlTableValidor(rules);
      expect(v.success($table)).toBe(false);
      const expected = ['heading 0 "county" did not match regex /shouldfail/'];
      expect(v.errors($table)).toEqual(expected);
    });

    test('can check multiple headers at once', () => {
      const rules = {
        headings: {
          0: /shouldfail/,
          1: /another_bad/
        }
      };
      const v = new HtmlTableValidor(rules);
      expect(v.success($table)).toBe(false);
      const expected = [
        'heading 0 "county" did not match regex /shouldfail/',
        'heading 1 "cases" did not match regex /another_bad/'
      ];
      expect(v.errors($table)).toEqual(expected);
    });

    test('passes if all regexes match', () => {
      const rules = {
        headings: {
          0: /county/,
          1: /cases/,
          2: /deaths/
        }
      };
      const v = new HtmlTableValidor(rules);
      expect(v.success($table)).toBe(true);
      expect(v.errors($table)).toEqual([]);
    });

    test('fails if regex must match exactly', () => {
      const rules = {
        headings: {
          0: /county/,
          1: /^cases $/,
          2: /^ deaths $/
        }
      };
      const v = new HtmlTableValidor(rules);
      expect(v.success($table)).toBe(false);
      const expected = [
        'heading 1 "cases" did not match regex /^cases $/',
        'heading 2 "deaths" did not match regex /^ deaths $/'
      ];
      expect(v.errors($table)).toEqual(expected);
    });

    test('can check with case-insensitive regex', () => {
      const rules = {
        headings: {
          0: /county/i,
          1: /CASES/i,
          2: /DEATHS/i
        }
      };
      const v = new HtmlTableValidor(rules);
      expect(v.success($table)).toBe(true);
      expect(v.errors($table)).toEqual([]);
    });

    test('can use <td> for header cells', () => {
      const trhtml = $html.replace(/<th>/g, '<td>').replace(/<\/th>/g, '</td>');
      const c = cheerio.load(trhtml);
      $table = c('table#tid').eq(0);
      const rules = {
        headings: {
          0: '/something/',
          1: '/Cases/'
        }
      };
      const v = new HtmlTableValidor(rules);
      expect(v.success($table)).toBe(false);
      const expected = [
        'heading 0 "county" did not match regex /something/',
        'heading 1 "cases" did not match regex /Cases/'
      ];
      expect(v.errors($table)).toEqual(expected);
    });

    test('throws error if a bad rule is used', () => {
      const rules = {
        headings: { 0: {} }
      };
      const v = new HtmlTableValidor(rules);
      expect(() => {
        v.success($table);
      }).toThrow();
    });

    // TODO remove only
    test.only('reports error if no rows in table', () => {
      const norows = '<html><head><table id="tid"></table></head></html>';
      const c = cheerio.load(norows);
      $table = c('table#tid').eq(0);
      const rules = {
        headings: {
          0: /something/
        }
      };
      const v = new HtmlTableValidor(rules);
      expect(v.success($table)).toBe(false);
      const expected = ['no rows in table'];
      expect(v.errors($table)).toEqual(expected);
    });

    test('reports error if a rule refers to a non-existent column', () => {
      const rules = {
        headings: {
          'a': /something/,
          17: /Cases/
        }
      };
      const v = new HtmlTableValidor(rules);
      expect(v.success($table)).toBe(false);
      const expected = [
        'heading column 17 does not exist',
        'heading column a does not exist',
      ];
      expect(v.errors($table)).toEqual(expected);
    });
  });

  describe('minrows', () => {
    test('fails if table has insufficient rows', () => {
      const rules = {
        minrows: 10
      };
      const v = new HtmlTableValidor(rules);
      const expected = [
        'expected at least 10 rows, only have 3'
      ];
      expect(v.errors($table)).toEqual(expected);
      expect(v.success($table)).toBe(false);
    });

    test('passes if table has sufficient rows', () => {
      const rules = {
        minrows: 1
      };
      const v = new HtmlTableValidor(rules);
      expect(v.success($table)).toBe(true);
    });
  });

  describe('data row column checks', () => {

    function build_table(data) {
      let table_rows = data.
          split(/[\r\n]+/).
          filter(lin => lin.trim() != '').
          map(lin => lin.replace(/^ +/g, '')).
          map(lin => lin.split('|').
              map(el => `<td>${el.trim()}</td>`).join('')
             ).
          map(lin => `<tr>${lin.trim()}</tr>`).join("\n");

        const tmp = `
<html>
  <body>
    <table id="tid">
      <tr>
        <th>county</th><th>cases</th><th>deaths</th>
      </tr>
${table_rows}
    </table>
  </body>
</html>`;
      const c = cheerio.load(tmp);
      let ret = c('table#tid').eq(0);
      // console.log($table.html());
      return ret;
    }

    /* TODO REMOVE THIS
    // Note: load Cases col first, then Deaths.
    function data_table(options) {
      let values = {
        A_NAME: 'a county',
        B_NAME: 'b county',
        A_C: 0,
        B_C: 0,
        A_D: 0,
        B_D: 0
      };
      for (var k in options) {
        values[k] = options[k];
      }

      // Do replacement
      let html = $html;
      for (var k in values)
        html = html.replace(k, values[k]);

      const html = $html.
            replace('A_C', values.A_C).
            replace('A_D', values.A_D).
            replace('B_C', values.B_C).
            replace('B_D', values.B_D);

      console.log(html);

      const c = cheerio.load(html);
      $table = c('table#tid').eq(0);
      return $table;
    }
    */  // END TODO

    /*
    test('aoeuaouaoeu', () => {
      build_table(
        `apple county|10|20
         deer counter|66|77`
      );
    });

      const $html = `
<html>
  <body>
    <table id="tid">
      <tr>
        <th>county</th><th>cases</th><th>deaths</th>
      </tr>
      <tr>
        <td>A_NAME</td><td>A_C</td><td>A_D</td>
      </tr>
      <tr>
        <td>B_NAME</td><td>B_C</td><td>B_D</td>
      </tr>
    </table>
  </body>
</html>`;
    */
    
    describe('any row', () => {

      let $table = build_table(
        `apple county| 10| 20
         deer county | 66| 77`
      );
      
      describe('regex', () => {
        test('passes if any row matches', () => {
          const rules = {
            data: [
              { row: 'ANY', column: 0, rule: /apple/ }
            ]
          };
          // console.log($table.html());
          const v = new HtmlTableValidor(rules);
          expect(v.success($table)).toBe(true);
          const expected = [];
          expect(v.errors($table)).toEqual(expected);
        });
 
        test('fails if no row matches', () => {
          const rules = {
            data: [
              { row: 'ANY', column: 0, rule: /UNKNOWN/ }
            ]
          };
          const v = new HtmlTableValidor(rules);
          expect(v.success($table)).toBe(false);
          const expected = [
            'no row in column 0 matches regex /UNKNOWN/'
          ];
          expect(v.errors($table)).toEqual(expected);
        });
        
        test.todo('can use numeric regex');
        test.todo('bad column');
      });

      describe('string', () => {
        test.todo('passes if any row matches');
        test.todo('fails if no row matches');
        test.todo('bad column');
      });
              
    });

    describe('all rows', () => {
      describe('regex', () => {
        test.todo('passes if all rows match');
        test.todo('fails if any row does not match');
        test.todo('can use numeric regex');
        test.todo('bad column');
      });
    });

    describe('single cell', () => {
      describe('regex', () => {
        test.todo('passes if match');
        test.todo('fails if does not match');
        test.todo('bad cell coords');
      });
      describe('string', () => {
        test.todo('passes if match');
        test.todo('fails if does not match');
        test.todo('bad cell coords');
      });
    });
  });
  
  test.todo('checks invalid schema rules');
});
