---
title: "Mase Fork New Repo Install Checklist"
kind: reference
status: active
audience: "agents-maintainers"
canonicality: canonical
created: 2026-05-11
updated: 2026-06-03
---

# Mase Fork New Repo Install Checklist

Use this checklist when installing Mase's forked GSD into a new local
repository. This procedure exists to keep installs fork-managed and to avoid
accidentally replacing local fork behavior with the public Open GSD package.

## Defaults

- Fork checkout: `/Users/mase/Codebase/Personal-Projects/get-shit-done`
- Required durable fork branch: `mase/local-fixes`
- Install wrapper:
  `/Users/mase/Codebase/Personal-Projects/get-shit-done/scripts/mase-install-fork.sh`
- Recommended install mode: full install unless Mase asks for the small install
- Never use `/gsd-update`, public npm update flows, or
  `npx @opengsd/gsd-core@latest` for fork-managed installs.

Phase 1 note: the install wrapper is restored in the installer/provenance phase
of the Open GSD reconciliation. Until that phase is complete, this checklist
documents the intended fork-managed install procedure but should not be executed
from the Phase 1 branch.

## Preflight

- [ ] Resolve the target repository path as an absolute path.
- [ ] Confirm the target is a git repository.

```bash
git -C "$TARGET_REPO" status --short --branch
```

- [ ] If the target has uncommitted changes, stop and ask whether to continue.
- [ ] Inspect target Codex config before installing.

```bash
if test -d "$TARGET_REPO/.codex"; then
  find "$TARGET_REPO/.codex" -maxdepth 2 -type f -print
else
  echo "no .codex directory"
fi
```

- [ ] If `.codex/config.toml` or legacy `.codex/hooks.json` exists, check for:
  - repo-local GSD `SessionStart` hooks
  - repo-local Graphify hooks
  - stale `codex_hooks` feature keys
  - legacy JSON hooks that should be preserved or migrated
- [ ] Inspect the global Codex config for an existing global GSD hook.

```bash
grep -n "gsd\\|get-shit-done\\|SessionStart\\|codex_hooks" /Users/mase/.codex/config.toml
```

- [ ] If both global and repo-local GSD startup hooks would run, stop and ask
  which layer should own GSD for this target.
- [ ] Confirm the fork checkout is on the intended branch.

```bash
git -C /Users/mase/Codebase/Personal-Projects/get-shit-done status --short --branch
git -C /Users/mase/Codebase/Personal-Projects/get-shit-done rev-parse --abbrev-ref HEAD
git -C /Users/mase/Codebase/Personal-Projects/get-shit-done rev-parse --short HEAD
```

- [ ] If the fork checkout is dirty, stop and report the dirty files.
- [ ] If the fork is behind `origin/mase/local-fixes`, fast-forward before
  installing. If it has local-only commits or has diverged, stop and report the
  branch state instead of guessing.

## Install

Use a full local Codex install unless Mase explicitly asks for the small install.

```bash
/Users/mase/Codebase/Personal-Projects/get-shit-done/scripts/mase-install-fork.sh --runtime codex --local --target "$TARGET_REPO"
```

Small install, only when requested:

```bash
/Users/mase/Codebase/Personal-Projects/get-shit-done/scripts/mase-install-fork.sh --runtime codex --local --target "$TARGET_REPO" --minimal
```

If the wrapper fails, stop and report the exact command, exit status, and
relevant output. Do not retry with npm or the upstream update command.

## Post-Install Checks

- [ ] Re-check target git status.

```bash
git -C "$TARGET_REPO" status --short --branch
```

- [ ] Confirm the fork marker exists.

```bash
test -f "$TARGET_REPO/.codex/mase-fork-install.json"
```

- [ ] Review the generated diff before staging or committing.

```bash
git -C "$TARGET_REPO" diff -- .codex AGENTS.md
```

- [ ] Report:
  - target path
  - fork branch and commit
  - install mode
  - command used
  - target git status before and after
  - hook ownership warnings, if any
  - wrapper validation result

## Graphify Example

For the local Graphify repo:

```bash
TARGET_REPO=/Users/mase/Codebase/Personal-Projects/graphify
/Users/mase/Codebase/Personal-Projects/get-shit-done/scripts/mase-install-fork.sh --runtime codex --local --target "$TARGET_REPO"
```

Before applying, verify Graphify target git state and Codex hook ownership. Do
not install into a dirty target unless Mase explicitly approves.
