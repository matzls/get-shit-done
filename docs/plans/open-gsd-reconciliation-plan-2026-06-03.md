---
title: "Open GSD Reconciliation Plan"
created: 2026-06-03
updated: 2026-06-03
status: draft
owner: mase
source_research: "docs/plans/open-gsd-reconciliation-research-2026-06-03.md"
---

# Open GSD Reconciliation Plan

## Goal

Re-found Mase's GSD fork on the current Open GSD/GSD Core upstream, then add
only the durable Mase overlay needed for fork-managed installs, propagation,
Codex guardrails, and Mase's small install surface.

The end state should read as:

```text
Open GSD upstream baseline
+ Mase fork operating guardrails
+ Mase fork install/provenance/propagation layer
+ Mase small install behavior
+ narrow Codex/fork safety patches
```

## Planning Approach

Use GSD planning discipline for this work, but do not run the full installed
`gsd-plan-phase` machinery against the fork while the fork itself is being
reconciled.

Reason:

- the installed local GSD framework is part of what is being reconciled
- `plan-brief` is being retired, so old plan/brief generation should not drive
  the new reconciliation
- the existing research document already provides the discussion, evidence, and
  peer-review context needed to plan safely

This plan is therefore the executable GSD-style plan for the reconciliation. It
uses explicit phases, validation, and approval gates.

## Non-Goals

- Do not blindly merge `upstream/main` into `mase/local-fixes`.
- Do not use the abandoned `gsd-build/get-shit-done` repository as an intake
  source.
- Do not restore the retired SDK unless a concrete downstream dependency is
  found.
- Do not carry active `plan-brief` code into the overlay.
- Do not run `/gsd-update`, public npm update flows, or install propagation
  during reconciliation unless explicitly approved.
- Do not rewrite `mase/local-fixes` history until final validation and explicit
  approval.

## Fixed Decisions

- Use Open GSD/GSD Core as the baseline.
- Keep origin as Mase's fork and upstream as read-only Open GSD.
- Keep upstream push URL disabled.
- Keep fork source guardrails.
- Keep the Mase fork install wrapper.
- Keep `mase-fork-install.json` provenance.
- Keep inventory and propagation scripts as repo-local authoritative logic.
- Let the global `my-oss-fork-manager` orchestrate rather than own GSD-specific
  install details.
- Keep `/gsd-update` fork preflight protection.
- Adopt Open GSD package identity: `@opengsd/gsd-core` and `gsd-core`.
- Drop SDK.
- Retire `plan-brief` recoverably.
- Suppress upstream startup update-check hooks for fork-managed Codex installs.
- Preserve Mase small install intent rather than adopting upstream `core`
  directly.
- Compare repo-local agent guardrails against upstream before porting old
  behavior.
- Propagate reconciled fork installs only when Mase explicitly asks.
- Decide branch rewrite/reset only after final validation.

## Known Current Anchors

- Durable fork branch: `mase/local-fixes`
- Current safe fork commit: `8e7bac620b9d2f990b3f5a20e38313a08143980a`
- Open GSD mirror branch: `upstream-main`
- Open GSD commit: `63a8625605e1d83d6084ecffbf1ca188c6017fef`
- Rollback tag: `rollback/mase-local-fixes-pre-upstream-2026-06-02` at
  `ba25aa10`
- Peer-reviewed research:
  `docs/plans/open-gsd-reconciliation-research-2026-06-03.md`
- Peer-reviewed plan gate:
  `docs/plans/_peer-reviews/open-gsd-reconciliation-plan-2026-06-03-peer-review.json`

## Phase 1: Upstream-First Guardrail Branch

### Objective

Create a clean upstream-first branch and re-add only the documentation,
operator guardrails, and fork-manager marker needed before installer work.

### Branch

Create the implementation branch from `upstream-main`:

```bash
git checkout upstream-main
git checkout -b codex/open-gsd-mase-overlay
```

### Scope

Add or adapt only:

- root `AGENTS.md` fork override, composed with upstream's current `AGENTS.md`
- Mase fork operating docs
- `docs/mase-fork-new-repo-install.md`, updated for Open GSD package/bin names
- Mase fork state/reconciliation docs
- `.codex/oss-fork-manager.json` as schema version 1
- documentation pointer to global `my-oss-fork-manager`
- recovery note for retired `plan-brief`

