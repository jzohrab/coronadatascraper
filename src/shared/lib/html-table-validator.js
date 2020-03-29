/**
HTML table structure validator.

Scrapers break occasionally due to their source HTML tables changing.
This class provides a few simple checks to verify that the structure
is as expected.

Summary: Create an HtmlTableValidor, giving some rules to it.  Then
call errors($table) to see any error messages, or success($table) if
you just care about true/false.

Example:

Suppose you have the following table

    <html>
      <body>
        <table id="tid">
          <tr>
            <th>location</th>
            <th>cases</th>
            <th>deaths</th>
          </tr>
          <tr>
            <td>apple county</td>
            <td>10</td>
            <td>20</td>
          </tr>
          <tr>
            <td>deer county</td>
            <td>66</td>
            <td>77</td>
          </tr>
        </table>
      </body>
    </html>

You can create a hash of rules that the table should match:

    const rules = {
      headings: {
        0: /location/,
        1: /cases/,
        2: /deaths/
      },
      minrows: 2,
      data: [
        { column: 0, row: 'ANY', rule: /apple/i },
        { column: 0, row: 'ALL', rule: /county$/ },
        { column: 1, row: 'ALL', rule: /^[0-9]+$/ },
        { column: 2, row: 'ALL', rule: /^[0-9]+$/ },
        { column: 0, row: 2, rule: /deer/ }
      ]
    };

Notes:

* you don't have to pass all the rules, just the ones you need.
* the data rules support ANY, ALL, or a number.
* all rules are regexes.
* unknown or incorrect rules will throw an exception.

With the rules described, instatiate a validator, and give it your
cheerio table:

    const v = new HtmlTableValidor(rules);
    if (!v.success($table)) {
      // Some rules failed ...
      console.log(v.errors($table);
    }
*/
export default class HtmlTableValidor {
  constructor(rules) {
    const setrules = {
      headings: {},
      minrows: 0,
      data: []
    };

    for (const k in rules) {
      if (!Object.keys(setrules).includes(k)) {
        const msg = `bad rule key ${k}`;
        console.log(msg);
        throw new Error(msg);
      }
    }

    // eslint-disable-next-line guard-for-in
    for (const k in rules) setrules[k] = rules[k];

    HtmlTableValidor.validateRules(setrules);
    this.rules = setrules;
  }

  // Throws exception if the rules are not valid.
  static validateRules(rules) {
    // eslint-disable-next-line guard-for-in
    for (const k in rules.headings) {
      const r = rules.headings[k];
      if (!(r instanceof RegExp)) {
        throw new Error(`${r} is not a RegExp`);
      }
    }

    rules.data.forEach(r => {
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
      // eslint-disable-next-line no-restricted-globals
      if (isNaN(column)) {
        errs.push(`heading column ${column} does not exist`);
        continue;
      }

      const headings = headerrow.find(headingCellTag);

      if (parseInt(column, 10) > headings.length) {
        errs.push(`heading column ${column} does not exist`);
        continue;
      }

      const heading = headings.eq(column).text();
      const rule = headingRules[column];

      if (!rule.test(heading)) {
        const msg = `heading ${column} "${heading}" did not match ${rule}`;
        errs.push(msg);
      }
    }

    return errs;
  }

  static checkMinRows(table, minrows) {
    const trs = table.find('tr');
    if (trs.length < parseInt(minrows, 10)) {
      return [`expected at least ${minrows} rows, only have ${trs.length}`];
    }
    return [];
  }

  static checkData(table, dataRules) {
    const trs = table.find('tr');

    // ASSUMPTION: data starts on the second row.
    const datatrs = trs.slice(1);
    // console.log(`Have ${datatrs.length} data rows`);

    const errs = [];

    const validColNum = n => {
      // eslint-disable-next-line no-restricted-globals
      if (isNaN(n)) return false;
      const firstRow = datatrs.eq(0);
      if (parseInt(n, 10) > firstRow.find('td').length - 1) return false;
      return true;
    };

    const badRules = dataRules.filter(r => !validColNum(r.column));
    const validRules = dataRules.filter(r => validColNum(r.column));

    badRules.forEach(rule => {
      errs.push(`data column ${rule.column} does not exist`);
    });

    const anyRules = validRules.filter(r => r.row === 'ANY');
    anyRules.forEach(rule => {
      let matches = false;
      // Using for loop to allow for break and exit
      // (can't break if we use forEach with anon function).
      for (let index = 0; index < datatrs.length; ++index) {
        // TODO code review - ok here?
        const dr = datatrs.eq(index);
        const td = dr.find('td').eq(rule.column);
        const txt = td.text();
        // console.log(`    ${txt}`);
        if (rule.rule.test(txt)) {
          matches = true;
          break;
        }
      }
      if (!matches) {
        errs.push(`no row in column ${rule.column} matches ${rule.rule}`);
      }
    });

    const allRules = validRules.filter(r => r.row === 'ALL');
    allRules.forEach(rule => {
      let matches = true;
      // Using for loop to allow for break and exit
      // (can't break if we use forEach with anon function).
      for (let index = 0; index < datatrs.length; ++index) {
        const dr = datatrs.eq(index);
        const td = dr.find('td').eq(rule.column);
        const txt = td.text();
        // console.log(`    ${txt}`);
        if (!rule.rule.test(txt)) {
          matches = false;
          break;
        }
      }
      if (!matches) {
        errs.push(`some rows in column ${rule.column} do not match ${rule.rule}`);
      }
    });

    const cellRules = validRules.filter(r => r.row !== 'ALL' && r.row !== 'ANY');
    cellRules.forEach(rule => {
      const r = parseInt(rule.row, 10);
      const c = parseInt(rule.column, 10);
      const dr = trs.eq(r);

      // Have to check for th or td ...
      let cells = dr.find('td');
      if (cells.length === 0) cells = dr.find('th');
      const cell = cells.eq(c);
      const txt = cell.text();
      if (!rule.rule.test(txt)) {
        errs.push(`cell[${r}, ${c}] value "${txt}" does not match ${rule.rule}`);
      }
    });

    return errs;
  }
  /* eslint-ensable class-methods-use-this, no-unused-vars */
  // TODO remove these elint things?
} // end class
