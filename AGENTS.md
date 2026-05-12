# Mase GSD Fork Operating Notes

This repository is Mase's personal fork of upstream GSD.

## Start Here

For the one-way upstream update procedure, read
`docs/mase-fork-operating-model.md#upstream-intake` before fetching, merging,
rebasing, or pushing. The short rule is: pull improvements from `upstream`, push
only to `origin`.

## Remotes

- `origin`: `https://github.com/matzls/get-shit-done.git`
- `upstream`: `https://github.com/gsd-build/get-shit-done.git`

`upstream` is read-only for this fork. Do not push branches, tags, or fixes to
`upstream`. Push only to `origin`.

## Branch Model

- Keep `upstream-main` as the clean upstream mirror.
- Keep durable Mase-specific customizations on `mase/local-fixes`.
- Use short task branches from `mase/local-fixes` for individual fixes.

## Sync Policy

Use one-way upstream intake:

```bash
git fetch upstream --prune
git checkout upstream-main
git merge --ff-only upstream/main
git checkout mase/local-fixes
git rebase upstream-main
git push origin mase/local-fixes
```

When upstream changes overlap local fixes, classify each local delta:

- `keep`: still Mase-specific or intentionally stricter
- `drop`: upstream now contains the same fix
- `adapt`: upstream changed nearby code and the local behavior still matters
- `defer`: leave for a later explicit decision

## Current Local Fix Goal

Harden Codex/GSD setup for Mase's local workflows while continuing to receive
upstream GSD updates. Initial focus: make Codex SessionStart hooks reliable and
cwd-independent.

See `docs/mase-fork-operating-model.md` for the detailed maintenance model.
