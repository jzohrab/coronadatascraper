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
    const headerrow = table.find('tr').first();
    const headingCellTag = 'th';

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
          const msg = `heading ${column} value "${heading}" did not match regex ${rule}`;
          errs.push(msg);
        }
      } else if (rule instanceof String) {
        if (rule !== heading) errs.push(`xxxSTRING failure`);
      } else {
        throw new Error(`Unhandled heading rule ${rule}`);
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

    /*
    test('', () => {
    });

null table
rule failed
empty table
... try each spec rule in order
etc
*/
  });

  describe('headers', () => {
    test('one header with regex', () => {
      const rules = {
        headings: {
          0: /shouldfail/
        }
      };
      const v = new HtmlTableValidor(rules);
      expect(v.success($table)).toBe(false);
      expect(v.errors($table)).toEqual(['heading 0 value "county" did not match regex /shouldfail/']);
    });

    test('multiple headers with regexes', () => {
      const rules = {
        headings: {
          0: /shouldfail/,
          1: /another_bad/
        }
      };
      const v = new HtmlTableValidor(rules);
      expect(v.success($table)).toBe(false);
      const expected = [
        'heading 0 value "county" did not match regex /shouldfail/',
        'heading 1 value "cases" did not match regex /another_bad/'
      ];
      expect(v.errors($table)).toEqual(expected);
    });

    test('successful regex checks', () => {
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

    test('regex checks can be case-insensitive', () => {
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

    /*
case-insense match
can use tr for header row cells
headers with empty table
exact string matches
bad search type fails
*/
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

  /*
  TODO_describe('checks invalid schema', () => {
schema should only contain expected rules
  });
  */
});
