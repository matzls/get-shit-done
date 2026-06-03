---
title: "Retired Feature: plan-brief"
kind: reference
status: retired
audience: "agents-maintainers"
canonicality: historical
created: 2026-06-03
---

# Retired Feature: plan-brief

Mase's fork previously carried an active `plan-brief` workflow that generated
human-readable `*-BRIEF.md` companions for executable plan files.

During the Open GSD reconciliation, Mase decided not to carry active
`plan-brief` code into the upstream-first overlay. The feature is retired
recoverably rather than deleted without a pointer.

## Last Known Local Implementation

Recover from:

- branch: `mase/local-fixes`
- commit: `8e7bac620b9d2f990b3f5a20e38313a08143980a`
- rollback tag: `rollback/mase-local-fixes-pre-upstream-2026-06-02`

Relevant historical files:

- `commands/gsd/plan-brief.md`
- `get-shit-done/workflows/plan-brief.md`
- `get-shit-done/bin/lib/plan-brief.cjs`
- `tests/plan-brief.test.cjs`
- `tests/plan-phase-brief-finalization.test.cjs`

## Reconsideration Rule

Do not restore `plan-brief` wholesale. If Mase later wants similar behavior,
first inspect current Open GSD planning artifacts and drift/quality checks, then
design the smallest replacement that is not already covered upstream.
