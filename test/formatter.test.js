'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { groupCommits, formatMarkdown, formatJson, formatTerminal } = require('../src/formatter');

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeCommit(type, subject, opts = {}) {
  return {
    hash:     opts.hash    || 'abc1234',
    fullHash: opts.fullHash || 'abc1234def5678901234567890',
    type,
    scope:    opts.scope   || null,
    breaking: opts.breaking || false,
    subject,
    raw: `${type}: ${subject}`
  };
}

const FEAT    = makeCommit('feat',     'add dark mode');
const FIX     = makeCommit('fix',      'resolve crash on startup');
const DOCS    = makeCommit('docs',     'update API reference');
const PERF    = makeCommit('perf',     'cache expensive queries');
const CHORE   = makeCommit('chore',    'bump dependencies');
const REVERT  = makeCommit('revert',   'undo v2 migration');
const SCOPED  = makeCommit('feat',     'add avatar', { scope: 'profile', hash: 'bcd2345' });
const BREAKING_FEAT = makeCommit('feat', 'redesign public API', { breaking: true, hash: 'cde3456' });
const BREAKING_FIX  = makeCommit('fix',  'change return type',  { breaking: true, hash: 'def4567' });

// ── groupCommits ──────────────────────────────────────────────────────────────

describe('groupCommits', () => {
  it('returns empty groups for empty array', () => {
    const { breaking, byType } = groupCommits([]);
    assert.equal(breaking.length, 0);
    assert.equal(Object.keys(byType).length, 0);
  });

  it('groups a feat commit', () => {
    const { byType } = groupCommits([FEAT]);
    assert.equal(byType.feat.length, 1);
    assert.equal(byType.feat[0].subject, 'add dark mode');
  });

  it('groups a fix commit', () => {
    const { byType } = groupCommits([FIX]);
    assert.equal(byType.fix.length, 1);
  });

  it('breaking commit appears in breaking array', () => {
    const { breaking } = groupCommits([BREAKING_FEAT]);
    assert.equal(breaking.length, 1);
    assert.equal(breaking[0].subject, 'redesign public API');
  });

  it('breaking commit also stays in its type bucket', () => {
    const { breaking, byType } = groupCommits([BREAKING_FEAT]);
    assert.equal(breaking.length, 1);
    assert.equal(byType.feat.length, 1);
  });

  it('non-breaking commit is NOT in breaking array', () => {
    const { breaking } = groupCommits([FEAT]);
    assert.equal(breaking.length, 0);
  });

  it('multiple types grouped separately', () => {
    const { byType } = groupCommits([FEAT, FIX, DOCS]);
    assert.equal(byType.feat.length, 1);
    assert.equal(byType.fix.length, 1);
    assert.equal(byType.docs.length, 1);
  });

  it('multiple commits of same type grouped together', () => {
    const feat2 = makeCommit('feat', 'second feature');
    const { byType } = groupCommits([FEAT, feat2]);
    assert.equal(byType.feat.length, 2);
  });

  it('handles two breaking changes', () => {
    const { breaking } = groupCommits([BREAKING_FEAT, BREAKING_FIX]);
    assert.equal(breaking.length, 2);
  });

  it('handles non-array gracefully', () => {
    const { breaking, byType } = groupCommits(null);
    assert.equal(breaking.length, 0);
    assert.equal(Object.keys(byType).length, 0);
  });

  it('skips null entries in array', () => {
    const { byType } = groupCommits([FEAT, null, FIX]);
    assert.equal(byType.feat.length, 1);
    assert.equal(byType.fix.length, 1);
  });
});

// ── formatMarkdown ─────────────────────────────────────────────────────────────

describe('formatMarkdown', () => {
  it('returns empty string for empty commits', () => {
    assert.equal(formatMarkdown([]), '');
  });

  it('returns empty string for null', () => {
    assert.equal(formatMarkdown(null), '');
  });

  it('includes version in header when provided', () => {
    const md = formatMarkdown([FEAT], 'v1.2.0', '2026-01-01');
    assert.match(md, /\[v1\.2\.0\]/);
  });

  it('uses "Unreleased" in header when no version', () => {
    const md = formatMarkdown([FEAT], null, '2026-01-01');
    assert.match(md, /Unreleased/);
  });

  it('includes date in header', () => {
    const md = formatMarkdown([FEAT], 'v1.0.0', '2026-03-21');
    assert.match(md, /2026-03-21/);
  });

  it('falls back to today when no date', () => {
    const md = formatMarkdown([FEAT], 'v1.0.0');
    const today = new Date().toISOString().split('T')[0];
    assert.match(md, new RegExp(today));
  });

  it('includes feat section label', () => {
    const md = formatMarkdown([FEAT]);
    assert.match(md, /Features/);
  });

  it('includes fix section label', () => {
    const md = formatMarkdown([FIX]);
    assert.match(md, /Bug Fixes/);
  });

  it('includes commit subject in output', () => {
    const md = formatMarkdown([FEAT]);
    assert.match(md, /add dark mode/);
  });

  it('includes short hash in backticks', () => {
    const md = formatMarkdown([FEAT]);
    assert.match(md, /`abc1234`/);
  });

  it('includes Breaking Changes section for breaking commit', () => {
    const md = formatMarkdown([BREAKING_FEAT]);
    assert.match(md, /Breaking Changes/);
  });

  it('breaking section appears before type sections', () => {
    const md = formatMarkdown([BREAKING_FEAT]);
    const breakingIdx = md.indexOf('Breaking Changes');
    const featIdx     = md.indexOf('Features');
    assert.ok(breakingIdx < featIdx);
  });

  it('scoped commit shows bold scope', () => {
    const md = formatMarkdown([SCOPED]);
    assert.match(md, /[*][*]profile[*][*]:/);
  });

  it('breaking commit in type section marked with ⚠️', () => {
    const md = formatMarkdown([BREAKING_FEAT]);
    // The feat section entry should have ⚠️
    assert.match(md, /⚠️/);
  });

  it('only shows sections that have commits', () => {
    const md = formatMarkdown([FEAT]);
    assert.ok(!md.includes('Bug Fixes'));
    assert.ok(!md.includes('Documentation'));
  });

  it('shows multiple sections when multiple types present', () => {
    const md = formatMarkdown([FEAT, FIX, DOCS]);
    assert.match(md, /Features/);
    assert.match(md, /Bug Fixes/);
    assert.match(md, /Documentation/);
  });

  it('feat appears before fix in output', () => {
    const md = formatMarkdown([FIX, FEAT]); // FIX first in input
    const featIdx = md.indexOf('Features');
    const fixIdx  = md.indexOf('Bug Fixes');
    assert.ok(featIdx < fixIdx);
  });

  it('outputs valid markdown list items with -', () => {
    const md = formatMarkdown([FEAT]);
    assert.match(md, /^- /m);
  });
});

