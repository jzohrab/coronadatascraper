// Test
import cheerio from 'cheerio';
import each from 'jest-each';

// TODO: move this to its own file
// TODO: code review on ... code style and everything, naming conventions, etc.
class HtmlTableValidor {
  constructor(rules) {
    this.rules = rules;
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

    if ('headings' in this.rules) {
      const he = HtmlTableValidor.checkHeadings(table, this.rules.headings);
      result.push(...he);
    }

    return result;
  }

  static checkHeadings(table, headingRules) {
    // ASSUMPTION: header is on first row.
    const headerrow = table.find('tr').first();

    // ASSUMPTION: using th or td for headings.
    let headingCellTag = 'th';
    if (headerrow.find('th').length === 0) headingCellTag = 'td';

    const errs = [];
    // eslint-disable-next-line guard-for-in
    for (const column in headingRules) {
      const heading = headerrow
        .find(headingCellTag)
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
        console.error(msg);
        throw new Error(msg);
      }
    }

    return errs;
  }

  /* eslint-ensable class-methods-use-this, no-unused-vars */
  // TODO remove these elint things
}

// ############## SAMPLE CODE - will be removed #############

/*
  const $ = cheerio.load(h);
  console.log($.html());
  console.log(
  $('table#tid')
  .first()
  .html()
  );
*/

/*
  const $table = $('table#tid').eq(0);
  const $trs = $table.find('tr');
  console.log(`got ${$trs.length} trs`);
  $trs.each((index, tr) => {
  const $tr = $(tr);
  console.log($tr.find('td:first-child').text());
  });
*/

// ############## END SAMPLE CODE - will be removed #############

// Tests - everything above this will be removed, or go into another file

describe('html-table-schema-validator', () => {
  const $html = `
<html>
  <body>
    <table id="tid">
      <tr>
        <th>county</th><th>cases</th><th>deaths</th>
      </tr>
      <tr>
        <td>apple county</td><td>11</td><td>1</td>
      </tr>
      <tr>
        <td>bowls county</td><td>22</td><td>2</td>
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

    test.todo('no error if empty table but no rules');
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

    test('can check headers with strings', () => {
      const rules = {
        headings: {
          0: 'something',
          1: 'Cases'
        }
      };
      const v = new HtmlTableValidor(rules);
      expect(v.success($table)).toBe(false);
      const expected = [
        'heading 0 "county" did not match string "something"',
        'heading 1 "cases" did not match string "Cases"'
      ];
      expect(v.errors($table)).toEqual(expected);
    });

    test('can use <td> for header cells', () => {
      const trhtml = $html.replace(/<th>/g, '<td>').replace(/<\/th>/g, '</td>');
      const c = cheerio.load(trhtml);
      $table = c('table#tid').eq(0);
      const rules = {
        headings: {
          0: 'something',
          1: 'Cases'
        }
      };
      const v = new HtmlTableValidor(rules);
      expect(v.success($table)).toBe(false);
      const expected = [
        'heading 0 "county" did not match string "something"',
        'heading 1 "cases" did not match string "Cases"'
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

    test.todo('reports error if a rule refers to a non-existent column');
    test.todo('reports error if there is no table header row');
  });

  describe('success', () => {
    test('success if no validation rules', () => {
      const h = '<html><body><table id="tid"><tr><td>a</td></tr><tr><td>1</td></tr></table></body></html>';

      const $ = cheerio.load(h);
      const $table = $('table#tid').eq(0);

      const rules = {};
      const v = new HtmlTableValidor(rules);
      expect(v.success($table)).toBe(true);
    });
  });

  test.todo('should have min rows');
  test.todo('check column contents');
  test.todo('checks invalid schema rules');
});
