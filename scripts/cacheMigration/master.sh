#!/bin/bash

# MASTER SCRIPT: Run this in the root directory.
#
# NOTE: You should currently be on the prep-cache-call-logging branch.
# NOTE: that branch should be recently rebased off of master
# NOTE: the coronadatascraper-cache/ should be as at master.
#
# Usage: ./scripts/cacheMigration/master.sh <migration-branch-name>
# eg
# ./scripts/cacheMigration/master.sh wip-my-migration-branch

if ["$1" -eq ""]; then
    echo "NO GOOD.  Specify a branch name, puh-leaze ... quitting."
    exit 0
fi

# Prep migration branch
git checkout -b $1

# Auto-migrate code and save it
pushd ./scripts/cacheMigration
ruby cache-migration-hacks.rb save
popd

# Run scrape, gen reports
./scripts/cacheMigration/run-dates.sh
ruby scripts/cacheMigration/compare-log-to-actual-files.rb > cache_comparison.txt
./scripts/cacheMigration/check_log.sh > log_error_check.txt

echo "Done: check files: check .txt files in root (log_cacheCalls, log, log_error_check, cache_comparison)"
