---
title: "Mase GSD Fork State - 2026-06-02"
kind: status
status: active
audience: "agents-maintainers"
canonicality: checkpoint
created: 2026-06-02
---

# Mase GSD Fork State - 2026-06-02

## Summary

The local fork was restored to the pre-abandoned-upstream rollout tree and the
read-only `upstream` remote now points at Open GSD:

```text
origin:   https://github.com/matzls/get-shit-done.git
upstream: https://github.com/open-gsd/gsd-core.git
upstream push URL: DISABLED
```

The abandoned upstream merge from `gsd-build/get-shit-done` was reverted before
the upstream remote was changed. Do not use `gsd-build/get-shit-done` for future
intake.

## Rollback Evidence

- Rollback tag: `rollback/mase-local-fixes-pre-upstream-2026-06-02`
- Rollback commit: `ba25aa10 fix(plan-phase): fail closed on missing agents`
- Abandoned merge commit: `0154aa5b merge: reconcile mase fork with upstream main`
- Revert commit: `19cd6a47 Revert "merge: reconcile mase fork with upstream main"`

`git diff rollback/mase-local-fixes-pre-upstream-2026-06-02 HEAD` was empty
after the revert, before this documentation checkpoint. That means the tracked
working tree matched the rollout point after undoing the abandoned merge.

## Upstream State

Open GSD was verified with:

```text
git ls-remote https://github.com/open-gsd/gsd-core.git HEAD
```

The verified HEAD at that moment was:

```text
b177c1704fa75b8b90a1b771925dfcc02819ae60
```

After fetching the repointed remote, `upstream/main` resolved locally to:

```text
63a8625605e1d83d6084ecffbf1ca188c6017fef
```

No Open GSD code has been merged into `mase/local-fixes` yet.

## Remaining Risk Boundary

The active tree no longer contains the abandoned merge payload. The bad merge
commit still exists in Git history because the rollback was done with a normal
revert commit, not a destructive history rewrite. Purging that commit from
local and remote history would require an explicit rewrite and force-push plan.

## Next Session

Start reconciliation from Open GSD only:

1. Verify `origin`, `upstream`, and branch status.
2. Decide whether to create or reset the `upstream-main` mirror to
   `upstream/main`.
3. Compare local fork commits against Open GSD.
4. Reconcile deliberately, keeping Mase-specific install and Codex guardrails.
