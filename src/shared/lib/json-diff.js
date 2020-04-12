export default function jsonDiff(left, right) {

  function isPrimitive(arg) {
    var type = typeof arg;
    return arg == null || (type != "object" && type != "function");
  }
  
  /** Iterates through the left and right, pushes errors (differences)
   * onto errs. */
  function _jsonDiffIter(left, right, currPath, errs) {
    errs.push('hi');

    if(left == right) {
        return;
    }

    if(isPrimitive(left) && isPrimitive(right)) {
      if (left != right) {
        errs.push(`${currPath} value: ${left} != ${right}`);
        return;
      }
    }

    const leftKeys = Object.keys(left).sort().toString();
    const rightKeys = Object.keys(right).sort().toString();
    if(leftKeys !== rightKeys) {
      errs.push(`${currPath} keys: [${leftKeys}] != [${rightKeys}]}`);
      return;
    }

    // compare objects with same keys
    leftKeys.forEach(k => {
      _jsonDiffIter(left[k], right[k], `${currPath}/`, errs);
    });

  }

  const errs = [];
  _jsonDiffIter(left, right, '', errs);

  return errs;
}
