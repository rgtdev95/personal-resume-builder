'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { keywordCoverage } = require('../routes/documents');

test('keywordCoverage matches whole terms, including symbols, case-insensitively', () => {
  const r = keywordCoverage('Built CI/CD pipelines in C++ on AWS; specific tuning.', ['ci/cd', 'C++', 'aws', 'CI', 'Kubernetes']);
  assert.deepEqual(r.matched_keywords, ['ci/cd', 'C++', 'aws', 'CI']); // "CI" via "CI/CD", not via "specific"
  assert.deepEqual(r.missing_keywords, ['Kubernetes']);
  assert.equal(r.match_score, 80);
});

test('keywordCoverage does not match inside other words', () => {
  assert.deepEqual(keywordCoverage('specific', ['CI']).missing_keywords, ['CI']);
});

test('keywordCoverage returns no score when there are no keywords', () => {
  assert.equal(keywordCoverage('anything', []).match_score, null);
});

test('keywordCoverage accepts a plural form of the keyword', () => {
  assert.deepEqual(keywordCoverage('Deployed HP workstations and thin clients', ['HP Workstation', 'Thin Client']).missing_keywords, []);
});
