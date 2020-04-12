export default function jsonDiff(left, right, maxErrors = 10) {

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
          _jsonDiffIter(lhs[i], rhs[i], `${currPath}[${i}]`, errs);
        }
      }
    } else if (isDictionary(lhs) && isDictionary(rhs)) {
      const lhsKeys = Object.keys(lhs).sort();
      const rhsKeys = Object.keys(rhs).sort();
      if(lhsKeys.toString() !== rhsKeys.toString()) {
        errs.push(`${currPath}/ keys: [${lhsKeys}] != [${rhsKeys}]`);
      } else {
        lhsKeys.forEach(k => {
          _jsonDiffIter(lhs[k], rhs[k], `${currPath}/${k}`, errs);
        });
      }
    } else {
      errs.push(`${currPath} value: type difference (array vs hash)`);
    }
  }


  const errs = [];
  _jsonDiffIter(left, right, '', errs);

  return errs;
}
