---
title: "GSD Graphify Adapter Checker Plan"
created: 2026-05-05
updated: 2026-05-05
status: draft
owner: mase
---

# GSD Graphify Adapter Checker Plan

## Goal

Make GSD graph-aware without making Graphify mandatory, without duplicating
Graphify internals, and without changing existing `.planning/graphs/` query and
diff behavior in the first slice.

Graphify should produce and maintain graph artifacts. GSD should consume those
artifacts as advisory workflow context during planning, research, mapping,
documentation, review, and forensics.

## Framing

Current split:

```text
Mase's Graphify skill/fork = graph producer and safety policy
GSD Graphify wrapper       = project-management adapter and workflow consumer
```

GSD should not reimplement scanning, extraction, clustering, report generation,
HTML export, ignore handling, media/document extraction, or Graphify update
logic. It should detect graph availability, summarize graph freshness, and
provide graph context to GSD agents when useful.

The first implementation slice should be a read-only checker and soft
recommendation layer. It should not migrate artifact roots or change graph
query/diff semantics yet.

## Non-Goals

- Do not auto-run Graphify from normal GSD workflows.
- Do not make Graphify a required gate for small fixes or ordinary GSD usage.
- Do not ingest Graphify output into Second Brain memory or any personal memory
  system.
- Do not scan broad workspace roots such as `/Users/mase/Codebase`.
- Do not replace upstream GSD's Graphify implementation wholesale with the
  Graphify skill text.
- Do not build a fleet-wide Graphify sync/update system in this slice.
- Do not change `graphifyQuery()` or `graphifyDiff()` to prefer
  `graphify-out/` in the first implementation slice.

## Current State

Upstream GSD already has a Graphify integration:

- `get-shit-done/bin/lib/graphify.cjs`
- `commands/gsd/graphify.md`
- `tests/graphify.test.cjs`
- graph-context loading in `agents/gsd-planner.md`
- graph-context loading in the phase researcher agent file

The upstream integration stores consumed artifacts under `.planning/graphs/`.
Standalone Graphify writes its normal output under `graphify-out/`.

The existing `graphifyBuild()` function is already a build preflight for
`/gsd-graphify build`: it is config-gated, checks the CLI, checks version, and
returns `action: "spawn_agent"` plus build metadata.

The new work should not duplicate or replace `graphifyBuild()` in the first
slice. Instead, it should add a separate read-only context checker for advisory
decisions before planning and mapping work.

## Proposed Behavior

Add a soft Graphify context checker to GSD.

Possible states:

- `available`: GSD-consumable graph artifacts exist under `.planning/graphs/`.
- `available_standard_only`: standard Graphify artifacts exist under
  `graphify-out/`, but no GSD mirror exists under `.planning/graphs/`.
- `stale`: graph exists but is old or marked for refresh.
- `recommended`: no graph exists, but repo size or task type suggests graph
  context would likely help.
- `not_needed`: no graph exists and the current repo/task is small or focused.
- `unavailable`: Graphify CLI is missing or unusable.
- `unsafe_missing_ignore`: a broad graph run would be risky because
  `.graphifyignore` is missing.

Expected behavior:

```text
No graph -> continue normally.
No graph + medium/large repo -> suggest $graphify . after reviewing .graphifyignore.
Standard graph exists but no .planning mirror -> suggest /gsd-graphify build or a future sync command.
Graph stale -> warn and treat graph relationships as approximate.
GSD mirror available -> use existing graphify query/status/diff behavior.
Missing .graphifyignore -> warn before suggesting a broad run.
```

Graphify suggestions should be advisory. A user must explicitly request or
approve a Graphify run because scan scope and privacy matter.

## Implementation Plan

### Phase 1: Add Read-Only Context Checker

Add a helper in `get-shit-done/bin/lib/graphify.cjs`:

```text
graphifyContextStatus(cwd, options) -> structured status object
```

This is not a build preflight. Build preflight remains owned by
`graphifyBuild()`.

Checks:

- Is `graphify` available on `PATH`?
- Does `.graphifyignore` exist?
- Does `graphify-out/GRAPH_REPORT.md` exist?
- Does `graphify-out/graph.json` exist?
- Does `graphify-out/graph.html` exist?
- Does `graphify-out/needs_update` exist?
- Does `.planning/graphs/GRAPH_REPORT.md` exist?
- Does `.planning/graphs/graph.json` exist?
- Does `.planning/graphs/graph.html` exist?
- Does `.planning/graphs/.last-build-snapshot.json` exist?
- Are graph artifacts stale by age threshold?
- Is the repo large enough to suggest Graphify? Use a conservative heuristic
  such as tracked file count or relevant docs/code count.
- Optional source verification only when explicitly configured. Use an
  environment variable such as `GSD_GRAPHIFY_REQUIRE_SOURCE` rather than
  hardcoding a Mase-local path into upstream behavior.

The helper should return structured JSON only. It should not print free-form
warnings directly and should not run Graphify builds.

Config gate:

`graphifyContextStatus()` should be ungated so GSD can decide whether to
suggest Graphify before `graphify.enabled` is set. The response should include:

