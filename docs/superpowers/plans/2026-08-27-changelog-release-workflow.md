# Changelog & Release Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a combined `CHANGELOG.md` from Conventional Commit history via `git-cliff`, published automatically as a GitHub Release whenever a repo-wide `vX.Y.Z` tag is pushed.

**Architecture:** A `cliff.toml` config drives `git-cliff`, a standalone binary with no new npm dependency. A new `.github/workflows/release.yml` triggers on `v*.*.*` tag pushes, regenerates the full `CHANGELOG.md` from all matching tags, commits it to `main`, then publishes the same tag's section as a GitHub Release body. Tagging itself stays a manual, maintainer-driven step.

**Tech Stack:** `git-cliff` (v2.13.1, installed via Homebrew locally / `orhun/git-cliff-action@v4` in CI), GitHub Actions, `actionlint` for workflow validation.

**Spec:** `docs/superpowers/specs/2026-08-27-changelog-release-workflow-design.md`

## Global Constraints

- One combined `CHANGELOG.md` at repo root — not per-package. (Spec: Scope)
- Repo-wide semver tags (`vX.Y.Z`), pushed manually — no auto-bump. (Spec: Scope)
- `package.json` version fields (root and `packages/web/`) are never touched by this workflow. (Spec: Scope)
- Changelog updates only on tag push — never on every merge to `main`. (Spec: Scope)
- No dependency added to either `package.json` — `git-cliff` is a standalone binary. (Spec: Tooling)
- `chore` commits are excluded from the changelog. (Spec: Commit grouping)
- Every finding below was verified against the real `git-cliff` 2.13.1 CLI and `actionlint` run locally in this repo's history before being written into this plan — not guessed from documentation alone.

---

### Task 1: Add git-cliff configuration

**Files:**
- Create: `cliff.toml` (repo root)

**Interfaces:**
- Produces: a config file consumed by both local `git-cliff` invocations (Task 2) and the CI workflow (Task 3) via `--config cliff.toml`.

**Note on version drift:** git-cliff's own documentation site currently describes a newer, unreleased Tera filter (`commit_groups(groups=commit_parsers_groups)`) that does **not** exist in the installed stable release (v2.13.1) — it errors with `Filter 'commit_groups' not found`. This plan uses the filter that actually ships in v2.13.1: `group_by(attribute="group")`. Do not "fix" this to match the docs site without re-checking `git-cliff --version` first.

- [ ] **Step 1: Confirm git-cliff is installed**

Run: `git-cliff --version`
Expected: `git-cliff 2.13.1` (or later 2.x). If not found, run `brew install git-cliff` first.

- [ ] **Step 2: Verify the command fails before the config exists**

Run (from repo root):
```bash
git-cliff --config cliff.toml --unreleased --strip header
```
Expected: FAIL — `cliff.toml` does not exist yet, so git-cliff errors trying to read it.

- [ ] **Step 3: Write `cliff.toml`**

