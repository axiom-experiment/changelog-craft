'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert  = require('node:assert/strict');
const fs      = require('fs');
const os      = require('os');
const path    = require('path');

const { parseCommits, writeChangelog, prependChangelog } = require('../src/changelog');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const HASH40 = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
const HASH2  = 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3';
const HASH3  = 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';

const VALID_LINES = [
  `${HASH40}|feat: add login`,
  `${HASH2}|fix(auth): handle token expiry`,
  `${HASH3}|docs: update README`
];

const MIXED_LINES = [
  `${HASH40}|feat: new feature`,
  'not a conventional commit',
  `${HASH2}|fix: bug fix`,
  'WIP: work in progress',
  `${HASH3}|chore!: drop Node 14`
];

// Temp dir helpers
let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── parseCommits ──────────────────────────────────────────────────────────────

describe('parseCommits', () => {
  it('returns an array', () => {
    const result = parseCommits(VALID_LINES);
    assert.ok(Array.isArray(result));
  });

  it('parses 3 valid lines into 3 commits', () => {
    const result = parseCommits(VALID_LINES);
    assert.equal(result.length, 3);
  });

  it('filters out non-conventional lines', () => {
    const result = parseCommits(MIXED_LINES);
    assert.equal(result.length, 3); // feat, fix, chore
  });

  it('empty array returns empty array', () => {
    assert.deepEqual(parseCommits([]), []);
  });

  it('null input returns empty array', () => {
    assert.deepEqual(parseCommits(null), []);
  });

  it('all-invalid lines return empty array', () => {
    const result = parseCommits(['WIP: stuff', 'Update README', 'fix things']);
    assert.deepEqual(result, []);
  });

  it('first parsed commit has correct type', () => {
    const result = parseCommits(VALID_LINES);
    assert.equal(result[0].type, 'feat');
  });

  it('second commit has scope', () => {
    const result = parseCommits(VALID_LINES);
    assert.equal(result[1].scope, 'auth');
  });

  it('third commit is docs type', () => {
    const result = parseCommits(VALID_LINES);
    assert.equal(result[2].type, 'docs');
  });

  it('breaking change is detected', () => {
    const result = parseCommits(MIXED_LINES);
    const chore  = result.find(c => c.type === 'chore');
    assert.ok(chore);
    assert.equal(chore.breaking, true);
  });

  it('hash is truncated to 7 chars', () => {
    const result = parseCommits(VALID_LINES);
    assert.equal(result[0].hash.length, 7);
  });

  it('subject is extracted correctly', () => {
    const result = parseCommits(VALID_LINES);
    assert.equal(result[0].subject, 'add login');
  });

  it('processes 100 lines efficiently', () => {
    const lines = Array.from({ length: 100 }, (_, i) =>
      `${HASH40}|feat: feature ${i}`
    );
    const result = parseCommits(lines);
    assert.equal(result.length, 100);
  });
});

// ── writeChangelog ────────────────────────────────────────────────────────────

describe('writeChangelog', () => {
  it('creates the file', () => {
    const file = path.join(tmpDir, 'CHANGELOG.md');
    writeChangelog(file, '# Changelog\n');
    assert.ok(fs.existsSync(file));
  });

  it('writes the correct content', () => {
    const file    = path.join(tmpDir, 'CHANGELOG.md');
    const content = '## v1.0.0 — 2026-01-01\n\n- feat: hello\n';
    writeChangelog(file, content);
    assert.equal(fs.readFileSync(file, 'utf8'), content);
  });

  it('overwrites an existing file', () => {
    const file = path.join(tmpDir, 'CHANGELOG.md');
    writeChangelog(file, 'original content\n');
    writeChangelog(file, 'new content\n');
    assert.equal(fs.readFileSync(file, 'utf8'), 'new content\n');
  });

  it('creates nested directories if they exist', () => {
    const file = path.join(tmpDir, 'CHANGELOG.md');
    writeChangelog(file, 'test\n');
    assert.ok(fs.existsSync(file));
  });

  it('writes utf-8 encoding', () => {
    const file    = path.join(tmpDir, 'CHANGELOG.md');
    const content = '## ✨ Features\n\n- ♻️ refactor\n';
    writeChangelog(file, content);
    assert.equal(fs.readFileSync(file, 'utf8'), content);
  });
});

// ── prependChangelog ──────────────────────────────────────────────────────────

describe('prependChangelog', () => {
  it('creates the file when it does not exist', () => {
    const file = path.join(tmpDir, 'CHANGELOG.md');
    prependChangelog(file, '## v1.0.0\n\n- feat: init\n');
    assert.ok(fs.existsSync(file));
  });

  it('content is correct when file is new', () => {
    const file    = path.join(tmpDir, 'CHANGELOG.md');
    const content = '## v1.0.0\n\n- feat: init\n';
    prependChangelog(file, content);
    assert.equal(fs.readFileSync(file, 'utf8'), content);
  });

  it('new content appears before old content', () => {
    const file = path.join(tmpDir, 'CHANGELOG.md');
    fs.writeFileSync(file, 'OLD CONTENT\n', 'utf8');
    prependChangelog(file, 'NEW CONTENT\n');
    const result = fs.readFileSync(file, 'utf8');
    assert.ok(result.indexOf('NEW CONTENT') < result.indexOf('OLD CONTENT'));
  });

  it('old content is preserved', () => {
    const file = path.join(tmpDir, 'CHANGELOG.md');
    fs.writeFileSync(file, 'OLD CONTENT\n', 'utf8');
    prependChangelog(file, 'NEW CONTENT\n');
    const result = fs.readFileSync(file, 'utf8');
    assert.ok(result.includes('OLD CONTENT'));
  });

  it('preserves # Changelog header at the top', () => {
    const file     = path.join(tmpDir, 'CHANGELOG.md');
    const existing = '# Changelog\n\nAll notable changes.\n\n## v1.0.0\n\n- feat: old\n';
    fs.writeFileSync(file, existing, 'utf8');
    prependChangelog(file, '## v1.1.0\n\n- feat: new\n');
    const result = fs.readFileSync(file, 'utf8');
    // Header should still be first
    assert.ok(result.startsWith('# Changelog'));
    // v1.1.0 should appear before v1.0.0
    assert.ok(result.indexOf('v1.1.0') < result.indexOf('v1.0.0'));
  });

  it('can prepend multiple times, newest first', () => {
    const file = path.join(tmpDir, 'CHANGELOG.md');
    prependChangelog(file, '## v1.0.0\n\n- feat: first\n');
    prependChangelog(file, '## v1.1.0\n\n- feat: second\n');
    const result = fs.readFileSync(file, 'utf8');
    assert.ok(result.indexOf('v1.1.0') < result.indexOf('v1.0.0'));
  });
});
