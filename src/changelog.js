'use strict';

/**
 * changelog.js — Orchestration layer: pull commits → parse → format → output
 */

const fs   = require('fs');
const path = require('path');

const { parseRawLine }                          = require('./parser');
const { formatMarkdown, formatJson, formatTerminal } = require('./formatter');
const git                                        = require('./git');

/**
 * Convert raw git log lines into parsed commit objects.
 * Non-conventional commits are silently dropped.
 * @param {string[]} rawLines
 * @returns {Array}
 */
function parseCommits(rawLines) {
  if (!Array.isArray(rawLines)) return [];
  return rawLines.map(l => parseRawLine(l)).filter(Boolean);
}

/**
 * Generate changelog content for a commit range.
 *
 * @param {object} [options]
 * @param {string} [options.cwd]      - working directory (default: process.cwd())
 * @param {string} [options.from]     - start ref / tag  (default: latest tag)
 * @param {string} [options.to]       - end ref / tag    (default: HEAD)
 * @param {string} [options.version]  - version label for the section header
 * @param {string} [options.date]     - YYYY-MM-DD date  (default: today)
 * @param {'markdown'|'json'|'terminal'} [options.format] - output format
 * @returns {string|object} - string for markdown/terminal, object for json
 */
function generate(options) {
  const {
    cwd     = process.cwd(),
    from    = null,
    to      = null,
    version = null,
    date    = null,
    format  = 'markdown'
  } = options || {};

  let rawLines;

  if (from && to) {
    rawLines = git.getCommitsInRange(from, to, cwd);
  } else if (from) {
    rawLines = git.getCommitsSince(from, cwd);
  } else {
    const latestTag = git.getLatestTag(cwd);
    rawLines = latestTag
      ? git.getCommitsSince(latestTag, cwd)
      : git.getAllCommits(cwd);
  }

  const commits = parseCommits(rawLines);

  switch (format) {
    case 'json':     return formatJson(commits, version, date);
    case 'terminal': return formatTerminal(commits, version, date);
    default:         return formatMarkdown(commits, version, date);
  }
}

/**
 * Generate a full CHANGELOG for all tagged versions plus unreleased commits.
 * Always returns a markdown string.
 *
 * @param {object} [options]
 * @param {string} [options.cwd]
 * @returns {string}
 */
function generateAll(options) {
  const { cwd = process.cwd() } = options || {};
  const tags = git.getTags(cwd);

  const header = '# Changelog\n\nAll notable changes to this project will be documented here.\n\n';

  if (tags.length === 0) {
    // No tags: generate single unreleased section
    const allRaw    = git.getAllCommits(cwd);
    const allParsed = parseCommits(allRaw);
    return header + formatMarkdown(allParsed, null, null);
  }

  let changelog = header;

  // Unreleased: commits after the latest tag
  const unreleasedRaw    = git.getCommitsSince(tags[0].tag, cwd);
  const unreleasedParsed = parseCommits(unreleasedRaw);
  if (unreleasedParsed.length > 0) {
    changelog += formatMarkdown(unreleasedParsed, null, null);
  }

  // Each tagged version, newest first
  for (let i = 0; i < tags.length; i++) {
    const current  = tags[i];
    const previous = tags[i + 1];

    const rawLines = previous
      ? git.getCommitsInRange(previous.tag, current.tag, cwd)
      : git.getCommitLog(current.tag, cwd);

    const parsed = parseCommits(rawLines);
    if (parsed.length > 0) {
      changelog += formatMarkdown(parsed, current.tag, current.date);
    }
  }

  return changelog;
}

/**
 * Write changelog content to a file (overwrites if exists).
 * @param {string} filePath
 * @param {string} content
 */
function writeChangelog(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Prepend changelog content to an existing file (or create it).
 * Preserves any top-level "# Changelog" header in the existing file.
 * @param {string} filePath
 * @param {string} content
 */
function prependChangelog(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, 'utf8');
    return;
  }

  const existing = fs.readFileSync(filePath, 'utf8');

  // If the file starts with a top-level header block, preserve it at the top
  const headerMatch = existing.match(/^(#[^\n]+\n(?:[^\n]*\n)*?\n)/);
  if (headerMatch) {
    const header = headerMatch[1];
    const rest   = existing.slice(header.length);
    fs.writeFileSync(filePath, header + content + '\n' + rest, 'utf8');
  } else {
    fs.writeFileSync(filePath, content + '\n' + existing, 'utf8');
  }
}

module.exports = {
  parseCommits,
  generate,
  generateAll,
  writeChangelog,
  prependChangelog
};
