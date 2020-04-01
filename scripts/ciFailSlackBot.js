// Report CI failures to Slack.

// eslint-disable-next-line import/no-extraneous-dependencies
const tapspec = require('tap-spec');
// eslint-disable-next-line import/no-extraneous-dependencies
const summarize = require('tap-summary');
const imports = require('esm')(module);

const request = imports('request');

const reporter = summarize.reporter();

const runNumber = process.env.RUN_NUMBER;
const slackHook = process.env.SLACK_CI_FAILURE_STATUS_HOOK;

if (!slackHook) {
  console.log('Missing SLACK_CI_FAILURE_STATUS_HOOK env value, exiting.');
  // return; ... should really stop here, like system.exit(0); or something.
}

/*
const sendToSlack = async data => {
  request.post(slackHook, {
    json: {
      blocks: data
    }
  });
};
*/

function sendSlack(errors, extra) {
  let msg = `Master failed in run ${runNumber}:
${errors.join('\n')}`;
  if (extra != null);
  msg = `${msg}\n${extra}`;

  request.post(slackHook, { json: { blocks: msg } });
}

// eslint-disable-next-line no-unused-vars
reporter.on('summary', (stats, fails, comments) => {
  if (stats.fail !== 0) {
    console.log('SENDING A WARNING');
    console.log(stats);
    console.log(fails);

    const errs = [];
    // eslint-disable-next-line guard-for-in
    for (const testname in fails) {
      console.log('...');
      fails[testname].forEach(f => {
        errs.push(`${testname}: ${f.raw}`);
      });
    }
    const MAXCOUNT = 2;
    console.log(errs.slice(0, MAXCOUNT));
    const slackErrs = errs.slice(0, MAXCOUNT);
    let extra = null;
    if (errs.length > MAXCOUNT) {
      extra = `... and ${errs.length - MAXCOUNT} more`;
      console.log(extra);
    }

    sendSlack(slackErrs, extra);
  } else {
    console.log('ALL GOOD, CARRY ON');
  }
});

/*
// Could also read from a file, if the file is complete!
const reportFile = 'report.tap';
if (!fs.existsSync(reportFile)) {
  console.log(`Missing file ${reportFile}, quitting.`);
  return;
}
fs.createReadStream(reportFile);
*/

process.stdin.pause();

process.stdin.pipe(process.stdout);
process.stdin.pipe(tapspec()).pipe(process.stdout);
process.stdin.pipe(reporter).pipe(process.stdout);

process.stdin.resume();

/*
const request = imports('request');
const yargs = imports('yargs');

const fs = imports('../src/shared/lib/fs.js');

const { argv } = yargs
  .scriptName('node ./scripts/statusSlackBot.js')
  .usage('$0 <cmd> [args]')
  .command('send [hook]', 'sends report.json to provided Slack Hook', yargs => {
    yargs.positional('hook', {
      type: 'string'
    });
  })
  .help();


const sendToSlack = async data => {
  request.post(argv.hook, {
    json: {
      blocks: data
    }
  });
};

fs.readJSON('./dist/report.json')
  .then(generateReport)
  .then(sendToSlack);
*/