```text
enabled: true|false
config_gate_required_for_build_query_diff: true
```

Existing build/query/status/diff functions stay config-gated.

Artifact-root contract for Phase 1:

- `.planning/graphs/` remains the authoritative root for existing GSD
  `query`, `status`, `diff`, and snapshot behavior.
- `graphify-out/` is inspected as the standard Graphify producer output.
- If only `graphify-out/` exists, the checker reports
  `available_standard_only`; it does not make `graphifyQuery()` or
  `graphifyDiff()` read that root yet.
- Snapshot ownership stays in `.planning/graphs/.last-build-snapshot.json`.
- A later phase may add an explicit sync/mirror command or direct
  `graphify-out/` consumption, but that is not part of the first slice.

### Phase 2: Expose Checker In CLI And Command Docs

Add a CLI route:

```text
node gsd-tools.cjs graphify context-status
```

This route was the sole ungated first-slice user/developer surface for the
checker. The follow-up status bypass keeps that same read-only behavior but
also lets `/gsd-graphify status` and `node gsd-tools.cjs graphify status`
return advisory context when `graphify.enabled` is false. Build, query, and
diff remain config-gated.

### Phase 3: Add Soft Suggestions To Workflows

Integrate preflight read-only checks into:

- `plan-phase`: use graph context if available; continue if absent.
- `phase-researcher`: suggest Graphify only for multi-subsystem phases.
- `map-codebase`: suggest Graphify for medium/large repos before deep mapping.
- `docs-update` and `ingest-docs`: suggest Graphify when many docs exist or
  cross-doc relationships matter.
- `review` and `forensics`: suggest Graphify when the user asks relational
  questions such as how two modules, docs, or subsystems connect.

First implementation slice boundary:

- Add the helper.
- Add tests.
- Expose it through one ungated CLI subcommand: `graphify context-status`.

Do not edit planner, phase-researcher, map-codebase, docs-update, ingest-docs,
review, or forensics until the helper contract is proven.

### Phase 4: Tests And Documentation

Add tests in `tests/graphify.test.cjs` for:

- CLI missing.
- CLI present but no graph.
- graph exists in standard `graphify-out/`.
- graph exists only in legacy `.planning/graphs/`.
- both roots exist and `.planning/graphs/` remains the GSD query/diff root in
  Phase 1.
- `graph.json` uses NetworkX `links` shape.
- `GRAPH_REPORT.md` exists and is surfaced in status/preflight.
- `graphify-out/needs_update` marks the graph stale.
- missing `.graphifyignore` returns a warning state for suggested broad runs.
- optional source check succeeds/fails when `GSD_GRAPHIFY_REQUIRE_SOURCE` is
  set.

Update docs:

- `commands/gsd/graphify.md`
- `docs/COMMANDS.md`
- `docs/CONFIGURATION.md`
- `docs/CLI-TOOLS.md`, if the new `context-status` route is documented there.

Defer updates to planner, phase-researcher, and other agent guidance until the
later workflow-integration phase.

## Risk Controls

- Keep Graphify optional and non-blocking by default.
- Treat graph output as derived evidence, not authority.
- Verify load-bearing claims against source files, tests, plans, and docs.
- Do not recommend broad scans without `.graphifyignore`.
- Preserve upstream compatibility by continuing to read `.planning/graphs/`.
- Keep Mase-specific fork verification optional/configured so upstream GSD does
  not depend on a local path.
- Keep `graphifyBuild()` as the build preflight and avoid a parallel build
  preflight path.
- Keep snapshot and diff ownership in `.planning/graphs/` until a later root
  migration plan explicitly changes it.

## Success Criteria

- GSD can report whether Graphify context is unavailable, available only in
  standard Graphify output, mirrored into GSD, stale, or recommended.
- Existing `.planning/graphs/` query, status, diff, and snapshot behavior
  remains compatible.
- Standard `graphify-out/` artifacts are detected without manual copying.
- Tests cover both standard Graphify and legacy GSD graph artifact shapes
  without changing the first-slice root authority.
- No normal GSD workflow auto-runs Graphify without explicit user approval.

## Open Questions

- Is `GSD_GRAPHIFY_REQUIRE_SOURCE` the right source-verification control, or
  should GSD eventually support a config key such as
  `graphify.required_source`?
- Should GSD status expose both artifact roots when both exist, and explicitly
  state which root won?
- Should `GRAPH_REPORT.md` be included in planner context directly, or should
  planners only receive selected excerpts plus targeted graph queries?
- Should a later phase add `graphify sync` to mirror `graphify-out/` into
  `.planning/graphs/` without rebuilding?

## External Graphify Facts Verified For This Revision

- `graphify doctor --require-source <path>` is present in the active local
  Graphify CLI.
- `graphify-out/needs_update` is present in Graphify source/tests and is a real
  watcher/update signal.

## GSD Facts Verified For This Revision

- Existing GSD `graphifyBuild()` is already a build preflight and should not be
  duplicated by the new read-only context checker.
- Existing GSD diff snapshots live under
  `.planning/graphs/.last-build-snapshot.json`.