```toml
[remote.github]
owner = "T-slen-CRM"
repo = "tslen-workhub"

[changelog]
header = """
# Changelog
"""
body = """
{% if version %}\
    {% if previous.version %}\
        ## [{{ version | trim_start_matches(pat="v") }}](https://github.com/{{ remote.github.owner }}/{{ remote.github.repo }}/compare/{{ previous.version }}...{{ version }}) - {{ timestamp | date(format="%Y-%m-%d") }}
    {% else %}\
        ## [{{ version | trim_start_matches(pat="v") }}] - {{ timestamp | date(format="%Y-%m-%d") }}
    {% endif %}\
{% else %}\
    ## [Unreleased]
{% endif %}\
{% for group, commits in commits | group_by(attribute="group") %}
    ### {{ group | striptags | trim | upper_first }}
    {% for commit in commits %}
        - {% if commit.scope %}*({{ commit.scope }})* {% endif %}{{ commit.message | upper_first }}
    {% endfor %}
{% endfor %}
"""
trim = true
footer = ""

[git]
conventional_commits = true
filter_unconventional = true
split_commits = false
protect_breaking_commits = true
commit_parsers = [
  { footer = "BREAKING CHANGE", group = "<!-- 0 -->Breaking Changes" },
  { message = "^[a-zA-Z]+(\\([^)]+\\))?!:", group = "<!-- 0 -->Breaking Changes" },
  { message = "^feat", group = "<!-- 1 -->Features" },
  { message = "^fix", group = "<!-- 2 -->Bug Fixes" },
  { message = "^perf", group = "<!-- 3 -->Performance" },
  { message = "^refactor", group = "<!-- 4 -->Refactor" },
  { message = "^doc", group = "<!-- 5 -->Other" },
  { message = "^test", group = "<!-- 5 -->Other" },
  { message = "^build", group = "<!-- 5 -->Other" },
  { message = "^ci", group = "<!-- 5 -->Other" },
  { message = "^style", group = "<!-- 5 -->Other" },
  { message = "^chore", skip = true },
]
filter_commits = false
tag_pattern = "^v[0-9]+\\.[0-9]+\\.[0-9]+$"
topo_order = false
sort_commits = "oldest"
```

- [ ] **Step 4: Run it again and verify grouping is correct**

Run:
```bash
git-cliff --config cliff.toml --unreleased --strip header > /tmp/cliff-check.md
```
Expected: exits 0. Then verify each of the following:
```bash
grep -c "^### Features" /tmp/cliff-check.md      # expect: 1
grep -c "^### Bug Fixes" /tmp/cliff-check.md      # expect: 1
grep -c "^### Other" /tmp/cliff-check.md          # expect: 1
grep -c "remove unused dependencies" /tmp/cliff-check.md   # expect: 0 (a chore commit — must be excluded)
```
If any count doesn't match, the `commit_parsers` entries are wrong — check ordering (first match wins) before changing regexes.

- [ ] **Step 5: Commit**

```bash
git add cliff.toml
git commit -m "chore(release): add git-cliff config for changelog generation"
```

---

### Task 2: Bootstrap CHANGELOG.md

**Files:**
- Create: `CHANGELOG.md` (repo root)

**Interfaces:**
- Consumes: nothing from Task 1 directly (this is a hand-written bootstrap, not a `git-cliff` invocation) — the file's `# Changelog` header must match `cliff.toml`'s `[changelog].header` template so the first CI-driven update (Task 3) doesn't introduce a duplicate or conflicting header.

