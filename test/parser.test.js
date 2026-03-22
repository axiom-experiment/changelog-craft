'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  parseConventionalSubject,
  parseRawLine,
  isConventionalCommit,
  TYPE_LABELS,
  TYPE_ORDER,
  COMMIT_TYPES,
  CC_REGEX
} = require('../src/parser');

// ── parseConventionalSubject ──────────────────────────────────────────────────

describe('parseConventionalSubject — basic types', () => {
  it('parses feat', () => {
    const r = parseConventionalSubject('feat: add login');
    assert.equal(r.type, 'feat');
    assert.equal(r.subject, 'add login');
    assert.equal(r.scope, null);
    assert.equal(r.breaking, false);
  });

  it('parses fix', () => {
    const r = parseConventionalSubject('fix: resolve null pointer');
    assert.equal(r.type, 'fix');
    assert.equal(r.subject, 'resolve null pointer');
  });

  it('parses docs', () => {
    const r = parseConventionalSubject('docs: update README');
    assert.equal(r.type, 'docs');
    assert.equal(r.subject, 'update README');
  });

  it('parses style', () => {
    const r = parseConventionalSubject('style: reformat code');
    assert.equal(r.type, 'style');
  });

  it('parses refactor', () => {
    const r = parseConventionalSubject('refactor: extract helper');
    assert.equal(r.type, 'refactor');
  });

  it('parses perf', () => {
    const r = parseConventionalSubject('perf: cache DB results');
    assert.equal(r.type, 'perf');
  });

  it('parses test', () => {
    const r = parseConventionalSubject('test: add unit tests');
    assert.equal(r.type, 'test');
  });

  it('parses build', () => {
    const r = parseConventionalSubject('build: upgrade webpack');
    assert.equal(r.type, 'build');
  });

  it('parses ci', () => {
    const r = parseConventionalSubject('ci: add GitHub Actions workflow');
    assert.equal(r.type, 'ci');
  });

  it('parses chore', () => {
    const r = parseConventionalSubject('chore: bump deps');
    assert.equal(r.type, 'chore');
  });

  it('parses revert', () => {
    const r = parseConventionalSubject('revert: undo v2 migration');
    assert.equal(r.type, 'revert');
  });
});

describe('parseConventionalSubject — scope', () => {
  it('parses scope correctly', () => {
    const r = parseConventionalSubject('feat(api): add endpoint');
    assert.equal(r.scope, 'api');
    assert.equal(r.type, 'feat');
    assert.equal(r.subject, 'add endpoint');
  });

  it('strips parentheses from scope', () => {
    const r = parseConventionalSubject('fix(auth): token refresh');
    assert.equal(r.scope, 'auth');
  });

  it('handles scope with hyphen', () => {
    const r = parseConventionalSubject('feat(user-profile): avatar upload');
    assert.equal(r.scope, 'user-profile');
  });

  it('handles scope with underscore', () => {
    const r = parseConventionalSubject('fix(api_v2): response format');
    assert.equal(r.scope, 'api_v2');
  });

  it('scope is null when absent', () => {
    const r = parseConventionalSubject('feat: no scope here');
    assert.equal(r.scope, null);
  });
});

describe('parseConventionalSubject — breaking changes', () => {
  it('detects ! as breaking', () => {
    const r = parseConventionalSubject('feat!: redesign API');
    assert.equal(r.breaking, true);
  });

  it('detects scope + ! as breaking', () => {
    const r = parseConventionalSubject('feat(api)!: redesign API');
    assert.equal(r.breaking, true);
    assert.equal(r.scope, 'api');
  });

  it('non-breaking has breaking=false', () => {
    const r = parseConventionalSubject('feat: normal feature');
    assert.equal(r.breaking, false);
  });

  it('fix! is breaking', () => {
    const r = parseConventionalSubject('fix!: change return type');
    assert.equal(r.breaking, true);
    assert.equal(r.type, 'fix');
  });

  it('chore! is breaking', () => {
    const r = parseConventionalSubject('chore!: drop Node 14 support');
    assert.equal(r.breaking, true);
  });
});

describe('parseConventionalSubject — edge cases', () => {
  it('returns null for plain text', () => {
    assert.equal(parseConventionalSubject('just a normal commit message'), null);
  });

  it('returns null for empty string', () => {
    assert.equal(parseConventionalSubject(''), null);
  });

  it('returns null for null input', () => {
    assert.equal(parseConventionalSubject(null), null);
  });

  it('returns null for undefined', () => {
    assert.equal(parseConventionalSubject(undefined), null);
  });

  it('returns null for unknown type', () => {
    assert.equal(parseConventionalSubject('unknown: something'), null);
  });

  it('is case-insensitive (FEAT)', () => {
    const r = parseConventionalSubject('FEAT: uppercase type');
    assert.equal(r.type, 'feat');
  });

  it('is case-insensitive (Fix)', () => {
    const r = parseConventionalSubject('Fix: mixed case');
    assert.equal(r.type, 'fix');
  });

  it('trims whitespace from subject', () => {
    const r = parseConventionalSubject('feat:   spaced subject  ');
    assert.equal(r.subject, 'spaced subject');
  });

  it('handles subject with special characters', () => {
    const r = parseConventionalSubject('fix: handle `null` in JSON.parse()');
    assert.equal(r.subject, 'handle `null` in JSON.parse()');
  });
});

