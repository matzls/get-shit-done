---
title: "Open GSD Reconciliation Research"
kind: research
status: draft
audience: "mase-maintainers"
canonicality: planning
created: 2026-06-03
updated: 2026-06-03
---

# Open GSD Reconciliation Research

## Purpose

Reconcile Mase's GSD fork with Open GSD deliberately, using Open GSD as the
preferred baseline and replaying only the Mase-specific behavior that still
matters.

This is a research-only artifact. It does not approve a merge, rebase, branch
reset, force-push, install propagation, or source-code reconciliation.

## Verified State

| Item | Value |
| --- | --- |
| Current task branch | `codex/reconcile-open-gsd` |
| Durable fork branch | `mase/local-fixes` |
| Local fork commit | `8e7bac620b9d2f990b3f5a20e38313a08143980a` |
| Origin fork commit | `8e7bac620b9d2f990b3f5a20e38313a08143980a` |
| Upstream mirror branch | `upstream-main` |
| Open GSD commit | `63a8625605e1d83d6084ecffbf1ca188c6017fef` |
| Shared base | `b533f71857ab96d1ccec3286294d669c60b0d0fc` |
| Divergence | local `61` ahead, upstream `282` ahead |
| Upstream remote | `https://github.com/open-gsd/gsd-core.git` |
| Upstream push URL | `DISABLED` |
| Rollback tag | `rollback/mase-local-fixes-pre-upstream-2026-06-02` exists at `ba25aa10` |

Current worktree note: `.codex/skills/handover-prompt/` is untracked and was
left untouched.

## High-Level Finding

This is not a normal conflict-resolution update. Open GSD has re-founded major
parts of the product:

- package identity moved to `@opengsd/gsd-core`
- install binary moved to `gsd-core`
- `gsd-tools` is now the runtime tooling path
- the standalone SDK package and SDK release pipeline were retired
- shared manifests moved from `sdk/shared/` to `get-shit-done/bin/shared/`
- install profiles, runtime artifact layout, CI, tests, docs, and workflow
  command routing changed substantially

The safest direction is to create a new reconciliation branch from
`upstream-main`, then reimplement a small Mase overlay on top. That avoids
letting old local history, especially abandoned-repo history, dominate the new
baseline.

This does **not** mean rebuilding Mase's GSD setup from scratch. The command,
workflow, and agent surface is still broadly continuous. The intended approach
is to keep Open GSD as the main engine and only reapply Mase's local management
layer where it is still needed.

## Workflow Continuity Assessment

The core GSD user workflows are still present in Open GSD:

- project setup and planning: `new-project`, `new-milestone`,
  `discuss-phase`, `plan-phase`
- execution: `execute-phase`, `quick`, `fast`
- review and validation: `code-review`, `review`, `validate-phase`,
  `verify-work`
- operations: `health`, `progress`, `update`, `settings`, `surface`
- specialized flows: `ui-phase`, `secure-phase`, `graphify`, `workstreams`,
  `ship`

The agent roster is also broadly continuous. Most differences are internal
implementation changes, routing changes, package identity changes, SDK removal,
test/CI changes, and updated workflow text.

Practical conclusion:

- Do not copy old Mase workflow files over wholesale.
- Do not rebuild the workflow system from scratch.
- Start from Open GSD's current workflows.
- Patch only the small Mase overlay that protects local fork operation.

The main local user-facing workflow feature missing from Open GSD is
`plan-brief`. Mase's current direction is to retire it recoverably instead of
carrying it into the active overlay.

## Recommended Strategy

Use an upstream-first overlay strategy:

1. Start an implementation branch from `upstream-main`, not from the old local
   tree.
2. Reapply only Mase-specific overlays in small commits.
3. Prefer Open GSD behavior when it already solves the same problem.
4. Keep Mase behavior only where it protects local fork management, local
   installs, Codex guardrails, or Mase's desired install surface.
5. After validation, decide explicitly how to update `mase/local-fixes`:
   clean rewrite/reset to the new overlay branch, or non-destructive merge.

The clean rewrite/reset option will likely produce a much clearer fork, but it
requires explicit approval because it changes published branch history.

## Decision Context

These are the decisions that matter before implementation. The default bias is
to adopt upstream unless the Mase-specific behavior protects an active local
workflow.

## Review Notes From Mase

Mase reviewed the first decision context and gave these provisional directions:

| Area | Current direction |
| --- | --- |
| Fork source guardrails | Keep. This matches the broader local-fork operating model Mase now uses. |
| Fork install wrapper | Keep. Fork installs should remain explicit and wrapper-driven. |
| Fork install marker/provenance | Keep. Installed state should remain identifiable as Mase-fork-managed. |
| Install inventory and propagation | Keep. Propagation remains useful, with dry-run/apply separation. |
| SDK | Drop. Do not rebuild the retired SDK unless a concrete downstream dependency appears. |
| Minimal profile | Needs detailed comparison before deciding; Mase previously had a separate minimal profile because it fit better. |
| Codex startup update hook | Needs detailed context; if it only checks for new upstream versions, likely keep suppression for fork-managed installs. |
| Codex managed hook location | Move to upstream's current mechanism and drop old behavior unless a current local failure proves otherwise. |
| Repo-local Codex agents | Compare upstream behavior before deciding whether Mase's local guardrails are still needed. |
| `plan-brief` | Drop from active workflow and retire cleanly outside the active archive path, with recovery links to the older implementation. |
| Graphify cleanup interaction | Confirm whether GSD Core already has Graphify hook behavior before carrying local cleanup patches. |
| Fork install logic vs OSS fork manager | Not urgent; preferred architecture likely keeps repo-local scripts authoritative and uses the global manager as coordinator. |
| Branch adoption | Prefer the clean reset/rewrite end state after the overlay is validated, with explicit approval before any history rewrite. |