### Validation

Run:

```bash
git diff --check
git remote -v
git tag -l 'rollback/*'
git rev-parse upstream-main
node -e 'const m=require("./.codex/oss-fork-manager.json"); if (m.schema_version !== 1 || m.install_targets) process.exit(1)'
```

Manual checks:

- `upstream-main` still points at the expected Open GSD SHA before branching
- upstream `AGENTS.md` and Mase fork override are coherent together
- docs reference paths that exist on the upstream-first branch
- upstream push URL remains `DISABLED`
- `.codex/oss-fork-manager.json` is schema version 1 and does not duplicate
  install targets
- no installer, workflow, SDK, hook, propagation, or package identity code was
  changed in this phase

### Approval Gate

Stop after Phase 1 and review the branch. Do not proceed to installer work
until Mase approves Phase 2.

## Phase 2: Fork Install Provenance And Migration

### Objective

Reintroduce Mase's fork install/provenance layer on top of Open GSD's package
identity and runtime layout.

### Scope

Adapt:

- `scripts/mase-install-fork.sh`
- `scripts/mase-gsd-install-inventory.sh`
- `scripts/mase-gsd-propagate.sh`
- `scripts/mase-gsd-agents-routing.cjs`, if still useful
- focused tests for fork wrapper, marker, inventory, propagation dry-run, and
  update preflight
- `/gsd-update` fork preflight text/behavior

Use upstream package identity:

- package: `@opengsd/gsd-core`
- binary: `gsd-core`

Migration behavior:

- inventory must dual-read old and new marker shapes
- old `get-shit-done-cc` identity markers are recognized as Mase fork installs
- marker rewrite happens only during explicit propagation/apply
- dirty repo-local installs remain skipped by default
- global installs require explicit apply
- no propagation runs automatically during reconciliation

### Validation

Run targeted tests:

```bash
node --test tests/mase-gsd-fork-scripts.test.cjs
node --test tests/install.test.cjs
git diff --check
```

If any referenced test file does not exist on the implementation branch, create
or adapt the equivalent focused test as part of this phase before claiming the
phase validated.

Manual checks:

- `scripts/mase-gsd-install-inventory.sh --json` detects the known stale global
  and repo-local installs
- dry-run reports intended actions without writes
- dirty repo-local target remains blocked
- marker content records source, branch, commit, runtime, scope, target, mode,
  and package identity

### Approval Gate

Stop after dry-run validation. Do not apply propagation to real installs until
Mase explicitly asks.

## Phase 3: Mase Small Install Surface

### Objective

Preserve Mase's curated small install behavior without restoring old installer
code wholesale.

### Desired Surface

Skills:

- `code-review`
- `discuss-phase`
- `execute-phase`
- `fast`
- `help`
- `new-project`
- `plan-phase`
- `quick`
- `update`

Agents:

- preserve the curated Mase agent allowlist unless upstream behavior proves a
  better smaller equivalent

### Constraints

- upstream `--minimal` / `core` installs only the direct upstream core skill
  allowlist
- upstream minimal mode skips GSD agents and strips old Codex agent
  registrations
- Mase small install should keep the useful small command surface and curated
  agents
- implementation must fit upstream's current `install-profiles.cjs` and Codex
  config model

### Validation

Run:

```bash
node --test tests/install-minimal-hooks.test.cjs
node --test tests/agent-install-validation.test.cjs
git diff --check
```

If either test file does not exist on the implementation branch, create or adapt
the equivalent focused test before claiming the phase validated.

Add or adapt tests proving:

- Mase small install includes the intended skill set
- Mase small install keeps intended agents
- upstream `core` behavior remains available where expected
- full installs are not shrunk accidentally

### Approval Gate

Stop after validation and review the Mase small install behavior before
proceeding to Codex hook work.

## Phase 4: Codex Guardrails And Hooks

### Objective

Carry only current, necessary Codex fork protections.

### Scope

