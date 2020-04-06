import * as fetch from '../../../lib/fetch/index.js';
import * as parse from '../../../lib/parse.js';
import * as transform from '../../../lib/transform.js';
import * as geography from '../../../lib/geography/index.js';

// Set county to this if you only have state data, but this isn't the entire state
// const UNASSIGNED = '(unassigned)';

const scraper = {
  scraperType: 'crawl-and-scrape',
  state: 'PA',
  country: 'iso1:US',
  aggregate: 'county',
  sources: [
    {
      url: 'https://www.health.pa.gov/',
      name: 'Pennsylvania Department of Health'
    }
  ],
  _counties: [
    'Adams County',
    'Allegheny County',
    'Armstrong County',
    'Beaver County',
    'Bedford County',
    'Berks County',
    'Blair County',
    'Bradford County',
    'Bucks County',
    'Butler County',
    'Cambria County',
    'Cameron County',
    'Carbon County',
    'Centre County',
    'Chester County',
    'Clarion County',
    'Clearfield County',
    'Clinton County',
    'Columbia County',
    'Crawford County',
    'Cumberland County',
    'Dauphin County',
    'Delaware County',
    'Elk County',
    'Erie County',
    'Fayette County',
    'Forest County',
    'Franklin County',
    'Fulton County',
    'Greene County',
    'Huntingdon County',
    'Indiana County',
    'Jefferson County',
    'Juniata County',
    'Lackawanna County',
    'Lancaster County',
    'Lawrence County',
    'Lebanon County',
    'Lehigh County',
    'Luzerne County',
    'Lycoming County',
    'McKean County',
    'Mercer County',
    'Mifflin County',
    'Monroe County',
    'Montgomery County',
    'Montour County',
    'Northampton County',
    'Northumberland County',
    'Perry County',
    'Philadelphia County',
    'Pike County',
    'Potter County',
    'Schuylkill County',
    'Snyder County',
    'Somerset County',
    'Sullivan County',
    'Susquehanna County',
    'Tioga County',
    'Union County',
    'Venango County',
    'Warren County',
    'Washington County',
    'Wayne County',
    'Westmoreland County',
    'Wyoming County',
    'York County'
  ],
  crawler: {
    // Option: always require a fully-spelled out source.
    '0': [
      {
        'url': 'https://www.health.pa.gov/topics/disease/Pages/Coronavirus.aspx',
        'type': 'page',
        'cacheKey': 'A'
      }
    ],

    // Option: if they only have 1 data source for a time, they can
    // simplify the call to just the hash, and drop the cacheKey.
    '2020-04-44': {
      'url': '...',
      'type': 'page'
    }

    // Option: multiple data sources.  Specified as an array b/c the
    // fetch and save mult be atomic.  cacheKey ensures sources can be
    // determined reliably when fetching the set from the cache.
    '2020-05-55': [
      {
        'url': 'x',
        'type': 'page',
        'cacheKey': 'A'
      },
      {
        'url': '5',
        'type': 'json',
        'cacheKey': 'B'
      }
    ]
  },

  // Each scraper just gets source data and scrapes it.  The
  // controlling program fetches the latest data from the cache, and
  // determines the appropriate scraper it should use.
  scraper: {
    '0': async function scraper(data) {
      this.type = 'list';
      let counties = [];
      const $ = data['A']
      const $lis = $('li:contains("Counties impacted to date include")')
        .nextAll('ul')
        .first()
        .find('li');
      $lis.each((index, li) => {
        const matches = $(li)
          .text()
          .match(/([A-Za-z]+) \((\d+\))/);
        if (matches) {
          const county = geography.getCounty(geography.addCounty(parse.string(matches[1])), 'PA');
          const cases = parse.number(matches[2]);
          counties.push({
            county,
            cases
          });
        }
      });
      counties.push(transform.sumData(counties));
      counties = geography.addEmptyRegions(counties, this._counties, 'county');
      return counties;
    },
    '2020-03-16': async function scraper(data) {
      // OPTION: if data only contains one source, it's just the actual data.
      const $ = data;
      this.type = 'table';
      const $table = $('table.ms-rteTable-default').first();
      const $trs = $table.find('tbody > tr');
      let counties = [];
      $trs.each((index, tr) => {
        const $tr = $(tr);
        const data = {
          county: geography.getCounty(geography.addCounty(parse.string($tr.find('td:first-child').text())), 'PA'),
          cases: parse.number($tr.find('td:last-child').text())
        };
        counties.push(data);
      });
      counties.push(transform.sumData(counties));
      counties = geography.addEmptyRegions(counties, this._counties, 'county');
      return counties;
    },
    '2020-03-17': async function scraper($) {
      this.type = 'table';
      const $trs = $table.find('tbody > tr');
      let counties = [];
      $trs.each((index, tr) => {
        const $tr = $(tr);
        const data = {
          county: geography.getCounty(geography.addCounty(parse.string($tr.find('td:first-child').text())), 'PA'),
          cases: parse.number($tr.find('td:last-child').text())
        };
        counties.push(data);
      });
      counties.push(transform.sumData(counties));
      counties = geography.addEmptyRegions(counties, this._counties, 'county');
      return counties;
    },
    '2020-03-18': async function scraper(data) {
      // OPTION: multiple data sources, returned and keyed by cacheKey:
      const $ = data['A'];
      
      this.type = 'table';
      const $countyTable = $('th:contains("County")').closest('table');
      const $trs = $countyTable.find('tbody > tr:not(:first-child)');
      let counties = [];
      $trs.each((index, tr) => {
        const $tr = $(tr);
        counties.push({
          county: geography.getCounty(geography.addCounty(parse.string($tr.find('td:first-child').text())), 'PA'),
          cases: parse.number($tr.find('td:nth-child(2)').text()),
          deaths: parse.number(parse.string($tr.find('td:last-child').text()) || 0)
        });
      });
      const $stateTable = $('table.ms-rteTable-default').eq(0);
      const stateData = transform.sumData(counties);
      stateData.tested =
        parse.number($stateTable.find('tr:last-child td:first-child').text()) +
        parse.number($stateTable.find('tr:last-child td:nth-child(2)').text());
      counties.push(stateData);
      counties = geography.addEmptyRegions(counties, this._counties, 'county');
      return counties;
    },
    '2020-03-26': async function scraper($) {
      this.type = 'table';
      const $countyTable = $('td:contains("County")').closest('table');
      const $trs = $countyTable.find('tbody > tr:not(:first-child)');
      let counties = [];
      $trs.each((index, tr) => {
        const $tr = $(tr);
        counties.push({
          county: geography.getCounty(geography.addCounty(parse.string($tr.find('td:first-child').text())), 'PA'),
          cases: parse.number($tr.find('td:nth-child(2)').text()),
          deaths: parse.number(parse.string($tr.find('td:last-child').text()) || 0)
        });
      });
      const $stateTable = $('table.ms-rteTable-default').eq(0);
      const stateData = transform.sumData(counties);
      stateData.tested =
        parse.number($stateTable.find('tr:last-child td:first-child').text()) +
        parse.number($stateTable.find('tr:last-child td:nth-child(2)').text());
      counties.push(stateData);
      counties = geography.addEmptyRegions(counties, this._counties, 'county');
      return counties;
    }
  }
};

export default scraper;
