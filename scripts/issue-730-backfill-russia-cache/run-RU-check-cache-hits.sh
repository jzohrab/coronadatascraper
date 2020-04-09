#!/bin/bash

# yarn start --location RU --date 2020-4-8
for d in `ls -1 coronadatascraper-cache | grep -v 2020-4-9`
do
    echo $d
    echo -------------------------------------------  >> log_RU.log
    echo $d  >> log_RU.log
    yarn start --location RU --date $d >> log_RU.log
done