Status of these notes: the keep/drop items above are treated as directional
decisions for planning. Items still marked as needing detail are not yet
implementation approvals: minimal profile shape, Codex update-hook suppression,
repo-local agent guardrails, and exact branch adoption mechanics.

Follow-up decisions from Mase review:

| Area | Direction |
| --- | --- |
| Minimal profile | Mase is biased toward preserving the current Mase small install, pending exact comparison. |
| Codex startup update hook | Suppress for fork-managed installs. The fork is authoritative and should be propagated through Mase's wrapper path, not mixed with upstream update notices/flows. |
| Existing install migration | After reconciliation, propagation should update all fork-managed installs only when Mase explicitly asks for propagation. |
| Repo-local agent guardrails | Follow the recommendation: compare upstream behavior first; do not blindly port old guardrails. |
| Branch adoption | Decide only after validation, with clean rewrite still the likely preferred end state. |

## Peer Review Checkpoint

Advisory peer reviews were run on this research document on 2026-06-03.

Latest result after follow-up edits:

- stance: supportive
- issues: 3
- sidecar: `docs/plans/_advisory-reviews/open-gsd-reconciliation-research-2026-06-03-peer-review.json`

The reviewer agreed with the main strategy: treat this as an upstream-first
re-foundation and build a small Mase overlay instead of resolving the old fork
as a normal merge. The latest review said Phase 1 is ready to proceed because it
is narrow, doc-only, reversible, and no longer depends on the deferred installer
or identity decisions.

Follow-up verification:

| Review concern | Follow-up evidence | Status |
| --- | --- | --- |
| Rollback tag unverified | `rollback/mase-local-fixes-pre-upstream-2026-06-02` exists and points to `ba25aa10` | Resolved |
| Named refs unverified | `mase/local-fixes`, `origin/mase/local-fixes`, and `upstream-main` exist locally | Resolved |
| Upstream profile composition unverified | Upstream installer documents `--profile=<n1>,<n2>` composition; `install-profiles.cjs` resolves comma-separated profile modes as a union | Resolved |
| Upstream `AGENTS.md` composition unknown | Upstream `AGENTS.md` exists and still describes SDK-era structure in places, so fork overlay must compose carefully and may need upstream-doc drift noted | Open validation item |
| OSS fork marker schema unknown | Current global `my-oss-fork-manager` marker code and references still require `schema_version: 1`; local marker is schema v1 and omits install targets | Resolved |
| Existing fork-managed installs unknown | Inventory found stale fork-managed installs in `/Users/mase/.codex` and `/Users/mase/Codebase/Personal-Projects/my-second-brain-build` | Open migration item |

Implementation implication: Phase 1 can proceed after the validation checklist
below is strengthened. Phase 2 must explicitly handle marker/identity migration
for existing installs; there is not a clean-slate assumption.

## Exact Mase Custom Functionality Delta

This section names the custom behavior in Mase's fork and compares it to the
standard Open GSD baseline. Use it as the working decision checklist.

