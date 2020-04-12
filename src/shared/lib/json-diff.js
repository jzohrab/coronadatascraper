export default function jsonDiff(left, right) {

  /** Iterates through the left and right, pushes errors (differences)
   * onto errs. */
  function _jsonDiffIter(left, right, errs) {
    errs.push('hi');
  }

  const errs = [];
  _jsonDiffIter(left, right, errs);

  return errs;
}
