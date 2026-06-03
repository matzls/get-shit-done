---
name: gsd-fork-propagate
description: >
  Use when Mase asks to update, sync, propagate, inventory, find, or audit
  Get Shit Done/GSD installs from Mase's local fork. Routes agents to the
  fork-managed inventory, dry-run, and apply scripts instead of the public npm
  /gsd-update path.
---

# GSD Fork Propagation

## Purpose

Update Mase-managed GSD installs from the local fork checkout:

```text
/Users/mase/Codebase/Personal-Projects/get-shit-done
```

This skill is for fork-managed installs only. Do not use `/gsd-update`,
`npx get-shit-done-cc@latest`, or public npm update flows unless Mase
explicitly asks to replace the fork-managed install with upstream.

## Required Context

Before running update commands:

1. Read repo instructions that apply to this checkout, especially
   `AGENTS.override.md` and `AGENTS.md`.
2. Confirm the fork checkout exists and is on the intended branch:
   `mase/local-fixes`.
3. Check the fork working tree. If dirty, stop and report the dirty files unless
   Mase explicitly asks to continue.

## Inventory

For "find GSD installs", "check installs", "inventory GSD", or similar:

```bash
scripts/mase-gsd-install-inventory.sh
```

Use structured output when the result will drive follow-up automation:

```bash
scripts/mase-gsd-install-inventory.sh --json
```

Report:

- scanned roots and runtimes
- discovered installs
- status: `current`, `stale`, `unknown`, or `broken`
- runtime and scope
- target git state
- reason for the classification

## Propagation

For "update all installs", "propagate GSD", "sync installs from my fork", or
similar, always dry-run first:

```bash
scripts/mase-gsd-propagate.sh --dry-run
```

Use JSON if you need exact selected/skipped target data:

```bash
scripts/mase-gsd-propagate.sh --dry-run --json
```

Explain selected targets, skipped targets, and exact commands that would run.
Propagation skips global installs, dirty repos, and unknown-source installs by
default. Do not add `--include-global` or `--include-unknown` without calling
out the risk and getting explicit confirmation.

Only after Mase confirms the dry-run, apply:

```bash
scripts/mase-gsd-propagate.sh --apply
```

## Single Target Update

For one specific repo, use the fork installer directly:

1. Run `git status --short --branch` in the target repo.
2. If the target repo is dirty, stop and report the dirty files unless Mase
   explicitly confirms updating that target anyway.
3. Preserve the existing install mode when a marker exists.

```bash
scripts/mase-install-fork.sh --runtime codex --local --target /absolute/path/to/project
```

Use `--minimal` only if Mase asks for a minimal install or the existing install
marker says the target was minimal.

## Safety Rules

- Do not update dirty target repos unless Mase explicitly confirms.
- Do not update global installs unless Mase explicitly confirms.
- Do not update unknown-source installs unless Mase explicitly confirms.
- Do not fetch, rebase, push, or force-push the fork unless Mase explicitly asks
  to update the fork itself.
- If a command fails, report the command, exit status, and key output. Do not
  fall back to upstream npm.

## Closeout

Report:

- fork branch and commit
- inventory result
- dry-run or apply mode
- selected and skipped targets
- commands run
- target git state before/after when applying
- any blockers or next action