| Custom functionality | Mase fork behavior | Standard Open GSD behavior | Current files | Recommendation | Validation if kept |
| --- | --- | --- | --- | --- | --- |
| Fork source guardrails | The repo declares `origin` as Mase's fork, `upstream` as read-only Open GSD, and forbids the abandoned `gsd-build` repo as an intake source. | Open GSD has normal upstream project instructions and does not know about Mase's fork topology. | `AGENTS.md`, `docs/mase-fork-operating-model.md`, `docs/mase-fork-state-2026-06-02.md`, `.codex/oss-fork-manager.json` | **Keep/adapt.** This is repo-specific safety, not upstream product behavior. | `git remote -v`; verify upstream push URL is `DISABLED`; docs review. |
| Fork install wrapper | Installs from the local checkout and refuses protected mirror branches unless explicitly overridden. Runs installer from target cwd for local installs. | Installs are driven by normal package usage and upstream npm identity. | `scripts/mase-install-fork.sh` | **Keep/adapt.** This is the core mechanism that keeps Mase installs fork-managed. Update wording/package references for `@opengsd/gsd-core`. | Wrapper unit tests; a dry-run or temp-target install; target marker check. |
| Fork install marker | Writes `mase-fork-install.json` outside the managed wiped tree so provenance survives reinstall/update. | Standard Open GSD does not write Mase fork provenance markers. | `scripts/mase-install-fork.sh`, inventory scripts, docs | **Keep/adapt.** Needed to distinguish fork-managed installs from upstream installs. | Assert marker contains `source: "mase-fork"`, branch, commit, runtime, scope, target, mode. |
| Install inventory | Scans local/global runtime dirs and classifies installs as `current`, `stale`, `unknown`, or `broken`; skips source checkouts. | Open GSD has standard installed payload/update behavior but no Mase fork inventory. | `scripts/mase-gsd-install-inventory.sh` | **Keep/adapt.** Needed before propagation and machine sync decisions. | `scripts/mase-gsd-install-inventory.sh --json` against temp fixtures. |
| Propagation dry-run/apply | Selects stale Mase-managed installs, skips dirty targets/global/unknown by default, and reports exact commands before apply. | Open GSD does not propagate Mase fork installs across local repos. | `scripts/mase-gsd-propagate.sh` | **Keep/adapt.** Keep repo-local implementation; let global OSS fork manager orchestrate. | Dry-run fixture test; no writes in dry-run; dirty target skipped. |
| Target repo AGENTS routing | Adds a managed `GSD Routing` block to target repo `AGENTS.md` so Codex routes project workflow tasks to installed local GSD skills and framework-update tasks to fork propagation. | Open GSD installs product files but does not inject Mase-specific routing policy. | `scripts/mase-gsd-agents-routing.cjs`, `scripts/mase-gsd-install-inventory.sh`, docs | **Keep/adapt if still useful.** This is local operator guidance, not upstream behavior. | Routing helper status/apply tests; preserves existing AGENTS content. |
| `/gsd-update` fork preflight | Before npm-backed update, checks for `mase-fork-install.json`; exits unless `GSD_ALLOW_UPSTREAM_UPDATE=1`. | Open GSD `/gsd-update` executes the normal upstream update workflow. | `commands/gsd/update.md` | **Strong keep/adapt.** Prevents accidentally replacing fork-managed installs with public upstream. | Test command text contains marker check and override; manual workflow review. |
| Package identity policy | Mase fork historically used `get-shit-done-cc` while adding local wrapper docs. | Open GSD now uses package `@opengsd/gsd-core`, bin `gsd-core`, and generated `package-identity.cjs`. | `package.json`, `get-shit-done/bin/lib/package-identity.cjs`, `scripts/generate-package-identity.cjs` | **Adopt upstream.** Do not preserve old package identity; keep fork behavior in wrapper/provenance only. | `npm run generate:identity`; identity drift tests. |
| SDK/package boundary | Local branch still contains `sdk/`, `bin/gsd-sdk.js`, SDK tests/build scripts. | Open GSD retired SDK package/shim/release pipeline and routes through `gsd-tools`. | `sdk/**`, `bin/gsd-sdk.js`, `.github/workflows/release-sdk.yml`, workflow refs | **Drop by default.** Do not revive SDK unless a concrete Mase tool still requires it. | Grep for local `gsd-sdk` callers; run upstream `npm test` after overlay. |
| Mase minimal profile | `--minimal`/`--core-only` map to fork-owned `mase-minimal` with explicit skill and agent allowlists. | Upstream maps `--minimal`/`--core-only` to `core`; no Mase profile file. | `get-shit-done/bin/lib/mase-minimal-profile.cjs`, `get-shit-done/bin/lib/install-profiles.cjs`, `bin/install.js`, minimal tests | **Decision needed.** Keep only if Mase still relies on this curated surface. If kept, reimplement on upstream profile APIs. | Compare upstream `core` vs `mase-minimal`; install minimal tests; agent install validation. |
| Codex update-check hook suppression | Mase wrapper defaults `GSD_SKIP_UPDATE_CHECK_HOOK=1`, and local installer can skip Codex update-check hook files/registration. | Open GSD installs its standard update-check hook behavior. | `scripts/mase-install-fork.sh`, `bin/install.js`, Codex config tests | **Decision needed.** Keep if quiet fork-managed Codex sessions matter more than automatic update notices. | Temp Codex install; assert no update-check hook is registered/copied when suppression is enabled. |
| Codex managed hook location | Mase local changes include behavior/tests around `hooks.json` managed `SessionStart` entries. | Current Open GSD appears to prefer managed hook representation in `config.toml` with legacy cleanup behavior. | `bin/install.js`, `tests/codex-config.test.cjs`, `tests/bug-3357-codex-legacy-hooks-json-migration.test.cjs` | **Prefer upstream.** Do not keep `hooks.json` behavior unless a current Mase failure proves it is needed. | Install into temp Codex home; verify one managed hook, no stale legacy entries, user hooks preserved. |
| Repo-local Codex agents | Mase added preference for repo-local Codex agents and fail-closed behavior when expected agents are missing. | Open GSD has continued to change project-local agent detection and init behavior. | `bin/install.js`, `get-shit-done/bin/lib/init.cjs`, plan-phase workflow/tests | **Compare before keeping.** Upstream may already cover much of this. | Run/port targeted agent-install and plan-phase preflight tests. |
| `plan-brief` | Generates/checks human-readable `*-BRIEF.md` companions for executable `*-PLAN.md`, and plan-phase enforces current briefs before final status. | Open GSD removed `plan-brief` and has newer plan drift/quality work instead. | `commands/gsd/plan-brief.md`, `get-shit-done/workflows/plan-brief.md`, `get-shit-done/bin/lib/plan-brief.cjs`, plan-phase workflow, tests | **Retire recoverably.** Do not port into the active overlay; document how to recover it from the old branch/tag. | Recovery note review; no active plan-brief command/workflow in overlay. |
| Graphify hook cleanup / fork interaction | Local branch has Graphify hook cleanup and install-inventory exclusions to avoid treating source checkouts as install targets. | Open GSD has broad Graphify changes and deterministic tests, but not Mase source-checkout policy. | Graphify tests/hooks, inventory script, fork docs | **Adapt narrowly.** Prefer upstream Graphify implementation; keep only Mase install/source-checkout protections. | Inventory source checkout fixture; graphify hook tests only if touched. |
| Fork operating docs | Mase docs explain fork branch model, upstream intake, install/update rules, validation expectations. | Upstream docs describe product usage and contribution model, not Mase's local fork operations. | `docs/mase-fork-operating-model.md`, `docs/mase-fork-new-repo-install.md`, `docs/mase-fork-state-2026-06-02.md` | **Keep/adapt.** Required for safe future sessions. | Docs review against actual remotes/scripts. |

