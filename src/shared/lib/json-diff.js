export default function jsonDiff(lhs, rhs) {

  function isPrimitive(arg) {
    var type = typeof arg;
    return arg == null || (type != "object" && type != "function");
  }

  function isDictionary(arg) {
    if(!arg) return false;
    if(Array.isArray(arg)) return false;
    if(arg.constructor != Object) return false;
    return true;
  };
  
  /** Iterates through the lhs and rhs, pushes errors (differences)
   * onto errs. */
  function _jsonDiffIter(lhs, rhs, currPath, errs) {

    if(lhs == rhs) {
        return;
    }

    if(isPrimitive(lhs) && isPrimitive(rhs)) {
      if (lhs != rhs) {
        errs.push(`${currPath} value: ${lhs} != ${rhs}`.trim());
        return;
      }
    }

    if (Array.isArray(lhs) && Array.isArray(rhs)) {
      if (lhs.length != rhs.length) {
        errs.push(`${currPath} array length: ${lhs.length} != ${rhs.length}`.trim());
        return;
      }
      for (var i = 0; i < lhs.length; ++i) {
        _jsonDiffIter(lhs[i], rhs[i], `${currPath}[$i]`, errs);
      }
    } else if (isDictionary(lhs) && isDictionary(rhs)) {
      const lhsKeys = Object.keys(lhs).sort();
      const rhsKeys = Object.keys(rhs).sort();
      if(lhsKeys.toString() !== rhsKeys.toString()) {
        errs.push(`${currPath}/ keys: [${lhsKeys}] != [${rhsKeys}]`);
        return;
      }

      lhsKeys.forEach(k => {
        _jsonDiffIter(lhs[k], rhs[k], `${currPath}/${k}`, errs);
      });
    } else {
      errs.push(`${currPath} value: type difference (array vs hash)`);
    }
  }


  const errs = [];
  _jsonDiffIter(lhs, rhs, '', errs);

  return errs;
}
