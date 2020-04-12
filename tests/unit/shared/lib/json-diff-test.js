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
  diffShouldBe(t, ['/b/ keys: [a,c] != [b,c]']);
});

test('diff values child object', t => {
  lhs = { 'a': 'apple', 'b': { 'a': 'ant', 'c': 'cat' } };
  rhs = { 'a': 'apple', 'b': { 'a': 'axe', 'c': 'cat' } };
  diffShouldBe(t, ['/b/a value: ant != axe']);
});

test('can compare strings', t => {
  lhs = 'hi';
  rhs = 'there';
  diffShouldBe(t, ['value: hi != there']);
});

test('same strings ok', t => {
  lhs = 'hi';
  rhs = 'hi';
  diffShouldBe(t, []);
});

test('arrays in same order are equivalent', t => {
  lhs = [1, 2, 3, 4];
  rhs = [1, 2, 3, 4];
  diffShouldBe(t, []);
});

test('hash pointing to arrays in same order are equivalent', t => {
  lhs = { 'a': [1, 2, 3, 4] };
  rhs = { 'a': [1, 2, 3, 4] };
  diffShouldBe(t, []);
});

test('hash pointing to different types are different', t => {
  lhs = { 'a': [1, 2, 3, 4] };
  rhs = { 'a': { '1': '2', '3': '4' } };
  diffShouldBe(t, ['/a value: type difference (array vs hash)']);
});

test('hash pointing to different types are different #2', t => {
  rhs = { 'a': { '1': '2', '3': '4' } };
  lhs = { 'a': [1, 2, 3, 4] };
  diffShouldBe(t, ['/a value: type difference (array vs hash)']);
});

test('hash pointing to diff length arrays are different', t => {
  lhs = { 'a': ['a', 'b', 'c'] };
  rhs = { 'a': ['a', 'b', 'c', 'd'] };
  diffShouldBe(t, ['/a array length: 3 != 4']);
});

test('hash pointing to arrays in different order are different', t => {
  lhs = { 'a': [1, 2, 3, 4] };
  rhs = { 'a': [1, 3, 2, 4] };
  diffShouldBe(t, ['/a[1] value: 2 != 3', '/a[2] value: 3 != 2']);
});

test('can limit max number of errors', t => {
  lhs = { 'a': [0, 1, 2, 3] };
  rhs = { 'a': [4, 5, 6, 7] };
  const allExpected = [
    '/a[0] value: 0 != 4',
    '/a[1] value: 1 != 5',
    '/a[2] value: 2 != 6',
    '/a[3] value: 3 != 7'
  ];
  t.deepEqual(jsonDiff(lhs, rhs), allExpected);

  const first2Expected = [
    '/a[0] value: 0 != 4',
    '/a[1] value: 1 != 5'
  ];
  t.deepEqual(jsonDiff(lhs, rhs, 2), first2Expected);
  t.end();
});

test('array of hashes with differences', t => {
  lhs = [
    {
      'a': 'apple',
      'b': 'bat',
      'c': { 'cats': [ 'tiger', 'lion' ] }
    },
    {
      'a2': 'apple2',
      'b2': 'bat2',
      'c2': { 'cats2': [ 'tiger2', 'lion2' ] }
    }
  ];
  rhs = [
    {
      'a': 'apple',
      'b': 'bat',
      'c': { 'cats': [ 'tiger', 'lion' ] }
    },
    {
      'a2': 'XXXXXapple2',
      'b2': 'XXXXXbat2',
      'c2': { 'cats2': [ 'tiger2', 'XXXXlion2' ] }
    }
  ];

  const expected = [
    '[1]/a2 value: apple2 != XXXXXapple2',
    '[1]/b2 value: bat2 != XXXXXbat2',
    '[1]/c2/cats2[1] value: lion2 != XXXXlion2'
  ];
  diffShouldBe(t, expected);
});