The likely minimum Mase overlay is:

1. fork source guardrails
2. fork install wrapper
3. fork install marker
4. install inventory
5. propagation dry-run/apply
6. `/gsd-update` fork preflight
7. fork operating docs

Everything else should be explicitly justified before being carried forward.

### Decision 1 - Minimal Install Behavior (Leaning: Preserve Mase Small Install)

Question: should `--minimal` remain Mase's curated `mase-minimal` profile, or
should it become Open GSD's upstream `core` profile?

| Option | Meaning | Pros | Risks | Recommendation |
| --- | --- | --- | --- | --- |
| Use upstream `core` | Drop Mase minimal and let `--minimal` follow Open GSD | Less fork code; fewer conflicts; easier future upstream intake | Mase loses curated minimal agent/skill surface; may reintroduce token or routing bloat | Good if Mase no longer depends on the curated minimal profile |
| Keep `mase-minimal` | Recreate Mase minimal as a fork overlay against upstream profile APIs | Preserves known local install behavior and curated surface | More fork code; needs tests every upstream profile refactor | Keep only if Mase still uses minimal installs as a daily/default surface |

Suggested default: keep the decision open until we compare actual upstream
`core` size/behavior against Mase's current minimal needs.

Current concrete comparison:

| Profile | Skills directly named | Agent behavior |
| --- | --- | --- |
| Mase `mase-minimal` | `code-review`, `discuss-phase`, `execute-phase`, `fast`, `help`, `new-project`, `plan-phase`, `quick`, `update` | Explicit allowlist: `gsd-advisor-researcher`, `gsd-assumptions-analyzer`, `gsd-code-reviewer`, `gsd-codebase-mapper`, `gsd-executor`, `gsd-pattern-mapper`, `gsd-phase-researcher`, `gsd-plan-checker`, `gsd-planner`, `gsd-project-researcher`, `gsd-research-synthesizer`, `gsd-roadmapper`, `gsd-verifier` |
| Upstream `core` | `new-project`, `discuss-phase`, `plan-phase`, `execute-phase`, `phase`, `help`, `update`, `surface` | Derived dynamically by scanning installed skill bodies for `gsd-*` agent references after computing the skill dependency closure |
| Upstream `standard` | `new-project`, `discuss-phase`, `plan-phase`, `execute-phase`, `help`, `update`, `surface`, `phase`, `review`, `config`, `progress`, `resume-work`, `pause-work`, `workspace` | Same dynamic derivation as `core` |

Actual upstream `--minimal` / `--profile=core` install behavior is stricter
than the resolved-profile model above:

- it stages only the direct upstream `core` allowlist
- it uses no dependency closure for `core`
- it skips GSD agents in minimal mode
- for Codex, it also strips old `gsd-*` agent registrations from `config.toml`
  so a full-to-minimal reinstall really removes the agent surface

That means the practical comparison is:

| Surface | Skills installed | Codex/GSD agents |
| --- | --- | --- |
| Mase current small install | `code-review`, `discuss-phase`, `execute-phase`, `fast`, `help`, `new-project`, `plan-phase`, `quick`, `update` | Curated allowlist of 13 GSD agents |
| Upstream actual small install | `new-project`, `discuss-phase`, `plan-phase`, `execute-phase`, `phase`, `help`, `update`, `surface` | No GSD agents in minimal mode |

Net difference:

- Mase small install has `code-review`, `quick`, and `fast`.
- Upstream small install has `phase` and `surface`.
- Upstream small install removes the curated agent surface entirely.
- Upstream `standard` is much broader and includes workspace/progress/config
  support, but it still is not the same as Mase's old small install because
  `fast` remains absent.

Important differences:

- Mase minimal includes `code-review`, `quick`, and `fast`.
- Upstream `core` includes `phase` and `surface`.
- Upstream `standard` adds broader phase/workspace operations, but is larger
  than Mase's current curated minimal surface.
