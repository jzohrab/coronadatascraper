/**
 * This file contains the caching implementation. We provide caching to reduce strain on official data sources
 * and to store changes to each source on a day to day basis.
 */

import path from 'path';
import crypto from 'crypto';

import join from '../join.js';
import * as datetime from '../datetime.js';
import * as fs from '../fs.js';
import log from '../log.js';

/*
Cach paths.
The cache paths can be overridden with settings in process.env.
See getCachedFolderPath.
*/
const DEFAULT_CACHE_PATH = 'coronadatascraper-cache';
const TIMESERIES_CACHE_PATH = 'cache';

export const CACHE_MISS = null;
export const RESOURCE_UNAVAILABLE = undefined;

/**
  MD5 hash a given string
*/
const hash = str => {
  return crypto
    .createHash('md5')
    .update(str)
    .digest('hex');
};

/**
 * Get the filename base (before extension) of the cache for the given URL
 * @param {*} url URL of the cached resource
 */
const getCachedFileNameBase = (url) => {
  return hash(url);
};

/**
 * Get the folder path of cache at the given date
 * @param {*} date the date associated with this resource, or false if a timeseries data
 *
 * The cache path can be set 
 */
const getCachedFolderPath = (date = false) => {
  let base = DEFAULT_CACHE_PATH;

  // Allow changing the default cache path for testing.
  if (process.env.OVERRIDE_DEFAULT_CACHE_PATH)
    base = process.env.OVERRIDE_DEFAULT_CACHE_PATH;

  let cachePath = date === false ? TIMESERIES_CACHE_PATH : join(base, date);

  // Clobber everything if OVERRIDE_CACHE_PATH is set.
  // This is necessary for tests/integration/scraper tests.
  if (process.env.OVERRIDE_CACHE_PATH) cachePath = process.env.OVERRIDE_CACHE_PATH;

  return cachePath;
};

/**
 * Get the extension of the cache file for the given URL
 * @param {*} url URL of the cached resource
 * @param {*} type type of the cached resource
 */
const getCachedFileNameExt = (url, type) => {
  return type || path.extname(url).replace(/^\./, '') || 'txt';
};

/**
 * Get the filename of the cache for the given URL
 * @param {*} url URL of the cached resource
 * @param {*} type type of the cached resource
 */
export const getCachedFileName = (url, type) => {
  const urlHash = getCachedFileNameBase(url);
  const extension = getCachedFileNameExt(url, type);
  return `${urlHash}.${extension}`;
};

/**
 * Get the path of cache for the given URL at the given date
 * @param {*} url URL of the cached resource
 * @param {*} type type of the cached resource
 * @param {*} date the date associated with this resource, or false if a timeseries data
 */
export const getCachedFilePath = (url, type, date = false) => {
  const dir = getCachedFolderPath(date);
  const base = getCachedFileNameBase(url);
  const ext = getCachedFileNameExt(url, type);
  return join(dir, `${base}.${ext}`);
};

/**
  Get the cache for the following URL at a given date.

  If the date requested is before today, and no cache is available, we will be unable to fetch this URL, hence
  the function returns `RESOURCE_UNAVAILABLE`.

  If we are able to fetch this URL (because it is a timeseries or we are requesting today's data), the function
  returns `CACHE_MISS`.

  * @param {*} url URL of the cached resource
  * @param {*} type type of the cached resource
  * @param {*} date the date associated with this resource, or false if a timeseries data
  * @param {*} encoding for the resource to access, default to utf-8
*/
export const getCachedFile = async (url, type, date, encoding = 'utf8') => {
  const filePath = getCachedFilePath(url, type, date);

  if (await fs.exists(filePath)) {
    log('  ⚡️ Cache hit for %s from %s', url, filePath);
    return fs.readFile(filePath, encoding);
  }
  if (date && datetime.dateIsBefore(new Date(date), datetime.getDate())) {
    log('  ⚠️ Cannot go back in time to get %s, no cache present', url, filePath);
    return RESOURCE_UNAVAILABLE;
  }
  log('  🐢  Cache miss for %s at %s', url, filePath);
  return CACHE_MISS;
};

/**
 * Saves a file to cache, at the provided date
 *
 * @param {*} url URL of the cached resource
 * @param {*} type type of the cached resource
 * @param {*} date the date associated with this resource, or false if a timeseries data
 * @param {*} data file data to be saved
 */
export const saveFileToCache = async (url, type, date, data) => {
  const dir = getCachedFolderPath(date);
  const base = getCachedFileNameBase(url);
  const ext = getCachedFileNameExt(url, type);
  const fname = `${base}.${ext}`;
  const filePath = join(dir, fname);
  const metadataFilePath = join(dir, `metadata-${base}.json`);

  const dataasync = fs.writeFile(filePath, data, { silent: true });

  var now = new Date();
  const metadata = {
    cachefile: fname,
    url: url,
    cachedatetime: now.toISOString(),
    md5: hash(data),
    cachepath: join(date, fname)
  };
  
  const metaasync = fs.writeJSON(metadataFilePath, metadata, { silent: true });
  return [ dataasync, metaasync ];
};
