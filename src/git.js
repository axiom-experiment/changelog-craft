'use strict';

/**
 * git.js — Thin wrapper around git CLI for changelog-craft.
 * All functions are synchronous and pure (no side-effects beyond reading git).
 */

const { execSync } = require('child_process');

/**
 * Execute a git command and return trimmed stdout.
 * Throws on non-zero exit.
 * @param {string} cmd
 * @param {string} [cwd]
 * @returns {string}
 */
function execGit(cmd, cwd) {
  return execSync(cmd, {
    cwd:      cwd || process.cwd(),
    encoding: 'utf8',
    stdio:    ['pipe', 'pipe', 'pipe']
  }).trim();
}

/**
 * Check whether cwd is inside a git repository.
 * @param {string} [cwd]
 * @returns {boolean}
 */
function isGitRepo(cwd) {
  try {
    execGit('git rev-parse --is-inside-work-tree', cwd);
    return true;
  } catch {
    return false;
  }
}

/**
 * Return all version tags, newest first.
 * Each tag: { tag, hash, date }
 * @param {string} [cwd]
 * @returns {Array<{tag: string, hash: string, date: string}>}
 */
function getTags(cwd) {
  try {
    const raw = execGit(
      'git tag --sort=-version:refname --format=%(refname:short)|%(objectname:short)|%(creatordate:short)',
      cwd
    );
    if (!raw) return [];
    return raw.split('\n').filter(Boolean).map(line => {
      const parts = line.split('|');
      return { tag: parts[0], hash: parts[1], date: parts[2] };
    });
  } catch {
    return [];
  }
}

/**
 * Return the most recent semver-style tag, or null if none exists.
 * @param {string} [cwd]
 * @returns {string|null}
 */
function getLatestTag(cwd) {
  try {
    const tag = execGit('git describe --tags --abbrev=0', cwd);
    return tag || null;
  } catch {
    return null;
  }
}

/**
 * Fetch raw log lines for a git range using format "%H|%s".
 * Merge commits are excluded (--no-merges).
 * @param {string} range  - e.g. "v1.0.0..HEAD", "HEAD", "v1.0.0..v1.1.0"
 * @param {string} [cwd]
 * @returns {string[]}
 */
function getCommitLog(range, cwd) {
  try {
    const raw = execGit(
      `git log ${range} --pretty=format:"%H|%s" --no-merges`,
      cwd
    );
    if (!raw) return [];
    // git wraps lines in quotes on some platforms — strip them
    return raw.split('\n').filter(Boolean).map(l => l.replace(/^"|"$/g, ''));
  } catch {
    return [];
  }
}

/**
 * All commits reachable from HEAD.
 * @param {string} [cwd]
 * @returns {string[]}
 */
function getAllCommits(cwd) {
  return getCommitLog('HEAD', cwd);
}

/**
 * Commits reachable from HEAD but not from `tag`.
 * @param {string} tag
 * @param {string} [cwd]
 * @returns {string[]}
 */
function getCommitsSince(tag, cwd) {
  return getCommitLog(`${tag}..HEAD`, cwd);
}

/**
 * Commits in the range `from..to` (exclusive of `from`, inclusive of `to`).
 * @param {string} from  - older ref
 * @param {string} [to]  - newer ref, defaults to HEAD
 * @param {string} [cwd]
 * @returns {string[]}
 */
function getCommitsInRange(from, to, cwd) {
  const toRef = to || 'HEAD';
  return getCommitLog(`${from}..${toRef}`, cwd);
}

module.exports = {
  execGit,
  isGitRepo,
  getTags,
  getLatestTag,
  getCommitLog,
  getAllCommits,
  getCommitsSince,
  getCommitsInRange
};