- Upstream no longer uses a fixed agent allowlist for profiles. It computes the
  skill dependency closure from `requires:` frontmatter, then derives agents by
  scanning referenced `gsd-*` agent names in the selected skill bodies.

Decision implication: if Mase wants the same daily command surface as the old
minimal profile, upstream `core` is not a drop-in replacement because it lacks
`quick`, `fast`, and `code-review`. A cleaner compromise may be an upstream
profile composition if supported by the installer, for example `core` plus a
small `mase` overlay profile that adds those three skills and lets upstream
derive agents dynamically.

Follow-up verification: upstream does support profile composition via
comma-separated `--profile=<n1>,<n2>` and `resolveProfile()` unions the resolved
profile closures for named non-core profile combinations. That keeps a Mase
overlay profile option viable, but the implementation must respect upstream's
special `core`/minimal path and Codex agent-stripping behavior.

Recommendation: preserve a Mase small install overlay rather than adopting
upstream `core` directly. The overlay should keep the current Mase intent:
small daily command surface plus curated agents. It should still be implemented
against upstream's profile APIs and tests, not by restoring old installer code
wholesale.

### Decision 2 - `plan-brief` (Decided: Retire Recoverably)

Question: should the derived human-readable `*-BRIEF.md` companion workflow
remain part of Mase's fork?

| Option | Meaning | Pros | Risks | Recommendation |
| --- | --- | --- | --- | --- |
| Drop it | Use upstream `plan-phase` and newer drift/quality checks only | Less local code; avoids carrying deleted workflow surface | Mase loses readable plan companions and finalization invariant | Drop if Mase does not actively read/use BRIEF files |
| Keep it | Port `plan-brief` on top of current upstream planning workflow | Preserves human-readable planning artifacts | Needs careful port because upstream planning changed | Keep if BRIEF files are part of Mase's review/approval workflow |

Suggested default: keep only if Mase can name a current use case where BRIEF
files improve planning review or handoff.

Updated direction from Mase review: drop it from active reconciliation, but
retire it in a recoverable way.

Recommended retirement approach:

- Do not port `commands/gsd/plan-brief.md`, `get-shit-done/workflows/plan-brief.md`,
  or `get-shit-done/bin/lib/plan-brief.cjs` into the new overlay.
- Add a small recovery note outside the active workflow archive path, for
  example `docs/retired-features/plan-brief.md`.
- In that note, link to the last known local implementation commit/branch:
  `mase/local-fixes` at `8e7bac620b9d2f990b3f5a20e38313a08143980a`, plus the
  rollback tag `rollback/mase-local-fixes-pre-upstream-2026-06-02`.
- After adopting upstream planning, inspect the current generated plan artifacts
  and drift/quality checks before deciding whether any smaller replacement for
  BRIEF is actually needed.

### Decision 3 - Fork Update Protection (Decided: Keep)

Question: should fork-managed installs continue to block `/gsd-update` from
using public npm update flows?

| Option | Meaning | Pros | Risks | Recommendation |
| --- | --- | --- | --- | --- |
| Keep preflight | Marker-based installs stop before upstream npm update unless explicitly overridden | Prevents accidental replacement of Mase fork installs | Small local patch to update command text | Strong keep |
| Drop preflight | Let upstream `/gsd-update` run normally | Less fork code | High risk of replacing fork-managed installs | Not recommended |

Suggested default: keep. This is a core reason the fork overlay exists.

### Decision 4 - Fork Install/Propagation Scripts (Decided: Keep Repo Scripts)

Question: should local install provenance and propagation remain repo-local, or
move entirely into the global `my-oss-fork-manager` skill?

| Option | Meaning | Pros | Risks | Recommendation |
| --- | --- | --- | --- | --- |
| Keep repo scripts | Keep wrapper, inventory, propagation, and routing helpers in the fork repo | Install behavior stays versioned with the fork payload | Some duplication with global manager | Keep, but let global manager orchestrate them |
| Move all logic global | Remove repo-local scripts and make global manager own all behavior | Smaller fork overlay | Global skill must duplicate product-specific install details | Not recommended right now |

Suggested default: keep repo-local scripts as authoritative implementation;
global OSS fork manager remains the coordinator.

Clean architecture boundary:

- The repo owns product-specific install behavior because it changes with the
  GSD payload: wrapper invocation, marker format, runtime layout, update
  preflight, and propagation mechanics.
- The global OSS fork manager should own cross-repo orchestration: finding
  managed forks, checking remotes, deciding which repo scripts to call, and
  presenting approval gates.
- Moving all install logic into the global skill would make it easier for the
  manager and the repo payload to drift apart. Keep repo scripts as the source
  of truth until there is a second fork with identical enough behavior to justify
  extracting a shared framework.

Current install inventory evidence:

- `/Users/mase/.codex`: global Codex install, `mode: minimal`, `source:
  mase-fork`, stale relative to `mase/local-fixes`.
- `/Users/mase/Codebase/Personal-Projects/my-second-brain-build`: local Codex
  install, `mode: full`, `source: mase-fork`, stale, target worktree dirty, and
  AGENTS routing needs review.
- Source checkouts for GSD and Graphify were correctly skipped as propagation
  targets.

