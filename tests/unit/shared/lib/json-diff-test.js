const imports = require('esm')(module);
const { join } = require('path');
const test = require('tape');

const jsonDiff = imports(join(process.cwd(), 'src', 'shared', 'lib', 'json-diff.js')).default;

// Globals reused for all tests
var lhs = null;
var rhs = null;

function diffShouldBe(t, expected) {
  t.deepEqual(jsonDiff(lhs, rhs), expected);
  t.end();
}

test('same hash is no diff', t => {
  lhs = { 'a': 'hi' };
  rhs = lhs;
  diffShouldBe(t, []);
});

test('hash with different order', t => {
  lhs = { 'a': 'apple', 'b': 'bats' };
  rhs = { 'b': 'bats', 'a': 'apple' };
  diffShouldBe(t, []);
});

test('diff hash values', t => {
  lhs = { 'a': 'apple' };
  rhs = { 'a': 'ant' };
  diffShouldBe(t, ['/a value: apple != ant']);
});

test('diff hash keys at root', t => {
  lhs = { 'a': 'apple' };
  rhs = { 'b': 'bat' };
  diffShouldBe(t, ['/ keys: [a] != [b]']);
});

test('diff hash keys at child object', t => {
  lhs = { 'a': 'apple', 'b': { 'a': 'apple', 'c': 'cat' } };
  rhs = { 'a': 'apple', 'b': { 'b': 'bat', 'c': 'cat' } };
  diffShouldBe(t, ['/b/ keys: [a, c] != [b, c]']);
});

test('diff values child object', t => {
  lhs = { 'a': 'apple', 'b': { 'a': 'ant', 'c': 'cat' } };
  rhs = { 'a': 'apple', 'b': { 'a': 'axe', 'c': 'cat' } };
  diffShouldBe(t, ['/b/; value: ant != axe']);
});