This repo has no version tags yet, so there is no release history for `git-cliff` to render. Per the spec, there must be **no "Unreleased" section maintained on `main`** — so this file starts as just the header, and gets its first real `## [vX.Y.Z]` section only when the maintainer pushes the first tag (Task 3's workflow handles that).

- [ ] **Step 1: Verify the file doesn't exist yet**

Run: `test -f CHANGELOG.md && echo EXISTS || echo MISSING`
Expected: `MISSING`

- [ ] **Step 2: Write `CHANGELOG.md`**

```markdown
# Changelog

All notable changes to this project are documented here. Entries are
generated automatically by [git-cliff](https://git-cliff.org/) from
Conventional Commit history whenever a `vX.Y.Z` release tag is pushed —
see `cliff.toml` and `.github/workflows/release.yml`.
```

- [ ] **Step 3: Verify it's header-only**

```bash
head -1 CHANGELOG.md              # expect: "# Changelog"
grep -c "^## \[" CHANGELOG.md     # expect: 0 (no release sections yet)
```

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): bootstrap CHANGELOG.md"
```

---

### Task 3: Add the release GitHub Actions workflow

**Files:**
- Create: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: `cliff.toml` (Task 1, via `--config cliff.toml`), `CHANGELOG.md` (Task 2, as the file it overwrites and re-commits).
- Produces: on a `vX.Y.Z` tag push, an updated `CHANGELOG.md` commit on `main` and a GitHub Release on that tag.

Note: this repo's existing `.github/workflows/main-ci.yml` pins `actions/checkout@v3`, which `actionlint` flags as running on a deprecated/EOL runner. Don't copy that pin — this task uses `actions/checkout@v4` instead. (Not in scope to fix `main-ci.yml`.)

- [ ] **Step 1: Confirm actionlint is installed**

Run: `actionlint --version`
Expected: prints a version. If not found: `brew install actionlint` (pulls in `shellcheck` as a dependency).

- [ ] **Step 2: Verify actionlint fails before the file exists**

Run: `actionlint .github/workflows/release.yml`
Expected: FAIL — `open .github/workflows/release.yml: no such file or directory`

- [ ] **Step 3: Write `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    tags:
      - "v*.*.*"

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          ref: main

      - name: Update CHANGELOG.md
        uses: orhun/git-cliff-action@v4
        with:
          version: v2.13.1
          config: cliff.toml
          args: --config cliff.toml --output CHANGELOG.md
        env:
          OUTPUT: CHANGELOG.md
          GITHUB_REPO: ${{ github.repository }}

      - name: Commit CHANGELOG.md
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add CHANGELOG.md
          git diff --cached --quiet || git commit -m "chore(changelog): update CHANGELOG.md for ${{ github.ref_name }}"
          git push origin HEAD:main

      - name: Generate release notes
        id: release-notes
        uses: orhun/git-cliff-action@v4
        with:
          version: v2.13.1
          config: cliff.toml
          args: --config cliff.toml --latest --strip header
        env:
          OUTPUT: RELEASE_NOTES.md
          GITHUB_REPO: ${{ github.repository }}

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v3
        with:
          body: ${{ steps.release-notes.outputs.content }}
```

- [ ] **Step 4: Verify actionlint passes**

Run: `actionlint .github/workflows/release.yml`
Expected: exits 0, no output.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci(release): add tag-triggered changelog and release workflow"
```

---

### Task 4: End-to-end verification with a real tag

**Files:** none (verification only — no new files)

**Interfaces:** exercises the full pipeline built in Tasks 1–3 against a real GitHub Actions run.

This step pushes an actual tag and lets real CI run against GitHub — unlike Tasks 1–3, it's **not reversible without follow-up cleanup** (it creates a real tag, a real commit on `main`, and a real GitHub Release). Confirm with the user before running Step 2, and use an obviously-throwaway version like `v0.0.1-test` so it can't be confused with a real release. Clean up in Step 5 regardless of outcome.

- [ ] **Step 1: Push this branch and merge Tasks 1–3 to `main`**

This workflow only fires on `main` (the `Checkout`/`Commit` steps in Task 3 assume the tag was cut from `main`'s tip). Get this branch merged first, through the repo's normal PR flow.

- [ ] **Step 2: Push a throwaway test tag**

```bash
git checkout main
git pull
git tag v0.0.1-test
git push origin v0.0.1-test
```

- [ ] **Step 3: Watch the workflow run**

```bash
gh run watch --exit-status
```
Expected: the `Release` workflow run succeeds (all steps green).

- [ ] **Step 4: Verify the outputs**

```bash
gh release view v0.0.1-test
git log --oneline -1 origin/main   # expect: a "chore(changelog): update CHANGELOG.md for v0.0.1-test" commit
```
Expected: a GitHub Release exists on `v0.0.1-test` with a non-empty body, and `CHANGELOG.md` on `main` now has a `## [0.0.1-test]` section.

- [ ] **Step 5: Clean up the test tag and release**

```bash
gh release delete v0.0.1-test --yes
git push origin :refs/tags/v0.0.1-test
git tag -d v0.0.1-test
```

Leave the `chore(changelog): ...` commit it made on `main` in place — reverting it isn't necessary (it's a real, harmless, empty-ish changelog entry) and reverting risks a messier history than just cutting the real first release next).