Decision implication: Phase 2 must support existing markers from the old fork
identity and migrate or rewrite them intentionally during propagation. The new
overlay cannot assume no fork-managed installs exist.

### Decision 5 - Codex Update Hook Suppression (Decided: Suppress For Fork Installs)

Question: should fork-managed Codex installs continue to suppress the GSD
startup update-check hook?

| Option | Meaning | Pros | Risks | Recommendation |
| --- | --- | --- | --- | --- |
| Use upstream hook behavior | Do not suppress update checks | Less fork code; benefits from upstream fixes | May recreate startup noise or public-update pressure | Good if latest upstream hook is proven quiet/safe |
| Keep suppression | Wrapper installs without update-check hook | Avoids local Codex startup issues and npm update prompts | Could miss update notifications | Keep if Mase values quiet local sessions more than automatic update notices |

Decision: suppress the startup update-check hook for fork-managed installs.
Open GSD's hook is not itself mutating, but Mase's fork should remain the
authoritative update source. Updates should happen through the fork wrapper and
propagation flow, not through upstream package-update cues.

What the upstream startup update hook does:

- `hooks/gsd-check-update.js` is a `SessionStart` hook.
- It detects a runtime config directory from the current home directory and
  project directory, including Claude, Gemini, Kilo, and opencode locations.
- It uses `~/.cache/gsd/gsd-update-check.json` as a shared cache file.
- It finds project/global `get-shit-done/VERSION` files.
- It creates the cache directory if needed.
- It spawns `hooks/gsd-check-update-worker.js` as a detached background Node
  process, passing cache/version paths through environment variables.

Research interpretation: this hook is not itself applying an update. It is a
background version-check/cache writer that supports update notice/statusline
behavior. For Mase fork installs, the risk is not direct mutation from this file;
the risk is startup noise or nudging a fork-managed install toward upstream npm
update flows. Keeping suppression is reasonable if fork-managed Codex sessions
should remain quiet and wrapper-controlled.

### Decision 6 - Codex `hooks.json` Versus `config.toml` (Decided: Follow Upstream)

Question: should Mase carry old `hooks.json` managed hook behavior?

| Option | Meaning | Pros | Risks | Recommendation |
| --- | --- | --- | --- | --- |
| Follow upstream | Use upstream's current Codex hook representation | Less fork code; aligns with current Open GSD tests | Requires trusting upstream's current Codex behavior | Preferred |
| Keep local `hooks.json` behavior | Reintroduce Mase's old behavior | Preserves previous local assumption | Likely conflicts with upstream direction and Graphify cleanup goals | Avoid unless a current failure proves it is needed |

Suggested default: follow upstream and only keep cleanup/migration guards that
protect existing local installs.

Updated direction from Mase review: follow upstream's current hook location and
drop the old managed `hooks.json` behavior unless validation shows a current
local regression. Existing legacy cleanup/migration tests are still useful if
they protect already-installed local environments, but the desired end state
should be the new upstream representation.

### Decision 7 - Branch Adoption Model (Directional: Prefer Clean Rewrite)

Question: after the overlay branch is validated, how should `mase/local-fixes`
move to it?

| Option | Meaning | Pros | Risks | Recommendation |
| --- | --- | --- | --- | --- |
| Clean reset/rewrite | Make `mase/local-fixes` point to upstream-first overlay branch | Clean history; exactly matches desired patch-stack model | Requires force-push and explicit approval | Best technical end state |
| Non-destructive merge | Merge overlay into existing branch history | Avoids force-push | Keeps abandoned merge/revert history and confusing ancestry | Acceptable if history rewrite is too risky |

Suggested default: build and validate the clean overlay first, then decide
whether the operational risk of force-push is acceptable.

Updated direction from Mase review: the clean reset/rewrite path is the likely
preferred end state because it leaves the fork as "Open GSD plus Mase overlay"
instead of preserving old abandoned-merge ancestry. This still needs a final
explicit approval gate before changing `mase/local-fixes` history.

## Graphify Hook Context

Open GSD/GSD Core does now have a Graphify auto-update hook:

- `hooks/gsd-graphify-update.sh`
- helper: `hooks/lib/gsd-graphify-rebuild.sh`
- runtime support: `get-shit-done/bin/lib/graphify.cjs`
- tests include `tests/graphify-auto-update.test.cjs`,
  `tests/graphify-query.test.cjs`, `tests/graphify-visualization.test.cjs`,
  and `tests/graphify.test.cjs`

The hook is intentionally opt-in. It no-ops unless all of these are true:

- the hook payload is for a Bash tool call
- the command looks like a HEAD-advancing operation such as `git commit`,
  `git merge`, `git pull`, `git rebase --continue`, `git cherry-pick`, or
  `gsd-tools query commit`
- CI is not running
- the current directory is inside a git repo
- the current branch is the configured/default branch
- `.planning/config.json` has both `graphify.enabled: true` and
  `graphify.auto_update: true`
- `graphify` is available on `PATH`
- no graph rebuild is already in flight

When all gates pass, it writes `.planning/graphs/.last-build-status.json` and
spawns a detached rebuild helper. It returns success in all cases.

