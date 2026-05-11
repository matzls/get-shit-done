---
title: "Mase Fork New Repo Install Checklist"
kind: reference
status: active
audience: "agents-maintainers"
canonicality: canonical
created: 2026-05-11
updated: 2026-05-11
---

# Mase Fork New Repo Install Checklist

Use this checklist when installing Mase's forked GSD into a new local repository.
This procedure exists to keep installs fork-managed and to avoid accidentally
replacing local fork behavior with the public npm package.

## Defaults

- Fork checkout: `/Users/mase/Codebase/Personal-Projects/get-shit-done`
- Required fork branch: `mase/local-fixes`
- Install wrapper:
  `/Users/mase/Codebase/Personal-Projects/get-shit-done/scripts/mase-install-fork.sh`
- Recommended install mode: full install
- Never use `/gsd-update` or `npx get-shit-done-cc@latest` for fork-managed
  installs.

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

- [ ] If `.codex/config.toml` or `.codex/hooks.json` exists, check for:
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
- [ ] Confirm the fork checkout is on `mase/local-fixes`.

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

Use a full local Codex install unless Mase explicitly asks for minimal.

```bash
/Users/mase/Codebase/Personal-Projects/get-shit-done/scripts/mase-install-fork.sh --runtime codex --local --target "$TARGET_REPO"
```

Minimal install, only when requested:

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

Known preflight state on 2026-05-11:

- Graphify target path: `/Users/mase/Codebase/Personal-Projects/graphify`
- Graphify branch status: clean worktree, `mase/local-fixes` ahead of origin by
  one commit
- Graphify `.codex/`: absent, so no repo-local Codex hook duplication was
  present before install
- GSD fork branch: `mase/local-fixes`
