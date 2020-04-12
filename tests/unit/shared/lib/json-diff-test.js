const imports = require('esm')(module);
const { join } = require('path');
const test = require('tape');

const jsonDiff = imports(join(process.cwd(), 'src', 'shared', 'lib', 'json-diff.js')).default;

test('same hash is no diff', t => {
  const h = { 'a': 'hi' };
  t.deepEqual(jsonDiff(h, h), [])
  t.end();
});