Decision implication: do not port old local Graphify implementation patches
wholesale. Prefer upstream Graphify behavior. Keep only Mase-specific protections
around fork install inventory, source-checkout exclusion, and any local cleanup
that prevents installed hooks from being mistaken for source checkouts.

## Mase Patch Classification

| Area | Local evidence | Upstream state | Recommendation |
| --- | --- | --- | --- |
| Fork remote/branch guardrails | `AGENTS.md`, `docs/mase-fork-operating-model.md`, `.codex/oss-fork-manager.json` | Open GSD has normal upstream project instructions and does not carry Mase fork metadata | **keep/adapt** as repo-local overlay |
| Fork install wrapper | `scripts/mase-install-fork.sh` writes `mase-fork-install.json`, refuses mirror branches, builds hooks, runs local install from target cwd | Open GSD has public npm install/update behavior | **keep/adapt**; update package/bin references to Open GSD identity |
| Install inventory/propagation | `scripts/mase-gsd-install-inventory.sh`, `scripts/mase-gsd-propagate.sh`, routing helper, tests | No equivalent Mase install provenance layer upstream | **keep/adapt**; preserve dry-run and dirty-target gates |
| `/gsd-update` fork preflight | `commands/gsd/update.md` blocks npm update when `mase-fork-install.json` is found unless `GSD_ALLOW_UPSTREAM_UPDATE=1` | Upstream update command runs normal npm-backed update workflow | **keep/adapt**; rewrite copy to reference `@opengsd/gsd-core` and Mase fork installs |
| Package identity | Local still carries `get-shit-done-cc` identity plus later fork docs | Upstream uses `@opengsd/gsd-core`, `gsd-core`, generated `package-identity.cjs` | **drop local identity**; adopt upstream identity, keep fork wrapper separate |
| SDK package | Local still has `sdk/`, `bin/gsd-sdk.js`, SDK tests, SDK build scripts | Upstream removed SDK package boundary and release pipeline; routes via `gsd-tools` | **drop/adapt**; do not revive SDK unless a concrete Mase workflow requires it |
| Mase minimal profile | `get-shit-done/bin/lib/mase-minimal-profile.cjs`; `--minimal` maps to `mase-minimal` with explicit skills and agents | Upstream maps `--minimal`/`--core-only` to `core`, and omits Mase profile | **decision needed**; likely keep as fork overlay, but rebase onto upstream profile APIs |
| Codex update-check hook suppression | Mase wrapper exports `GSD_SKIP_UPDATE_CHECK_HOOK=1`; local installer changes support skipping update-check hooks | Upstream retains Codex hook behavior and has new hook/runtime fixes | **keep suppression** for fork-managed installs |
| Codex hooks.json behavior | Local fork kept/reintroduced managed `hooks.json` SessionStart behavior in some tests | Upstream comments indicate managed Codex hooks now live in `config.toml` with legacy cleanup | **follow upstream**; keep only legacy cleanup/migration guards that protect existing installs |
| Target repo AGENTS routing | `scripts/mase-gsd-agents-routing.cjs` appends managed GSD routing guidance to target repos | No upstream equivalent | **keep/adapt** if Mase still wants repo-local GSD routing hints |
| Plan brief feature | `commands/gsd/plan-brief.md`, `plan-brief.cjs`, plan-phase finalization tests | Upstream removed `plan-brief` and now has broader plan drift/quality changes | **retire recoverably**; do not port into active overlay |
| Graphify hook cleanup | Several local Graphify-related hook/test changes | Upstream has broad graphify changes and deterministic tests | **compare narrowly**; likely drop superseded tests, keep only Mase-specific install protections |
| CI/test harness | Local has older SDK/root test mix | Upstream has ESLint, mutation, affected-test, identity/integrity checks | **use upstream**; add Mase tests only for fork overlay |

## Recommended Overlay Set

### Keep Or Adapt

- `AGENTS.md` fork override and Open GSD remote model.
- `docs/mase-fork-operating-model.md`.
- `docs/mase-fork-new-repo-install.md`, updated for Open GSD package/bin names.
- `.codex/oss-fork-manager.json`, if the global OSS fork manager still expects
  this marker.
- `.codex/skills/gsd-fork-propagate/SKILL.md`, or a smaller replacement if the
  global `my-oss-fork-manager` skill should now be the single control plane.
- `scripts/mase-install-fork.sh`, `scripts/mase-gsd-install-inventory.sh`,
  `scripts/mase-gsd-propagate.sh`, and `scripts/mase-gsd-agents-routing.cjs`.
- `/gsd-update` fork preflight.
- Focused tests proving fork wrapper, marker, inventory, propagation dry-run,
  and update preflight behavior.

### Drop By Default

- Local package identity drift back to `get-shit-done-cc`.
- SDK package/release assumptions unless a specific local tool still calls them.
- Old tests whose only purpose was SDK parity or abandoned-repo behavior.
- Any rollback-only docs or code from `gsd-build/get-shit-done` except the
  historical rollback note.

### Needs Mase Decision

- Whether `--minimal` should continue to mean Mase's curated `mase-minimal`
  profile, or whether Open GSD `core` is now good enough.
