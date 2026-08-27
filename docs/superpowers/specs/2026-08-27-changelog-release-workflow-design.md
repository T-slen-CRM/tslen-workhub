# Changelog & release workflow design

## Problem

There is no `CHANGELOG.md`, no release tags, and no release CI in this
repo. Commits are already strict Conventional Commits (`AGENTS.md`), so
release notes can be generated from git history instead of hand-written.

## Scope (v1)

- **One combined `CHANGELOG.md`** at repo root, covering both the
  backend (root `package.json`, currently `0.0.1`) and the frontend
  (`packages/web/package.json`, currently `1.0.0`) — not a changelog
  per package. The two packages keep versioning independently in their
  own `package.json` files; this changelog is a repo-wide release
  history, not a per-package one.
- **One repo-wide semver tag per release** (`vX.Y.Z`), decided and
  pushed manually by the maintainer — this project doesn't auto-bump
  version numbers. The tag does not have to correspond to either
  package's own `package.json` version.
- **`package.json` version fields are left untouched** by this
  workflow. Neither package is published to npm; the fields are
  cosmetic here, and syncing them to the tag would conflate repo-wide
  release versioning with each package's independent version.
- Changelog generation is **tag-triggered, not commit-triggered** —
  nothing changes in `CHANGELOG.md` on every merge to `main`, only when
  a `vX.Y.Z` tag is pushed.
- **Out of scope for v1:**
  - Per-package changelogs.
  - Auto-bumping `package.json` versions.
  - Auto-computing the next semver number (major/minor/patch) from
    commit history — the maintainer picks and pushes the tag.
  - An "Unreleased" section maintained on `main` between releases.

## Tooling

[`git-cliff`](https://git-cliff.org/) — a single static binary, added
as neither a root nor `packages/web` dependency. It reads Conventional
Commit messages straight from `git log`, so it needs no extra commit
metadata beyond what `AGENTS.md` already enforces.

Config lives in a new root `cliff.toml`, committed to git.

## Commit grouping

`cliff.toml` groups commits into changelog sections by Conventional
Commit type, in this order:

1. **Breaking Changes** — commits with `!` after type/scope, or a
   `BREAKING CHANGE:` footer.
2. **Features** — `feat`
3. **Bug Fixes** — `fix`
4. **Performance** — `perf`
5. **Refactor** — `refactor`
6. **Other** — `docs`, `test`, `build`, `ci`, `style` (collapsed into
   one section)

`chore` commits are excluded from the changelog entirely — they carry
no user-facing value and would just be noise.

Each changelog line keeps the commit's `(scope)` prefix verbatim (e.g.
`feat(meeting-links): add host meeting-link management UI`), so a
reader can tell which area of the combined backend/frontend codebase a
line touched without opening a separate per-package file.

## File format

`CHANGELOG.md` follows a Keep-a-Changelog-style layout:

```markdown
# Changelog

## [v1.2.0] - 2026-09-10

### Breaking Changes
- ...

### Features
- feat(meeting-links): add host meeting-link management UI

### Bug Fixes
- fix(meeting-links): add error-path tests and clear stale link banner on revoke

### Other
- ...

[v1.2.0]: https://github.com/T-slen-CRM/tslen-workhub/compare/v1.1.0...v1.2.0

## [v1.1.0] - 2026-08-20
...
```

Newest release first. Each version heading links to the GitHub compare
view against the previous tag. The first-ever run has no previous tag
to compare against, so it backfills one section covering all commit
history up to whatever version is chosen for the first tag.

## CI workflow

New file: `.github/workflows/release.yml`.

```
Maintainer runs: git tag vX.Y.Z && git push origin vX.Y.Z
        |
        v
Workflow triggers on push of tag matching v*.*.*
        |
        v
Checkout with full history (fetch-depth: 0 — git-cliff needs the
full commit log to diff against the previous tag)
        |
        v
Install git-cliff, run it scoped to the new tag's commit range
        |
        v
Prepend the generated section into CHANGELOG.md
        |
        v
Commit CHANGELOG.md to main as github-actions[bot]
(GITHUB_TOKEN with contents: write — confirmed main has no
branch protection, so a direct push works)
        |
        v
Publish a GitHub Release on the tag, body = the same
generated section
```

Notes:
- The git tag itself keeps pointing at the maintainer's original
  release commit; the changelog commit lands on `main` immediately
  after it (same pattern used by release-please and similar tools).
  The GitHub Release body carries the authoritative text regardless of
  which commit the tag points to.
- Tagging stays a manual, maintainer-driven step — this workflow only
  reacts to a pushed tag, it never creates one.

## Verification plan

This is CI/tooling, not application logic, so there's no unit test
suite to write. Verification instead:

1. **Local dry run first** — run `git-cliff` locally (no CI involved)
   against the existing commit history and inspect the generated
   `CHANGELOG.md` output before wiring up any workflow, to validate
   `cliff.toml`'s grouping/formatting against this repo's real commits.
2. **Test tag before a real release** — push a throwaway tag (e.g. on
   a scratch branch, or a `v0.0.0-test` tag deleted afterward) to
   confirm the workflow's permissions, the commit-back step, and the
   GitHub Release publish step all work end-to-end, before trusting it
   for an actual `vX.Y.Z` release.
