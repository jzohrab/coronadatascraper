#!/bin/bash
# Run this in the project root directory!

for dt in `ls -1 coronadatascraper-cache/ | grep 2[45]`
do
    echo "Running $dt"
    cmd="yarn fetchOnly --date '$dt' --onlyUseCache"
    echo $cmd
    `$cmd`
done

echo "Done, please check cacheCalls.txt."
