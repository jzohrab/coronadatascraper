export default function jsonDiff(left, right) {

  function isPrimitive(arg) {
    var type = typeof arg;
    return arg == null || (type != "object" && type != "function");
  }
  
  /** Iterates through the left and right, pushes errors (differences)
   * onto errs. */
  function _jsonDiffIter(left, right, currPath, errs) {

    if(left == right) {
        return;
    }

    if(isPrimitive(left) && isPrimitive(right)) {
      if (left != right) {
        errs.push(`${currPath} value: ${left} != ${right}`.trim());
        return;
      }
    }

    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    if(leftKeys.toString() !== rightKeys.toString()) {
      errs.push(`${currPath}/ keys: [${leftKeys}] != [${rightKeys}]`);
      return;
    }

    // compare objects with same keys
    leftKeys.forEach(k => {
      _jsonDiffIter(left[k], right[k], `${currPath}/${k}`, errs);
    });

  }

  const errs = [];
  _jsonDiffIter(left, right, '', errs);

  return errs;
}
