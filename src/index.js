'use strict';

/**
 * changelog-craft — public API
 *
 * Usage (programmatic):
 *   const cc = require('changelog-craft');
 *
 *   // Generate unreleased markdown
 *   const md = cc.generate({ version: 'v1.2.0' });
 *
 *   // Generate JSON for all commits in a range
 *   const json = cc.generate({ from: 'v1.0.0', to: 'v1.2.0', format: 'json' });
 *
 *   // Parse a raw git log line directly
 *   const commit = cc.parseRawLine('abc1234|feat(api): new endpoint');
 *
 *   // Check if a commit subject is conventional
 *   cc.isConventionalCommit('fix: resolve crash on startup'); // → true
 */

const {
  parseCommits,
  generate,
  generateAll,
  writeChangelog,
  prependChangelog
} = require('./changelog');

const {
  parseRawLine,
  parseConventionalSubject,
  isConventionalCommit,
  TYPE_LABELS,
  TYPE_ORDER,
  COMMIT_TYPES,
  CC_REGEX
} = require('./parser');

const {
  groupCommits,
  formatMarkdown,
  formatJson,
  formatTerminal
} = require('./formatter');

module.exports = {
  // High-level API
  generate,
  generateAll,
  parseCommits,
  writeChangelog,
  prependChangelog,

  // Parser utilities
  parseRawLine,
  parseConventionalSubject,
  isConventionalCommit,
  TYPE_LABELS,
  TYPE_ORDER,
  COMMIT_TYPES,
  CC_REGEX,

  // Formatter utilities
  groupCommits,
  formatMarkdown,
  formatJson,
  formatTerminal
};
