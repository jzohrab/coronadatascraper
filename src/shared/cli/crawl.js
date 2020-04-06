const imports = require('esm')(module);

const { crawl } = imports('../index.js');
const argv = imports('./cli-args.js').default;

const clearAllTimeouts = imports('../utils/timeouts.js').default;

crawl(argv.date, argv)
  .then(clearAllTimeouts)
  .catch(e => {
    clearAllTimeouts();
    throw e;
  });
