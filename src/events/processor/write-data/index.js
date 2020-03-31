import path from 'path';
import * as fs from '../../../shared/lib/fs.js';
import * as stringify from './stringify.js';
import reporter from '../../../shared/lib/error-reporter.js';
import * as datetime from '../../../shared/lib/datetime.js';

const writeData = async ({ locations, featureCollection, report, options, sourceRatings }) => {
  let suffix = '';
  if (options.outputSuffix !== undefined) {
    suffix = options.outputSuffix;
  } else if (process.env.SCRAPE_DATE) {
    suffix = `-${process.env.SCRAPE_DATE}`;
  }

  // Add scrape date.
  const scrapeDate = process.env.SCRAPE_DATE || datetime.getYYYYMD();
  const outlocs = locations.map(loc => {
    loc.scrapeDate = scrapeDate;
    return loc;
  });

  await fs.writeFile(path.join('dist', `data${suffix}.json`), JSON.stringify(outlocs, null, 2));

  await fs.writeCSV(path.join('dist', `data${suffix}.csv`), stringify.csvForDay(locations));

  await fs.writeJSON(path.join('dist', `features${suffix}.json`), featureCollection);

  await fs.writeJSON('dist/report.json', report);

  await fs.writeJSON('dist/ratings.json', sourceRatings);

  await fs.writeCSV('dist/reports/crawler-report.csv', reporter.getCSV());

  return { locations, featureCollection, report, options };
};

export default writeData;
