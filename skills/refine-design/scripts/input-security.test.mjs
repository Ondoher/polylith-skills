import assert from 'node:assert/strict';
import test from 'node:test';

import {
  escapeMarkdownText,
  validateDurableResearch,
  validatePublicHttpsUrl,
  validateRepositoryRelativeLink,
} from './input-security.mjs';

test('rejects encoded private paths, bearer credentials, vendor tokens, and secret assignments', () => {
  const probes = [
    'Compared C%3A%5CUsers%5Cperson%5Cprivate-notes.md.',
    'Compared %252Fhome%252Fperson%252Fprivate-notes.md.',
    'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.private.signature',
    'github token ghp_abcdefghijklmnopqrstuvwxyz1234567890',
    'vendor key sk-proj-abcdefghijklmnopqrstuvwxyz1234567890',
    'source query api_key=private-value',
    'request client_secret: private-value',
    'login password=CorrectHorseBatteryStaple',
  ];
  for (const probe of probes) {
    assert.throws(() => validateDurableResearch({nested: [{probe}]}, 'research'), /private local path|credentials or secrets/, probe);
  }
});

test('allows ordinary password-design prose without treating it as a credential', () => {
  assert.doesNotThrow(() => validateDurableResearch({
    query: 'Password = minimum 12 characters interaction guidance',
    note: 'Compare password: required and optional field treatments.',
  }, 'research'));
});

test('requires public credential-free HTTPS research URLs', () => {
  assert.doesNotThrow(() => validatePublicHttpsUrl('https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/', 'source'));
  const probes = [
    'https://person:secret@example.com/guidance',
    'http://example.com/guidance',
    'https://127.0.0.1/guidance',
    'https://169.254.169.254/latest/meta-data/',
    'https://10.0.0.5/guidance',
    'https://[::1]/guidance',
    'https://intranet/guidance',
    'https://service.local/guidance',
    'https://service.internal/guidance',
    'https://example.com/guidance?token=private-value',
    'https://example.com/guidance?%2561pi_key=private-value',
    'https://example.com/#token=super-secret-value',
    'https://example.com/guidance?refresh_token=super-secret-value',
    'https://example.com/guidance?sig=super-secret-value',
    'https://example.com/guidance?x-amz-security-token=super-secret-value',
    'https://example.com/file%3A%2FC%3A%2FUsers%2Fperson%2Fsecret',
    'https://[::7f00:1]/guidance',
    'https://[::127.0.0.1]/x',
    'https://[::7f00:0001]/x',
    'https://[0000:0000:0000:0000:0000:0000:7f00:0001]/x',
    'https://[0:0:0:0:0:0:127.0.0.1]/x',
    'https://[64:ff9b::127.0.0.1]/guidance',
  ];
  for (const probe of probes) assert.throws(
    () => validatePublicHttpsUrl(probe, 'source'),
    /public HTTPS|URL credentials|credential query|credentials or secrets|private local path/,
    probe,
  );
});

test('accepts only narrow repository links and escapes authored Markdown text', () => {
  assert.equal(validateRepositoryRelativeLink('design-language/index.html#components', 'document'), 'design-language/index.html#components');
  const probes = [
    'docs/%252e%252e/private.md',
    'docs/%2e%2e/private.md',
    'docs/guide%20notes.md',
    'docs/guide.md)[off-site](https://example.com)',
    'docs/guide.md#ok)[off-site](https://example.com)',
    'docs/<script>.md',
  ];
  for (const probe of probes) assert.throws(() => validateRepositoryRelativeLink(probe, 'document'), /encoded path text|repository-relative link/, probe);
  assert.equal(
    escapeMarkdownText('Design [language](https://example.com)\nRead *first*.'),
    'Design \\[language\\]\\(https://example\\.com\\) Read \\*first\\*\\.',
  );
});
