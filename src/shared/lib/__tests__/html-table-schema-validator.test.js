// Test
import cheerio from 'cheerio';

describe('html-table-schema-validator', () => {
  describe('success', () => {
    // test('adds 1 + 2 to equal 3', () => {
    //  expect(1 + 4).toBe(3);
    // });

    test('success if no validation rules', () => {
      const h = '<html><body><table id="tid"><tr><td>a</td></tr><tr><td>1</td></tr></table></body></html>';

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
    });
  });

  /*
  describe('errors', () => {
null table
rule failed
empty table
... try each spec rule in order
etc
  });

  describe('checks invalid schema', () => {
    test('adds 1 + 2 to equal 3', () => {
      expect(1 + 4).toBe(3);
    });
  });
  */
});
