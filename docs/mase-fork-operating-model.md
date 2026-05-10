---
title: "Mase GSD Fork Operating Model"
kind: reference
status: active
audience: "agents-maintainers"
canonicality: canonical
created: 2026-05-04
updated: 2026-05-05
---

# Mase GSD Fork Operating Model

This repository is Mase's personal fork of upstream GSD. Treat it as a private
maintenance fork, not an upstream contribution workspace.

## Remote Model

- `origin` is Mase's fork: `https://github.com/matzls/get-shit-done.git`
- `upstream` is the official project: `https://github.com/gsd-build/get-shit-done.git`

Upstream is one-way. Fetch and merge from upstream, but never push to upstream.
Push local work only to origin.

The local remote config should protect this mechanically:

```bash
git remote set-url --push upstream DISABLED
```

## Branch Model

Use the Graphify-style patch-stack model:

- `main`: clean mirror of `upstream/main`
- `mase/local-fixes`: durable local customization branch
- `fix/<topic>` or `mase/<topic>`: focused task branches from `mase/local-fixes`

Do not put durable local fixes directly on `main`. Keeping `main` clean makes
upstream intake simple and makes local deltas easy to review.

## Upstream Intake

Use this procedure to pull in upstream improvements while preserving local
customizations:

```bash
git fetch upstream --prune
git checkout main
git merge --ff-only upstream/main
git push origin main

git checkout mase/local-fixes
git rebase main
git push origin mase/local-fixes
```

If the rebase conflicts, resolve each overlap deliberately:

- `keep`: local behavior is still Mase-specific or intentionally stricter
- `drop`: upstream now contains the same fix and the local patch is redundant
- `adapt`: upstream fixed the general case, but Mase's Codex setup still needs
  a local overlay
- `defer`: keep the old behavior for now and record the follow-up

## Fork Install And Update

Do not use `/gsd-update` or `npx get-shit-done-cc@latest` to maintain a
fork-based install. The upstream update workflow checks npm package
`get-shit-done-cc` and reinstalls the public upstream package, so it can replace
Mase-specific fork changes.

For Mase-managed installs, update this repository first, then install from the
checked-out fork branch:

```bash
git checkout mase/local-fixes
git rebase main
scripts/mase-install-fork.sh --runtime codex --local --target /path/to/project
```

Use `--global` instead of `--local --target ...` for a global runtime install:

```bash
scripts/mase-install-fork.sh --runtime codex --global
```

The wrapper builds generated hook assets from this repository, refuses to
install from `main` by default, and runs the installer from the target project
directory for local installs. Set `GSD_ALLOW_MAIN_INSTALL=1` only when you
intentionally want the clean upstream mirror.

Fork installs write a source marker outside GSD's wiped managed tree:

```text
<runtime-config-dir>/mase-fork-install.json
```

For local Codex installs this is normally:

```text
<target-repo>/.codex/mase-fork-install.json
```

The marker records the fork path, branch, exact commit, runtime, scope, target,
install mode, and install timestamp. It is intentionally a sibling of
`get-shit-done/`, not inside it, so inventory can still detect a fork-managed
install if an upstream update accidentally overwrites the managed payload.

The fork branch also adds a small `/gsd-update` preflight in
`commands/gsd/update.md`. If the marker says `source: "mase-fork"`, the
standard npm-backed update path stops unless `GSD_ALLOW_UPSTREAM_UPDATE=1` is
set explicitly.

To audit installs:

```bash
scripts/mase-gsd-install-inventory.sh
scripts/mase-gsd-install-inventory.sh --json
```

To propagate the current fork to stale local installs, dry-run first:

```bash
scripts/mase-gsd-propagate.sh --dry-run
scripts/mase-gsd-propagate.sh --apply
```

Propagation skips global installs, dirty target repos, and unknown-source GSD
installs by default. Use explicit flags such as `--include-global` only after
reviewing the dry-run output.

## Local Patch Scope

Local fixes should stay small, reviewable, and focused on Mase's runtime needs.

Current first patch goal:

- Harden Codex SessionStart hook generation and execution so GSD update checks
  are cwd-independent and never break Codex startup.

Expected properties for hook hardening:

- Generated hook commands do not depend on the caller's current working
  directory.
- Hook scripts resolve repo/config paths from stable script or config
  locations instead of `process.cwd()`.
- Background update checks fail soft: record status if useful, then exit `0`.
- Regression checks cover running the hook from the repo root and from `/tmp`.

## Validation Expectations

Before pushing local fixes to `origin/mase/local-fixes`, run focused checks for
the touched area. For hook/config work, prefer:

```bash
GSD_HOOKS_DIR=.codex/hooks
node --check "$GSD_HOOKS_DIR"/"gsd-check-update.js"
node --check "$GSD_HOOKS_DIR"/"gsd-check-update-worker.js"
```

When tests exist for installer/config generation, add or run the targeted test
that proves generated Codex hook commands are cwd-independent.

## Reporting

Closeout for sync or local-fix work should include:

- current branch
- upstream base commit
- local commits added or replayed
- validation commands run
- whether `origin/main` and/or `origin/mase/local-fixes` were pushed