- follow upstream `config.toml` hook representation
- keep legacy cleanup/migration only where it protects existing installs
- suppress startup update-check hook for fork-managed installs
- compare upstream repo-local agent behavior before porting local fail-closed
  guardrails
- prefer upstream Graphify hook implementation; keep only Mase source-checkout
  and install-inventory protections

### Validation

Run:

```bash
node --test tests/codex-config.test.cjs
node --test tests/bug-3357-codex-legacy-hooks-json-migration.test.cjs
node --test tests/graphify-auto-update.test.cjs
git diff --check
```

If any referenced test file does not exist on the implementation branch, create
or adapt the equivalent focused test before claiming the phase validated.

Manual checks:

- no duplicate SessionStart update hooks
- fork-managed installs do not register upstream update-check hooks by default
- user Codex hooks/config are preserved
- repo-local agent behavior fails closed only if upstream does not already cover
  the case

### Approval Gate

Stop after validation and review the Codex hook/guardrail behavior before
proceeding to retirement cleanup.

## Phase 5: Retire Superseded Local Surfaces

### Objective

Remove or avoid carrying local surfaces that Open GSD superseded or Mase no
longer wants active.

### Scope

- do not port `sdk/`, `bin/gsd-sdk.js`, or SDK release workflows
- do not port active `plan-brief` command/workflow/library files
- add `docs/retired-features/plan-brief.md` with recovery pointers
- remove old tests whose only purpose was SDK parity or active plan-brief
  enforcement
- keep historical rollback docs, but do not use abandoned merge commit
  `0154aa5b` as source evidence

### Validation

Run:

```bash
rg -n "gsd-sdk|plan-brief|BRIEF" bin commands get-shit-done tests docs .github
git diff --check
```

Expected:

- no active SDK entrypoint or release workflow
- no active `plan-brief` command/workflow/library
- only recovery/history docs mention `plan-brief`

### Approval Gate

Stop after validation and review the retired-surface diff before broad
validation.

## Phase 6: Full Validation

### Objective

Validate that the upstream-first overlay works as a forkable GSD distribution.

### Validation

Run:

```bash
npm run build
npm test
git diff --check
```

If targeted failures appear, classify them as:

- upstream baseline failure
- Mase overlay regression
- obsolete local test
- environment/dependency issue

Do not proceed to branch adoption with unexplained failures.

### Approval Gate

Stop after full validation and review all validation evidence before any branch
adoption work.

## Phase 7: Branch Adoption

### Objective

Move the durable fork branch to the validated upstream-first overlay.

### Options

Preferred technical end state:

```text
clean reset/rewrite of mase/local-fixes to validated overlay branch
```

Fallback:

```text
non-destructive merge into mase/local-fixes
```

### Required Gate

Before any branch rewrite or force-push:

- verify rollback tag still exists
- verify `origin/mase/local-fixes` current SHA
- verify current overlay branch SHA
- confirm no uncommitted work
- receive explicit Mase approval for branch rewrite and push

No branch rewrite happens as part of planning.

## Phase 8: Install Propagation

### Objective

Update real fork-managed installs only after the reconciled fork is validated
and adopted.

### Scope

- run inventory
- dry-run propagation
- review stale/global/dirty targets
- apply only with explicit Mase approval

Known current targets:

- `/Users/mase/.codex`: stale global Codex minimal install
- `/Users/mase/Codebase/Personal-Projects/my-second-brain-build`: stale local
  Codex full install, dirty target

### Validation

Run:

```bash
scripts/mase-gsd-install-inventory.sh --json
scripts/mase-gsd-propagate.sh --dry-run
```

Apply only after approval.

## Execution Rules

- Work in small commits by phase.
- Prefer upstream code and tests wherever behavior is equivalent.
- Add Mase overlay code only where the research document justifies it.
- Keep abandoned `gsd-build` history out of implementation decisions.
- Do not push, force-push, or propagate installs without explicit approval.
- Stop at each approval gate and report evidence.

## Ready To Start Criteria

Phase 1 is ready to start when Mase approves:

```text
Create codex/open-gsd-mase-overlay from upstream-main and implement Phase 1 only.
```

Everything after Phase 1 requires separate approval after reviewing the Phase 1
branch.
