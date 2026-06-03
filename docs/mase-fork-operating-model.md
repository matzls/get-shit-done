---
title: "Mase GSD Fork Operating Model"
kind: reference
status: active
audience: "agents-maintainers"
canonicality: canonical
created: 2026-05-04
updated: 2026-06-03
---

# Mase GSD Fork Operating Model

This repository is Mase's personal fork of Open GSD / GSD Core. Treat it as a
private maintenance fork, not an upstream contribution workspace.

## Remote Model

- `origin` is Mase's fork: `https://github.com/matzls/get-shit-done.git`
- `upstream` is Open GSD: `https://github.com/open-gsd/gsd-core.git`

Upstream is one-way. Fetch from upstream, but never push to upstream. Push local
work only to origin.

The retired `https://github.com/gsd-build/get-shit-done.git` repository is not
a trusted intake source. It was briefly merged on 2026-06-02 and then reverted;
do not re-use it for future reconciliation.

The local remote config should protect this mechanically:

```bash
git remote set-url --push upstream DISABLED
```

## Branch Model

Use the patch-stack model:

- `upstream-main`: clean mirror of `upstream/main`
- `mase/local-fixes`: durable local customization branch
- `codex/open-gsd-mase-overlay`: current upstream-first reconciliation branch
- focused task branches: individual follow-up fixes or experiments

Do not put durable local fixes directly on `main` or `upstream-main`.
`upstream-main` is the managed mirror branch used by the OSS fork manager; keep
it aligned with `upstream/main` so local deltas stay reviewable.

## Upstream Intake

Use this procedure to pull in upstream improvements while preserving local
customizations after the `upstream-main` mirror has been established:

```bash
git fetch upstream --prune
git checkout upstream-main
git merge --ff-only upstream/main
```

For durable Mase changes, reconcile deliberately on an overlay branch, validate,
then decide how `mase/local-fixes` should adopt the result. Do not blindly merge
`upstream/main` into `mase/local-fixes`.

When upstream changes overlap local fixes, classify each local delta:

- `keep`: local behavior is still Mase-specific or intentionally stricter
- `drop`: upstream now contains the same fix and the local patch is redundant
- `adapt`: upstream fixed the general case, but Mase's setup still needs a
  local overlay
- `defer`: leave for a later explicit decision

## Fork Install And Update

Do not use `/gsd-update`, public npm update flows, or
`npx @opengsd/gsd-core@latest` to maintain a fork-based install. Those paths
follow upstream package behavior and can replace Mase-specific fork changes.

For a new target repository, use the standard preflight and install checklist in
[`docs/mase-fork-new-repo-install.md`](mase-fork-new-repo-install.md). That
checklist is the canonical operator procedure for single-repo fork installs,
including target git state, Codex hook ownership, install mode, and post-install
verification.

Phase 1 note: the fork install scripts are restored in the
installer/provenance phase of the Open GSD reconciliation. Until that phase is
complete, treat the commands below as the intended fork interface, not as
available Phase 1 commands.

For Mase-managed installs, update and validate this repository first, then
install from the checked-out fork branch:

```bash
git checkout mase/local-fixes
scripts/mase-install-fork.sh --runtime codex --local --target /path/to/project
```

Use `--global` instead of `--local --target ...` for a global runtime install:

```bash
scripts/mase-install-fork.sh --runtime codex --global
```

Fork installs write a source marker outside GSD's wiped managed tree:

```text
<runtime-config-dir>/mase-fork-install.json
```

For local Codex installs this is normally:

```text
<target-repo>/.codex/mase-fork-install.json
```

The marker records the fork path, branch, exact commit, runtime, scope, target,
install mode, package identity, and install timestamp. It is intentionally a
sibling of `get-shit-done/`, not inside it, so inventory can still detect a
fork-managed install if an upstream update accidentally overwrites the managed
payload.

The fork overlay keeps a `/gsd-update` preflight in `commands/gsd/update.md`.
If the marker says `source: "mase-fork"`, the standard npm-backed update path
must stop unless an explicit override is set.

To audit installs after the fork inventory script is restored:

```bash
scripts/mase-gsd-install-inventory.sh
scripts/mase-gsd-install-inventory.sh --json
```

To propagate the current fork to stale local installs after the propagation
script is restored, dry-run first:

```bash
scripts/mase-gsd-propagate.sh --dry-run
scripts/mase-gsd-propagate.sh --apply
```

Propagation skips global installs, dirty target repos, and unknown-source GSD
installs by default. Apply propagation only when Mase explicitly asks.

## Mase Small Install Surface

Mase's fork intentionally preserves a curated small install behavior instead of
adopting upstream `core` directly.

The desired small surface is:

- `code-review`
- `discuss-phase`
- `execute-phase`
- `fast`
- `help`
- `new-project`
- `plan-phase`
- `quick`
- `update`

The desired behavior also keeps a curated GSD agent surface. Upstream minimal
mode skips GSD agents and strips Codex `gsd-*` agent registrations, so this is a
Mase-specific overlay decision.

## Retired Local Surfaces

The standalone SDK and active `plan-brief` workflow are not part of the active
Mase overlay. `plan-brief` is retired recoverably; see
[`docs/retired-features/plan-brief.md`](retired-features/plan-brief.md).

## OSS Fork Manager

The global `my-oss-fork-manager` skill is the coordinator for fork inventory and
approval gates. This repository remains authoritative for GSD-specific install,
marker, and propagation behavior.

The repo-local marker is:

```text
.codex/oss-fork-manager.json
```

It records fork topology only. It must not duplicate global install targets.

## Validation Expectations

Before pushing local fixes to `origin/mase/local-fixes`, run focused checks for
the touched area and `git diff --check`.

Before branch adoption or install propagation, verify:

- rollback tag still exists
- `upstream-main` points to the expected Open GSD commit
- `upstream` push URL is `DISABLED`
- no unexplained validation failures remain

## Reporting

Closeout for sync or local-fix work should include:

- current branch
- upstream base commit
- local commits added or replayed
- validation commands run
- whether `origin/mase/local-fixes` was pushed
- whether installs were propagated
