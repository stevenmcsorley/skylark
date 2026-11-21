import { maskSecret } from '../../utils/secret'

it.each([
  ['abcdefghijkl', 4, 'abcd••••••••ijkl'],
  ['abcdefghij', 4, '••••••••'],
  ['abc', 4, '••••••••'],
  ['', 4, ''],
  ['😀bcdef🌙', 1, '😀••••••••🌙'],
])('masks %s with %i visible characters', (value, visible, expected) => {
  expect(maskSecret(value, visible)).toBe(expected)
})
