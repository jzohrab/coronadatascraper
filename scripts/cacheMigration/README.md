# Code changes

* Added `--onlyUseCache` flag, which sets a process.env var which get and fetch respect.
* Changed the fetch and get methods: all calls must pass `this` (eg, $ = fetch.page(this, url ...)
* All Cache calls get appended to `cacheCalls.txt` in this directory (ignored by git)


# Scripts to make changes to scrapers

Summary (see notes for each script)

1. Run `cache-migration-hacks.rb`
2. Run `run-dates.sh`
3. Run `compare-log-to-actual-files.rb`
4. Run `check_log.sh`


## cache-migration-hacks.rb

This adds `_filepath` to scrapers, and changes all calls to fetch to include `this`

```
cd scripts/cacheMigration
ruby cache-migration-hacks.rb save  # see the file for example args
```

After running this, can run yarn and check `cacheCalls.txt`

```
$ yarn fetchOnly --date '2020-03-28' --onlyUseCache --location 'PA, USA'
```

### Debugging and manual hacks.

Some of the code can't be changed via regex, too messy.  So, debugging is manual:

```
yarn fetchOnly --date '2020-3-24' --onlyUseCache --location 'iso2:AU-QLD, AUS'
# note errors, fix ...
# git add
git commit -m "MANUAL FIX to scraper xxx"
```


## run-dates.sh

This script loops through all the folders in the cache, and runs `yarn
start` for each date.  `log.txt` is written in root, and
`cacheCalls.txt` is updated.

```
cd projectRoot
./scripts/cacheMigration/run-dates.sh
```

## compare-log-to-actual-files.rb

This compares the files used (recorded in `cacheCalls.txt` to actual
cache files, see what's included, and what's missing.

```
cd projectRoot
ruby scripts/cacheMigration/compare-log-to-actual-files.rb
```

# check_log.sh

This checks the logs for anything bad which indicates that the the code changes in `cache-migration-hacks.rb` weren't quite good enough!

```
cd projectRoot
./scripts/cacheMigration/check_log.sh
```

If this returns anything bad, do some debugging and manual hacking.