- Whether Codex update-check hooks should still be suppressed by the fork
  wrapper, or whether upstream's latest hook fixes make them acceptable.
- Whether repo-local Codex agent guardrails still need a Mase overlay after
  comparing against upstream's current behavior.
- Exact marker migration behavior for existing stale fork-managed installs.

## Proposed Implementation Phases

### Phase 1 - Build Clean Upstream Overlay Branch

Create a new branch from `upstream-main`, for example:

```bash
git checkout upstream-main
git checkout -b codex/open-gsd-mase-overlay
```

Then re-add only documentation and guardrails:

- root `AGENTS.md` Mase fork section
- Mase fork operating docs
- existing `.codex/oss-fork-manager.json` marker carried forward as
  `schema_version: 1`
- documentation pointer to the global `my-oss-fork-manager` control plane
  rather than porting repo-local propagation skill content in Phase 1

Validation:

```bash
git diff --check
```

Additional validation before leaving Phase 1:

- compare upstream `AGENTS.md` with the fork override and keep both sets of
  instructions coherent
- verify Mase fork docs point only to paths that exist in the upstream-first
  overlay
- verify `.codex/oss-fork-manager.json` still matches the global marker schema
  (`schema_version: 1`, no install-target duplication)
- verify remotes still match the fork topology and upstream push URL remains
  disabled
- verify rollback tag remains available before any later history rewrite

### Phase 2 - Reapply Fork Install Provenance And Migration

Adapt the Mase wrapper scripts to Open GSD's package identity:

- invoke local `bin/install.js`
- record `@opengsd/gsd-core` identity where useful
- preserve `mase-fork-install.json`
- support old marker identity fields during transition from `get-shit-done-cc`
  to `@opengsd/gsd-core`
- preserve existing install modes when propagating unless explicitly overridden
- keep dry-run-first propagation
- preserve dirty target and global install gates

Validation:

```bash
node --test tests/mase-gsd-fork-scripts.test.cjs
node --test tests/install.test.cjs
```

Migration validation:

- inventory recognizes both old and new marker shapes
- dry-run shows stale global and repo-local fork-managed installs without
  mutating them
- dirty repo-local targets remain skipped by default
- propagation updates marker identity/provenance only during explicit apply
- propagation is run only when Mase explicitly asks to propagate reconciled fork
  state to existing installs

### Phase 3 - Implement Mase Small Install Profile

Reintroduce Mase's small install behavior against upstream
`install-profiles.cjs` instead of restoring the old file blindly. The key
requirement is preserving Mase's curated small daily surface and curated agents,
while staying compatible with upstream's current profile and Codex config code.

Validation:

```bash
node --test tests/install-minimal-hooks.test.cjs tests/agent-install-validation.test.cjs
```

### Phase 4 - Codex Guardrails And Hooks

Review Codex behavior against current upstream before carrying local hook
changes:

- prefer upstream `config.toml` behavior unless a current Mase failure requires
  `hooks.json`
- keep `GSD_SKIP_UPDATE_CHECK_HOOK=1` for fork-managed installs
- keep repo-local agent preference only if not already covered upstream

Validation:

```bash
node --test tests/codex-config.test.cjs tests/bug-3357-codex-legacy-hooks-json-migration.test.cjs
```

### Phase 5 - Retire Planning Workflow Extras

Do not carry active `plan-brief` code into the overlay. Retire it with a small
recovery note that points to the old branch/tag implementation, then inspect
upstream's current planning artifacts before deciding whether a smaller
replacement is needed later.

Validation:

```bash
rg -n "plan-brief|BRIEF" commands get-shit-done tests docs
```

### Phase 6 - Full Validation And Branch Adoption

Run broad checks only after the overlay is stable:

```bash
npm run build
npm test
git diff --check
```

Then choose one adoption path:

- **Clean history path:** reset/recreate `mase/local-fixes` at the overlay
  branch and force-push with explicit approval.
- **Non-destructive path:** merge the overlay branch into `mase/local-fixes`,
  preserving messy historical ancestry.

The clean history path better matches the goal of "use upstream as much as
possible, then add custom changes on top," but it is higher-impact because it
rewrites the durable fork branch.

## Open Questions

1. What exact implementation shape should preserve the Mase small install while
   fitting upstream's profile APIs and Codex agent handling?
2. What exact migration behavior should existing stale fork-managed installs
   receive when package identity moves to `@opengsd/gsd-core`?
3. Should the repo-local `gsd-fork-propagate` skill stay, or should it be
   replaced by the global `my-oss-fork-manager` skill plus docs?
4. Is a clean branch rewrite acceptable after validation, or must
   `mase/local-fixes` preserve current published history?

Resolved directions:

- `plan-brief` should not be part of the active overlay. It should be retired
  with a recovery note pointing to the old implementation.
- fork-managed installs should suppress upstream startup update-check hooks.
- existing fork-managed installs should be updated only through explicit Mase
  propagation after reconciliation is validated.

## Suggested Next Step

Get approval for Phase 1 only: create a clean branch from `upstream-main` and
re-add the smallest Mase guardrail/documentation overlay. Do not touch installer
behavior until that branch is reviewed.
