# changelog-craft

> Generate beautiful CHANGELOGs from conventional commits. Zero dependencies. CLI + programmable API.

[![npm version](https://img.shields.io/npm/v/changelog-craft.svg)](https://www.npmjs.com/package/changelog-craft)
[![npm downloads](https://img.shields.io/npm/dw/changelog-craft.svg)](https://www.npmjs.com/package/changelog-craft)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

---

## Why changelog-craft?

Every team using [Conventional Commits](https://www.conventionalcommits.org/) needs a CHANGELOG. Most tools require config files, plugins, or pulling in hundreds of dependencies. `changelog-craft` does it with **zero dependencies**, a single command, and a clean API you can use in your own scripts.

- ✅ Zero runtime dependencies
- ✅ CLI + programmable Node.js API
- ✅ Markdown, JSON, and terminal output
- ✅ Full history mode (`--all`) or per-release deltas
- ✅ Breaking change detection (`feat!:`, `BREAKING CHANGE:`)
- ✅ Scope support (`fix(auth):`, `feat(api):`)
- ✅ Prepend to existing CHANGELOG.md (non-destructive)
- ✅ Works with any git repo on any platform

---

## Installation

```bash
# Global CLI
npm install -g changelog-craft

# Or project-local (run with npx)
npm install --save-dev changelog-craft
```

---

## Quick Start

```bash
# Show unreleased commits since the last tag (stdout)
changelog-craft

# Generate changelog for commits since v1.0.0
changelog-craft --from v1.0.0

# Write a release section to CHANGELOG.md
changelog-craft --from v1.0.0 --to v1.1.0 --version v1.1.0 --output CHANGELOG.md

# Prepend the newest unreleased section to an existing CHANGELOG.md
changelog-craft --version v1.2.0 --prepend

# Full history for all tagged versions
changelog-craft --all --output CHANGELOG.md

# JSON output — pipe into jq, CI scripts, notifications
changelog-craft --format json | jq '.sections.feat'

# Coloured terminal output (great for release scripts)
changelog-craft --format terminal
```

---

## CLI Reference

```
changelog-craft [options]

OPTIONS
  --from <ref>       Start from this tag/ref (default: latest tag)
  --to <ref>         End at this tag/ref    (default: HEAD)
  --version <v>      Label this section with a version string (e.g. v1.2.0)
  --output <file>    Write output to file   (default: stdout)
  --prepend          Prepend to an existing CHANGELOG.md (implies --output)
  --format <fmt>     markdown (default) | json | terminal
  --all              Generate full changelog for all tagged versions
  --help, -h         Show this help message
  --version-info     Print changelog-craft version
```

---

## Conventional Commit Types Recognised

| Type       | Section in CHANGELOG      |
|------------|---------------------------|
| `feat`     | ✨ Features               |
| `fix`      | 🐛 Bug Fixes              |
| `perf`     | ⚡ Performance            |
| `refactor` | ♻️ Refactoring            |
| `docs`     | 📝 Documentation          |
| `test`     | 🧪 Tests                  |
| `build`    | 🏗️ Build System           |
| `ci`       | 🔄 CI                     |
| `chore`    | 🔧 Chores                 |
| `style`    | 💄 Styling                |
| `revert`   | ⏪ Reverts                |

Append `!` for breaking changes: `feat!: redesign public API`
Scopes are supported: `fix(auth): handle token expiry`

---

## Programmatic API

```js
const {
  generate,
  generateAll,
  writeChangelog,
  prependChangelog
} = require('changelog-craft');

// Generate markdown for unreleased commits
const md = generate({ version: 'v1.2.0' });
console.log(md);

// Generate JSON for CI/notification scripts
const data = generate({ format: 'json', from: 'v1.0.0', to: 'v1.1.0' });

// Full changelog for every tagged release
const fullMd = generateAll({ cwd: '/path/to/repo' });

// Write to file
writeChangelog('CHANGELOG.md', fullMd);

// Prepend newest section (preserves existing content)
prependChangelog('CHANGELOG.md', md);
```

### `generate(options)` → `string | object`

| Option    | Type   | Default       | Description                             |
|-----------|--------|---------------|-----------------------------------------|
| `cwd`     | string | `process.cwd()` | Repository working directory          |
| `from`    | string | latest tag    | Start ref/tag                           |
| `to`      | string | `HEAD`        | End ref/tag                             |
| `version` | string | —             | Version label for the section header    |
| `date`    | string | today         | Date in `YYYY-MM-DD` format             |
| `format`  | string | `'markdown'`  | `'markdown'` \| `'json'` \| `'terminal'` |

### `generateAll(options)` → `string`

Generates a full CHANGELOG covering every tagged version plus unreleased commits. Always returns Markdown.

| Option | Type   | Default         | Description               |
|--------|--------|-----------------|---------------------------|
| `cwd`  | string | `process.cwd()` | Repository working directory |

---

## Example Output

```markdown
## [v1.2.0] — 2026-03-22

### ✨ Features
- **api**: add streaming response support (abc1234)
- add dark mode to dashboard (def5678)

### 🐛 Bug Fixes
- **auth**: handle token expiry gracefully (ghi9012)

### ⚠️ Breaking Changes
- **config**: `apiKey` option renamed to `token` — update all callers (jkl3456)
```

---

## Use in Release Scripts

```bash
#!/bin/bash
# release.sh — bump version, generate changelog, tag, push

VERSION=$1

# Generate & prepend new section
changelog-craft --version "$VERSION" --prepend

# Commit, tag, push
git add CHANGELOG.md
git commit -m "chore(release): $VERSION"
git tag "$VERSION"
git push && git push --tags
```

---

## CI Integration

```yaml
# GitHub Actions example
- name: Generate release notes
  run: |
    npx changelog-craft --from ${{ github.event.release.target_commitish }} \
      --version ${{ github.event.release.tag_name }} \
      --format json > release-notes.json
```

---

## Contributing

Issues and PRs are welcome! This package is intentionally dependency-free — please keep it that way in contributions.

```bash
git clone https://github.com/yonderzenith/changelog-craft
cd changelog-craft
npm test
```

---

## License

MIT © [AXIOM / Yonder Zenith LLC](https://github.com/yonderzenith)

---

> Built by [AXIOM](https://github.com/yonderzenith) — an autonomous AI agent experiment.
> ☕ [Buy me a coffee](https://buymeacoffee.com/axiom) if this tool saved you time.
