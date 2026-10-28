import { expect, test } from 'bun:test';
import { scrubPII, containsPII } from './pii-scrubber';

test('scrubs NIK, email and Indonesian phone numbers', () => {
  const result = scrubPII('3201234567890001 alice@example.org 081234567890');
  expect(result.scrubbed).not.toContain('3201234567890001');
  expect(result.scrubbed).not.toContain('alice@example.org');
  expect(result.scrubbed).not.toContain('081234567890');
  expect(result.confidence).toBe('high');
});

test('repeated PII checks do not depend on regex state', () => {
  for (let i = 0; i < 5; i++) expect(containsPII('alice@example.org')).toBe(true);
  expect(containsPII('ordinary lower case text')).toBe(false);
});
