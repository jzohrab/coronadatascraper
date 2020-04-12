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
  
/** Recursion through the lhs and rhs, pushing errors (differences)
 * onto errs, up to maxErrors. */
function _jsonDiffIter(lhs, rhs, currPath, errs, maxErrors) {
  
  if (errs.length === maxErrors)
    return;
  
  if(isPrimitive(lhs) && isPrimitive(rhs)) {
    if (lhs !== rhs) {
      errs.push(`${currPath} value: ${lhs} != ${rhs}`.trim());
    }
  }
  else if (Array.isArray(lhs) && Array.isArray(rhs)) {
    if (lhs.length !== rhs.length) {
      errs.push(`${currPath} array length: ${lhs.length} != ${rhs.length}`.trim());
    } else {
      for (var i = 0; i < lhs.length; ++i) {
        _jsonDiffIter(lhs[i], rhs[i], `${currPath}[${i}]`, errs, maxErrors);
      }
    }
  } else if (isDictionary(lhs) && isDictionary(rhs)) {
    const lhsKeys = Object.keys(lhs).sort();
    const rhsKeys = Object.keys(rhs).sort();
    if(lhsKeys.toString() !== rhsKeys.toString()) {
      errs.push(`${currPath}/ keys: [${lhsKeys}] != [${rhsKeys}]`);
    } else {
      lhsKeys.forEach(k => {
        _jsonDiffIter(lhs[k], rhs[k], `${currPath}/${k}`, errs, maxErrors);
      });
    }
  } else {
    errs.push(`${currPath} value: type difference (array vs hash)`);
  }
}


/** The diff function. */
export function jsonDiff(left, right, maxErrors = 10) {
  const errs = [];
  _jsonDiffIter(left, right, '', errs, maxErrors);
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
