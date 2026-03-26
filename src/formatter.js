'use strict';

/**
 * formatter.js — Format parsed commits into markdown, JSON, or terminal output
 */

const { TYPE_LABELS, TYPE_ORDER } = require('./parser');

/** @returns {string} Today in YYYY-MM-DD */
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Group an array of parsed commits by type, and collect breaking changes.
 * @param {Array} commits
 * @returns {{ breaking: Array, byType: Object }}
 */
function groupCommits(commits) {
  if (!Array.isArray(commits)) return { breaking: [], byType: {} };

  const breaking = [];
  const byType   = {};

  for (const commit of commits) {
    if (!commit || typeof commit.type !== 'string') continue;

    if (commit.breaking) breaking.push(commit);

    const t = commit.type;
    if (!byType[t]) byType[t] = [];
    byType[t].push(commit);
  }

  return { breaking, byType };
}

/**
 * Render a list of commits as a Markdown changelog section.
 * @param {Array}  commits  - parsed commit objects
 * @param {string} [version] - version label, e.g. "v1.2.0" (omit for Unreleased)
 * @param {string} [date]    - YYYY-MM-DD (defaults to today)
 * @returns {string}
 */
function formatMarkdown(commits, version, date) {
  if (!commits || commits.length === 0) return '';

  const { breaking, byType } = groupCommits(commits);
  const dateStr = date || todayStr();
  const header  = version
    ? `## [${version}] — ${dateStr}`
    : `## Unreleased — ${dateStr}`;

  let out = `${header}\n\n`;

  // Breaking changes first
  if (breaking.length > 0) {
    out += `### ⚠️ Breaking Changes\n\n`;
    for (const c of breaking) {
      const scope = c.scope ? `**${c.scope}**: ` : '';
      out += `- ${scope}${c.subject} (\`${c.hash}\`)\n`;
    }
    out += '\n';
  }

  // Then each type in preferred order
  for (const type of TYPE_ORDER) {
    const list = byType[type];
    if (!list || list.length === 0) continue;

    const label = TYPE_LABELS[type] || type;
    out += `### ${label}\n\n`;

    for (const c of list) {
      const scope        = c.scope    ? `**${c.scope}**: `  : '';
      const breakingMark = c.breaking ? ' ⚠️'               : '';
      out += `- ${scope}${c.subject} (\`${c.hash}\`)${breakingMark}\n`;
    }
    out += '\n';
  }

  return out;
}

/**
 * Render commits as a structured JSON object.
 * @param {Array}  commits
 * @param {string} [version]
 * @param {string} [date]
 * @returns {Object}
 */
function formatJson(commits, version, date) {
  const safeCommits = Array.isArray(commits) ? commits : [];
  const { breaking, byType } = groupCommits(safeCommits);
  const dateStr = date || todayStr();

  const sections = {};
  for (const type of TYPE_ORDER) {
    const list = byType[type];
    if (list && list.length > 0) {
      sections[type] = list.map(c => ({
        hash:     c.hash,
        scope:    c.scope  || null,
        subject:  c.subject,
        breaking: c.breaking || false
      }));
    }
  }

  return {
    version:          version || 'unreleased',
    date:             dateStr,
    breaking_changes: breaking.length,
    total_commits:    safeCommits.length,
    sections
  };
}

/**
 * Render commits as a coloured terminal string (ANSI).
 * @param {Array}  commits
 * @param {string} [version]
 * @param {string} [date]
 * @returns {string}
 */
function formatTerminal(commits, version, date) {
  if (!commits || commits.length === 0) {
    return '\x1b[33mNo conventional commits found in the requested range.\x1b[0m\n';
  }

  const { breaking, byType } = groupCommits(commits);
  const dateStr = date || todayStr();
  const title   = version
    ? `📋  ${version} — ${dateStr}`
    : `📋  Unreleased — ${dateStr}`;

  let out = `\x1b[1m\x1b[36m${title}\x1b[0m\n`;
  out    += '─'.repeat(55) + '\n\n';

  if (breaking.length > 0) {
    out += `\x1b[1m\x1b[31m⚠️  Breaking Changes\x1b[0m\n`;
    for (const c of breaking) {
      const scope = c.scope ? `\x1b[33m(${c.scope})\x1b[0m ` : '';
      out += `  \x1b[31m●\x1b[0m ${scope}${c.subject} \x1b[90m[${c.hash}]\x1b[0m\n`;
    }
    out += '\n';
  }

  for (const type of TYPE_ORDER) {
    const list = byType[type];
    if (!list || list.length === 0) continue;

    const label = TYPE_LABELS[type] || type;
    out += `\x1b[1m\x1b[32m${label}\x1b[0m\n`;

    for (const c of list) {
      const scope        = c.scope    ? `\x1b[33m(${c.scope})\x1b[0m ` : '';
      const breakingMark = c.breaking ? ` \x1b[31m⚠️\x1b[0m`           : '';
      out += `  \x1b[32m●\x1b[0m ${scope}${c.subject} \x1b[90m[${c.hash}]\x1b[0m${breakingMark}\n`;
    }
    out += '\n';
  }

  const total = commits.length;
  out += `\x1b[90m${total} commit${total !== 1 ? 's' : ''} in this range.\x1b[0m\n`;

  return out;
}

module.exports = {
  groupCommits,
  formatMarkdown,
  formatJson,
  formatTerminal
};
