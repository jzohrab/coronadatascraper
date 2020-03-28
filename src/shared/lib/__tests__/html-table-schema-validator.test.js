// Test
import cheerio from 'cheerio';

// TODO: move this to its own file
// TODO: code review on ... code style and everything, naming conventions, etc.
class HtmlTableValidor {
  constructor(rules) {
    this.rules = rules;
  }

  // TODO remove these elint things
  /* eslint-disable class-methods-use-this, no-unused-vars */
  success(table) {
    // hacks to get past lint.
    table = null;
    return true;
  }
  /* eslint-ensable class-methods-use-this, no-unused-vars */
  // TODO remove these elint things
}

// //// SAMPLE CODE - will be removed

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

// //// END SAMPLE CODE - will be removed

// Tests - everything above this will be removed, or go into another file

describe('html-table-schema-validator', () => {
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
  TODO_describe('errors', () => {
null table
rule failed
empty table
... try each spec rule in order
etc
  });

  TODO_describe('checks invalid schema', () => {
schema should only contain expected rules
  });
  */
});
