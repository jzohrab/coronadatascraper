/** Diff two json structures, and report places where the structures
 * differ, up to a maximum number of differences.
 *
 * This provides a reasonably-descriptive place where two json
 * structures differ, using path-style separators (e.g.,
 * key1/key2/key3) to indicate the "hash key path", and indexes
 * (e.g. [0]) to indicate array positions for differences.
 *
 * For example, given the following:
 *
 *  lhs = [
 *    { 'a': 'apple',
 *      'b': 'bat',
 *      'c': [
 *        { 'd': 'd-1', 'e': 'e-1' },
 *        { 'd': 'd-2', 'e': 'e-2' }
 *      ]
 *    }
 *  ];
 *
 *  rhs = [
 *    { 'a': 'apple',
 *      'b': 'bat-XXXX',
 *      'c': [
 *        { 'd': 'd-1', 'e': 'NOT_E_1' },
 *        { 'd': 'NOT_D_2', 'e': 'e-2' }
 *      ]
 *    }
 *  ];
 *
 *  The differences would be:
 *
 *    '[0]/b value: bat != bat-XXXX',
 *    '[0]/c[0]/e value: e-1 != NOT_E_1',
 *    '[0]/c[1]/d value: d-2 != NOT_D_2'
 *
 */


/** Returns true if arg is a primitive. */
function isPrimitive(arg) {
  var type = typeof arg;
  return arg == null || (type != "object" && type != "function");
}

/** True if arg is a hash. */
function isDictionary(arg) {
  if(!arg) return false;
  if(Array.isArray(arg)) return false;
  if(arg.constructor != Object) return false;
  return true;
};

/** Return the new path to show to the user, if the current path
 * matches any of the formaters. */
function reformatCurrPath(hsh, currPath, formatters) {
  var newPath = currPath;
  for (var i = 0; i < formatters.length; ++i) {
    const [re, formattingFunction] = formatters[i];
    const m = newPath.match(re);
    // console.log(`newPath: "${newPath}"; re: ${re}; m: ${m}`);
    if (m !== null) {
      newPath = formattingFunction(hsh, m);
      break;
    }
  }
  return newPath;
}

/** Recursion through the lhs and rhs, pushing errors (differences)
 * onto errs, up to maxErrors. */
function _jsonDiffIter(lhs, rhs, currPath, errs, maxErrors, formatters) {
  
  if (errs.length === maxErrors)
    return;

  const newPath = reformatCurrPath(lhs, currPath, formatters);

  if(isPrimitive(lhs) && isPrimitive(rhs)) {
    if (lhs !== rhs) {
      errs.push(`${newPath} value: ${lhs} != ${rhs}`.trim());
    }
  }
  else if (Array.isArray(lhs) && Array.isArray(rhs)) {
    if (lhs.length !== rhs.length) {
      errs.push(`${newPath} array length: ${lhs.length} != ${rhs.length}`.trim());
    } else {
      for (var i = 0; i < lhs.length; ++i) {
        _jsonDiffIter(lhs[i], rhs[i], `${newPath}[${i}]`, errs, maxErrors, formatters);
      }
    }
  } else if (isDictionary(lhs) && isDictionary(rhs)) {
    const lhsKeys = Object.keys(lhs).sort();
    const rhsKeys = Object.keys(rhs).sort();
    if(lhsKeys.toString() !== rhsKeys.toString()) {
      errs.push(`${newPath}/ keys: [${lhsKeys}] != [${rhsKeys}]`);
    } else {
      lhsKeys.forEach(k => {
        _jsonDiffIter(lhs[k], rhs[k], `${newPath}/${k}`, errs, maxErrors, formatters);
      });
    }
  } else {
    errs.push(`${newPath} value: type difference (array vs hash)`);
  }
}


/** The formatter keys are simplified strings.  Make them regexes.
 * e.g., "^([\d+]/c)[(\d+)]$" => /^(\[\d+\]\/c)\[(\d+)\]$" */
function convertFormatterKeysToRegexes(formatters) {
  const ret = []
  Object.keys(formatters).forEach(k => {
    const restring = k
          .replace(/\[/g, '\\[')
          .replace(/\]/g, '\\]')
          .replace(/\//g, '\/');
    // console.log(`${k} => ${restring}`);
    const re = new RegExp(restring);
    ret.push([re, formatters[k]]);
  });
  return ret;
}

/** The diff function. */
export function jsonDiff(left, right, maxErrors = 10, formatters = {}) {
  const errs = [];
  const useFormatters = convertFormatterKeysToRegexes(formatters);
  _jsonDiffIter(left, right, '', errs, maxErrors, useFormatters);
  return errs;
}


/** Finding arrays */

/** Recursively find arrays in hash, add to arrays. */
function _findArraysIter(obj, currPath, arrays) {
  if (Array.isArray(obj)) {
    var p = currPath.trim();
    if (p === '') { p = 'root'; }
    arrays.push(p);
    for (var i = 0; i < obj.length; ++i) {
      _findArraysIter(obj[i], `${currPath}[n]`, arrays);
    }
  } else if (isDictionary(obj)) {
    Object.keys(obj).forEach(k => {
      _findArraysIter(obj[k], `${currPath}/${k}`, arrays);
    });
  }
}

export function findArrays(obj) {
  const arrays = [];
  _findArraysIter(obj, '', arrays);

  function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
  }
  var uniques = arrays.filter(onlyUnique);

  return uniques;
}