// ── parseRawLine ──────────────────────────────────────────────────────────────

describe('parseRawLine', () => {
  const hash40 = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

  it('parses a valid raw line', () => {
    const r = parseRawLine(`${hash40}|feat: add login`);
    assert.equal(r.type, 'feat');
    assert.equal(r.subject, 'add login');
  });

  it('extracts short hash (7 chars)', () => {
    const r = parseRawLine(`${hash40}|feat: test`);
    assert.equal(r.hash, hash40.slice(0, 7));
    assert.equal(r.hash.length, 7);
  });

  it('preserves fullHash', () => {
    const r = parseRawLine(`${hash40}|feat: test`);
    assert.equal(r.fullHash, hash40);
  });

  it('returns null when no pipe separator', () => {
    assert.equal(parseRawLine('no pipe here'), null);
  });

  it('returns null for non-conventional subject', () => {
    assert.equal(parseRawLine(`${hash40}|just a message`), null);
  });

  it('returns null for empty input', () => {
    assert.equal(parseRawLine(''), null);
  });

  it('returns null for null', () => {
    assert.equal(parseRawLine(null), null);
  });

  it('parses scope from raw line', () => {
    const r = parseRawLine(`${hash40}|feat(auth): add JWT`);
    assert.equal(r.scope, 'auth');
  });

  it('parses breaking change from raw line', () => {
    const r = parseRawLine(`${hash40}|feat!: breaking change`);
    assert.equal(r.breaking, true);
  });

  it('preserves raw subject', () => {
    const r = parseRawLine(`${hash40}|fix(db): fix query`);
    assert.equal(r.raw, 'fix(db): fix query');
  });

  it('handles short 7-char hash input', () => {
    const r = parseRawLine('abc1234|fix: short hash');
    assert.equal(r.hash, 'abc1234');
    assert.equal(r.fullHash, 'abc1234');
  });
});

// ── isConventionalCommit ──────────────────────────────────────────────────────

describe('isConventionalCommit', () => {
  it('returns true for feat', () => {
    assert.equal(isConventionalCommit('feat: add thing'), true);
  });

  it('returns true for fix', () => {
    assert.equal(isConventionalCommit('fix: fix thing'), true);
  });

  it('returns true with scope', () => {
    assert.equal(isConventionalCommit('feat(api): new endpoint'), true);
  });

  it('returns true for breaking change', () => {
    assert.equal(isConventionalCommit('feat!: breaking'), true);
  });

  it('returns true for chore', () => {
    assert.equal(isConventionalCommit('chore: bump deps'), true);
  });

  it('returns false for plain message', () => {
    assert.equal(isConventionalCommit('update some files'), false);
  });

  it('returns false for empty string', () => {
    assert.equal(isConventionalCommit(''), false);
  });

  it('returns false for null', () => {
    assert.equal(isConventionalCommit(null), false);
  });

  it('returns false for undefined', () => {
    assert.equal(isConventionalCommit(undefined), false);
  });

  it('returns false for number', () => {
    assert.equal(isConventionalCommit(42), false);
  });

  it('returns false for unknown type', () => {
    assert.equal(isConventionalCommit('unknown: something'), false);
  });

  it('handles leading whitespace', () => {
    assert.equal(isConventionalCommit('  feat: spaced'), true);
  });
});

// ── Constants ─────────────────────────────────────────────────────────────────

describe('Constants', () => {
  it('TYPE_LABELS has all 11 types', () => {
    assert.equal(Object.keys(TYPE_LABELS).length, 11);
  });

  it('TYPE_LABELS.feat contains "Features"', () => {
    assert.match(TYPE_LABELS.feat, /Features/);
  });

  it('TYPE_LABELS.fix contains "Bug Fixes"', () => {
    assert.match(TYPE_LABELS.fix, /Bug Fixes/);
  });

  it('TYPE_ORDER has 11 entries', () => {
    assert.equal(TYPE_ORDER.length, 11);
  });

  it('TYPE_ORDER starts with feat', () => {
    assert.equal(TYPE_ORDER[0], 'feat');
  });

  it('TYPE_ORDER second item is fix', () => {
    assert.equal(TYPE_ORDER[1], 'fix');
  });

  it('COMMIT_TYPES is an array of 11', () => {
    assert.equal(COMMIT_TYPES.length, 11);
  });

  it('COMMIT_TYPES includes feat', () => {
    assert.ok(COMMIT_TYPES.includes('feat'));
  });

  it('COMMIT_TYPES includes revert', () => {
    assert.ok(COMMIT_TYPES.includes('revert'));
  });

  it('CC_REGEX is a RegExp', () => {
    assert.ok(CC_REGEX instanceof RegExp);
  });

  it('CC_REGEX matches a conventional commit', () => {
    assert.ok(CC_REGEX.test('feat(scope): description'));
  });

  it('CC_REGEX does not match plain text', () => {
    assert.ok(!CC_REGEX.test('plain commit message'));
  });
});