// ── formatJson ────────────────────────────────────────────────────────────────

describe('formatJson', () => {
  it('returns an object', () => {
    const result = formatJson([FEAT], 'v1.0.0', '2026-03-21');
    assert.equal(typeof result, 'object');
  });

  it('version field is set', () => {
    const result = formatJson([FEAT], 'v1.2.0', '2026-03-21');
    assert.equal(result.version, 'v1.2.0');
  });

  it('version defaults to "unreleased"', () => {
    const result = formatJson([FEAT]);
    assert.equal(result.version, 'unreleased');
  });

  it('date field is set', () => {
    const result = formatJson([FEAT], null, '2026-03-21');
    assert.equal(result.date, '2026-03-21');
  });

  it('total_commits count is correct', () => {
    const result = formatJson([FEAT, FIX, DOCS], 'v1.0.0');
    assert.equal(result.total_commits, 3);
  });

  it('breaking_changes count is correct', () => {
    const result = formatJson([BREAKING_FEAT, FEAT], 'v1.0.0');
    assert.equal(result.breaking_changes, 1);
  });

  it('breaking_changes is 0 when none', () => {
    const result = formatJson([FEAT, FIX]);
    assert.equal(result.breaking_changes, 0);
  });

  it('sections.feat is populated', () => {
    const result = formatJson([FEAT]);
    assert.ok(Array.isArray(result.sections.feat));
    assert.equal(result.sections.feat.length, 1);
  });

  it('sections.feat entry has hash', () => {
    const result = formatJson([FEAT]);
    assert.equal(result.sections.feat[0].hash, 'abc1234');
  });

  it('sections.feat entry has subject', () => {
    const result = formatJson([FEAT]);
    assert.equal(result.sections.feat[0].subject, 'add dark mode');
  });

  it('sections.feat entry has breaking field', () => {
    const result = formatJson([FEAT]);
    assert.equal(result.sections.feat[0].breaking, false);
  });

  it('sections.feat entry has scope field', () => {
    const result = formatJson([SCOPED]);
    assert.equal(result.sections.feat[0].scope, 'profile');
  });

  it('sections does not include empty types', () => {
    const result = formatJson([FEAT]);
    assert.ok(!result.sections.fix);
  });

  it('handles empty array', () => {
    const result = formatJson([]);
    assert.equal(result.total_commits, 0);
    assert.equal(result.breaking_changes, 0);
    assert.equal(Object.keys(result.sections).length, 0);
  });
});

// ── formatTerminal ────────────────────────────────────────────────────────────

describe('formatTerminal', () => {
  it('returns a string', () => {
    assert.equal(typeof formatTerminal([FEAT]), 'string');
  });

  it('empty/null commits returns yellow warning', () => {
    const out = formatTerminal([]);
    assert.match(out, /No conventional commits/);
  });

  it('includes version in title when provided', () => {
    const out = formatTerminal([FEAT], 'v1.0.0', '2026-01-01');
    assert.match(out, /v1\.0\.0/);
  });

  it('includes "Unreleased" in title when no version', () => {
    const out = formatTerminal([FEAT], null, '2026-01-01');
    assert.match(out, /Unreleased/);
  });

  it('includes commit subject', () => {
    const out = formatTerminal([FEAT]);
    assert.match(out, /add dark mode/);
  });

  it('includes short hash', () => {
    const out = formatTerminal([FEAT]);
    assert.match(out, /abc1234/);
  });

  it('includes breaking changes section when breaking', () => {
    const out = formatTerminal([BREAKING_FEAT]);
    assert.match(out, /Breaking Changes/);
  });

  it('no breaking section when no breaking commits', () => {
    const out = formatTerminal([FEAT, FIX]);
    assert.ok(!out.includes('Breaking Changes'));
  });

  it('includes commit count in footer', () => {
    const out = formatTerminal([FEAT, FIX]);
    assert.match(out, /2 commits/);
  });

  it('singular "commit" for exactly one', () => {
    const out = formatTerminal([FEAT]);
    assert.match(out, /1 commit/);
    assert.ok(!out.match(/1 commits/));
  });

  it('includes scope in output', () => {
    const out = formatTerminal([SCOPED]);
    assert.match(out, /profile/);
  });

  it('contains ANSI escape codes for colour', () => {
    const out = formatTerminal([FEAT]);
    assert.match(out, /\x1b\[/);
  });

  it('includes separator line', () => {
    const out = formatTerminal([FEAT]);
    assert.match(out, /─{10,}/);
  });
});
