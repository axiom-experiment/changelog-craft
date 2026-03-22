'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const cc = require('../src/index');

// ── Public API surface ────────────────────────────────────────────────────────

describe('index — public API exports', () => {
  // High-level functions
  it('exports generate', () => {
    assert.equal(typeof cc.generate, 'function');
  });

  it('exports generateAll', () => {
    assert.equal(typeof cc.generateAll, 'function');
  });

  it('exports parseCommits', () => {
    assert.equal(typeof cc.parseCommits, 'function');
  });

  it('exports writeChangelog', () => {
    assert.equal(typeof cc.writeChangelog, 'function');
  });

  it('exports prependChangelog', () => {
    assert.equal(typeof cc.prependChangelog, 'function');
  });

  // Parser utilities
  it('exports parseRawLine', () => {
    assert.equal(typeof cc.parseRawLine, 'function');
  });

  it('exports parseConventionalSubject', () => {
    assert.equal(typeof cc.parseConventionalSubject, 'function');
  });

  it('exports isConventionalCommit', () => {
    assert.equal(typeof cc.isConventionalCommit, 'function');
  });

  it('exports TYPE_LABELS', () => {
    assert.equal(typeof cc.TYPE_LABELS, 'object');
  });

  it('exports TYPE_ORDER', () => {
    assert.ok(Array.isArray(cc.TYPE_ORDER));
  });

  it('exports COMMIT_TYPES', () => {
    assert.ok(Array.isArray(cc.COMMIT_TYPES));
  });

  it('exports CC_REGEX', () => {
    assert.ok(cc.CC_REGEX instanceof RegExp);
  });

  // Formatter utilities
  it('exports groupCommits', () => {
    assert.equal(typeof cc.groupCommits, 'function');
  });

  it('exports formatMarkdown', () => {
    assert.equal(typeof cc.formatMarkdown, 'function');
  });

  it('exports formatJson', () => {
    assert.equal(typeof cc.formatJson, 'function');
  });

  it('exports formatTerminal', () => {
    assert.equal(typeof cc.formatTerminal, 'function');
  });
});

// ── Integration: parseRawLine → formatMarkdown roundtrip ─────────────────────

describe('index — integration roundtrip', () => {
  const HASH = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

  it('parseRawLine result feeds directly into formatMarkdown', () => {
    const commit = cc.parseRawLine(`${HASH}|feat: add dark mode`);
    assert.ok(commit);
    const md = cc.formatMarkdown([commit], 'v1.0.0', '2026-01-01');
    assert.match(md, /add dark mode/);
    assert.match(md, /v1\.0\.0/);
  });

  it('parseCommits + formatJson gives correct total', () => {
    const lines = [
      `${HASH}|feat: feature one`,
      `${HASH}|fix: bug fix`,
      `${HASH}|docs: docs update`
    ];
    const commits = cc.parseCommits(lines);
    const json    = cc.formatJson(commits, 'v1.0.0', '2026-01-01');
    assert.equal(json.total_commits, 3);
  });

  it('isConventionalCommit works from index export', () => {
    assert.equal(cc.isConventionalCommit('feat: something'), true);
    assert.equal(cc.isConventionalCommit('just a message'), false);
  });

  it('groupCommits works from index export', () => {
    const commit = cc.parseRawLine(`${HASH}|fix: resolve crash`);
    const { byType } = cc.groupCommits([commit]);
    assert.ok(byType.fix);
    assert.equal(byType.fix.length, 1);
  });

  it('formatTerminal works from index export', () => {
    const commit = cc.parseRawLine(`${HASH}|feat: add feature`);
    const out    = cc.formatTerminal([commit]);
    assert.match(out, /add feature/);
  });

  it('TYPE_LABELS accessible from index', () => {
    assert.match(cc.TYPE_LABELS.feat, /Features/);
  });

  it('COMMIT_TYPES includes all expected types', () => {
    const expected = ['feat', 'fix', 'docs', 'chore', 'test', 'refactor'];
    for (const t of expected) {
      assert.ok(cc.COMMIT_TYPES.includes(t), `Missing type: ${t}`);
    }
  });
});
