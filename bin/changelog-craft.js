#!/usr/bin/env node
'use strict';

/**
 * changelog-craft CLI
 *
 * Usage:
 *   changelog-craft [options]
 *
 * Run `changelog-craft --help` for full documentation.
 */

const args = process.argv.slice(2);

// ── Argument helpers ──────────────────────────────────────────────────────────

/** Return the value after --<name> / -<short>, or true if it's a flag */
function flag(name, short) {
  const longIdx  = args.indexOf(`--${name}`);
  const shortIdx = short ? args.indexOf(`-${short}`) : -1;
  const idx      = longIdx !== -1 ? longIdx : shortIdx;
  if (idx === -1) return null;
  // If next arg exists and doesn't start with '-', treat it as the value
  const next = args[idx + 1];
  return (next && !next.startsWith('-')) ? next : true;
}

function hasFlag(name, short) {
  return args.includes(`--${name}`) || (short ? args.includes(`-${short}`) : false);
}

// ── Help ──────────────────────────────────────────────────────────────────────

if (hasFlag('help', 'h') || args[0] === 'help' || args.length === 0 && !process.stdin.isTTY) {
  // Show help only when explicitly requested; no-arg invocation generates changelog
}

if (hasFlag('help', 'h') || args[0] === 'help') {
  console.log(`
  \x1b[1m\x1b[36mchangelog-craft\x1b[0m — Generate beautiful CHANGELOGs from conventional commits

  \x1b[1mUSAGE\x1b[0m
    changelog-craft [options]

  \x1b[1mOPTIONS\x1b[0m
    --from <ref>       Start from this tag/ref (default: latest tag)
    --to <ref>         End at this tag/ref    (default: HEAD)
    --version <v>      Label this section with a version string (e.g. v1.2.0)
    --output <file>    Write output to file   (default: stdout)
    --prepend          Prepend to an existing file (implies --output CHANGELOG.md)
    --format <fmt>     markdown (default) | json | terminal
    --all              Generate full changelog for all tagged versions
    --help, -h         Show this help message
    --version-info     Print changelog-craft version

  \x1b[1mEXAMPLES\x1b[0m
    # Show unreleased commits since the last tag
    changelog-craft

    # Commits since v1.0.0
    changelog-craft --from v1.0.0

    # Specific range with version label, written to file
    changelog-craft --from v1.0.0 --to v1.1.0 --version v1.1.0 --output CHANGELOG.md

    # Prepend latest unreleased section to existing CHANGELOG.md
    changelog-craft --version v1.2.0 --prepend

    # JSON output (pipe into jq, CI scripts, etc.)
    changelog-craft --format json | jq '.sections.feat'

    # Full history for all tags
    changelog-craft --all --output CHANGELOG.md

  \x1b[1mCONVENTIONAL COMMIT TYPES RECOGNISED\x1b[0m
    feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

    Append \x1b[1m!\x1b[0m for breaking changes:  feat!: redesign public API
    Scopes are supported:          fix(auth): handle token expiry
`);
  process.exit(0);
}

if (hasFlag('version-info')) {
  const pkg = require('../package.json');
  console.log(`changelog-craft v${pkg.version}`);
  process.exit(0);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const { generate, generateAll, writeChangelog, prependChangelog } = require('../src');

const from    = flag('from')    || null;
const to      = flag('to')      || null;
const version = flag('version') || null;
const output  = flag('output', 'o') || null;
const format  = flag('format')  || 'markdown';
const all     = hasFlag('all');
const prepend = hasFlag('prepend');

try {
  let result;

  if (all) {
    result = generateAll({ format });
  } else {
    result = generate({
      from:    from    || undefined,
      to:      to      || undefined,
      version: version || undefined,
      format
    });
  }

  const content = format === 'json'
    ? JSON.stringify(result, null, 2)
    : result;

  if (prepend) {
    const file = output || 'CHANGELOG.md';
    prependChangelog(file, content);
    console.log(`\x1b[32m✔\x1b[0m  Prepended to \x1b[1m${file}\x1b[0m`);
  } else if (output) {
    writeChangelog(output, content);
    console.log(`\x1b[32m✔\x1b[0m  Written to \x1b[1m${output}\x1b[0m`);
  } else {
    process.stdout.write(content);
    if (!content.endsWith('\n')) process.stdout.write('\n');
  }

} catch (err) {
  console.error(`\x1b[31m✘\x1b[0m  ${err.message}`);
  process.exit(1);
}
