'use strict';

/**
 * parser.js — Parse conventional commit messages
 * Supports: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
 * Supports: scope (feat(api): ...), breaking change (feat!: ..., feat(api)!: ...)
 */

/** All recognised conventional commit types */
const COMMIT_TYPES = [
  'feat', 'fix', 'docs', 'style', 'refactor',
  'perf', 'test', 'build', 'ci', 'chore', 'revert'
];

/**
 * Regex for a conventional commit subject line.
 * Groups: [1] type, [2] (scope), [3] !, [4] description
 */
const CC_REGEX = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^)]+\))?(!)?: (.+)/i;

/**
 * Human-readable labels for each commit type.
 * Emoji-prefixed for terminal/markdown flair.
 */
const TYPE_LABELS = {
  feat:     '✨ Features',
  fix:      '🐛 Bug Fixes',
  docs:     '📚 Documentation',
  style:    '💎 Styles',
  refactor: '♻️  Code Refactoring',
  perf:     '🚀 Performance Improvements',
  test:     '🧪 Tests',
  build:    '🔧 Build System',
  ci:       '⚙️  CI',
  chore:    '🗑️  Chores',
  revert:   '⏪ Reverts'
};

/**
 * Display order: user-facing types first, housekeeping last.
 */
const TYPE_ORDER = [
  'feat', 'fix', 'perf', 'refactor',
  'docs', 'style', 'test', 'build', 'ci', 'chore', 'revert'
];

/**
 * Parse a conventional commit subject line (not including hash).
 * @param {string} subject - e.g. "feat(api)!: add new endpoint"
 * @returns {{ type, scope, breaking, subject } | null}
 */
function parseConventionalSubject(subject) {
  if (!subject || typeof subject !== 'string') return null;
  const match = subject.trim().match(CC_REGEX);
  if (!match) return null;
  return {
    type:     match[1].toLowerCase(),
    scope:    match[2] ? match[2].slice(1, -1) : null, // strip parens
    breaking: match[3] === '!',
    subject:  match[4].trim()
  };
}

/**
 * Parse a raw git log line in the format "FULLHASH|subject".
 * (Produced by: git log --pretty=format:"%H|%s")
 * @param {string} line
 * @returns {{ hash, fullHash, type, scope, breaking, subject, raw } | null}
 */
function parseRawLine(line) {
  if (!line || typeof line !== 'string') return null;
  const pipeIdx = line.indexOf('|');
  if (pipeIdx === -1) return null;

  const fullHash = line.slice(0, pipeIdx).trim();
  const subject  = line.slice(pipeIdx + 1).trim();

  const parsed = parseConventionalSubject(subject);
  if (!parsed) return null;

  return {
    hash:     fullHash.slice(0, 7),
    fullHash,
    ...parsed,
    raw: subject
  };
}

/**
 * Returns true if the given string is a valid conventional commit subject.
 * @param {string} subject
 * @returns {boolean}
 */
function isConventionalCommit(subject) {
  if (!subject || typeof subject !== 'string') return false;
  return CC_REGEX.test(subject.trim());
}

module.exports = {
  COMMIT_TYPES,
  CC_REGEX,
  TYPE_LABELS,
  TYPE_ORDER,
  parseConventionalSubject,
  parseRawLine,
  isConventionalCommit
};
