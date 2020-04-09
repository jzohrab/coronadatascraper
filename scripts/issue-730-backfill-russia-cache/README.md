Russia used to use Needle and called a site directly to get a CSRF
token and cookie.  Subsequent calls then added this CSRF token to
another URL, which it would call to get data.  This broke caching
(issue https://github.com/covidatlas/coronadatascraper/issues/483).

These scripts will help find and rename cached Russian data files so
that they're actually found with recently updated caching code (fixed in PR https://github.com/covidatlas/coronadatascraper/pull/722).