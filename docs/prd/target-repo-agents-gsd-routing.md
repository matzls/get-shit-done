---
title: "Target Repo AGENTS.md GSD Routing"
kind: prd
status: draft
audience: "agents-maintainers"
canonicality: proposal
created: 2026-05-10
updated: 2026-05-10
---

# Target Repo AGENTS.md GSD Routing

## Summary

When GSD is installed or updated in a local project repo, the install/update
process should also ensure that the target repo has clear repo-level agent
instructions for using that local GSD install.

The goal is not to replace skill descriptions, fork markers, or existing
project instructions. The goal is to add a visible routing layer in the target
repo's `AGENTS.md` so future agents understand:

- GSD is installed locally in this repo.
- Project work should use the repo-local `.codex/skills/gsd-*` skills.
- Maintaining or updating the GSD framework itself is a separate fork-managed
  task.
- Mase-managed fork installs should not be updated through public npm or the
  upstream `/gsd-update` path unless Mase explicitly asks for that.

## Problem

GSD is currently discoverable through installed skills and metadata, but a new
agent working inside a target repo can still miss the intended routing.

Common failure modes:

- The agent sees many `.codex/skills/gsd-*` skills but does not understand when
  to use them.
- The agent treats project workflow skills and framework maintenance as the
  same kind of task.
- The agent chooses `/gsd-update`, `npx get-shit-done-cc@latest`, or an upstream
  update path even though the repo was installed from Mase's local fork.
- The agent fails to route framework propagation tasks back to the local
  `get-shit-done` fork.
- The agent relies only on individual skill descriptions instead of repo-level
  instructions that are read before skill selection.

## Desired Behavior

For local repo installs and updates, GSD should check the target repo's
`AGENTS.md`.

If `AGENTS.md` does not exist:

- Create it.
- Include a concise GSD routing section.
- Keep the file safe for future project-specific instructions.

If `AGENTS.md` already exists:

- Preserve existing project guidance.
- Add a concise GSD routing section if missing.
- Refresh the GSD routing section if it is managed and stale.
- Avoid rewriting unrelated content.

For Mase fork-managed installs:

- The section should point framework update, sync, inventory, and propagation
  work back to the local fork:
  `/Users/mase/Codebase/Personal-Projects/get-shit-done`.
- The section should name the fork propagation skill as the owner for framework
  maintenance:
  `/Users/mase/Codebase/Personal-Projects/get-shit-done/.codex/skills/gsd-fork-propagate/SKILL.md`.
- The section should warn against public npm and upstream update flows unless
  Mase explicitly asks to replace the fork-managed setup.

## Suggested Target AGENTS.md Section

Installers and updaters should use wording close to this. Exact phrasing may
vary by runtime and install mode, but the routing contract should stay intact.

```markdown
## GSD Routing

GSD is installed locally in this repo.

Use this repo's `.codex/skills/gsd-*` skills when the task is about managing,
planning, implementing, debugging, validating, documenting, or shipping work
inside this project.

Default routing:
- Use `gsd-progress` or `gsd-health` to inspect project/workflow state.
- Use `gsd-discuss-phase`, `gsd-spec-phase`, or `gsd-plan-phase` when work
  needs clarification, specification, or planning.
- Use `gsd-execute-phase`, `gsd-quick`, or `gsd-fast` for implementation work,
  depending on scope.
- Use `gsd-debug` for bugs, regressions, failing checks, or unexplained runtime
  behavior.
- Use `gsd-code-review`, `gsd-validate-phase`, or `gsd-verify-work` for quality
  gates after implementation.
- Use `gsd-docs-update` for verified project documentation updates.
- Use `gsd-ship` only when preparing verified work for PR or release.

Do not use this repo's project workflow skills to update the GSD framework
itself.

For GSD framework updates, install inventory, stale install checks,
propagation dry-runs, or confirmed propagation, use Mase's local GSD fork:

`/Users/mase/Codebase/Personal-Projects/get-shit-done/.codex/skills/gsd-fork-propagate/SKILL.md`

Do not use `/gsd-update`, `npx get-shit-done-cc@latest`, public npm update
flows, or upstream install flows unless Mase explicitly asks to replace the
fork-managed setup with upstream.

Safety rules:
- Always dry-run propagation before apply.
- Report selected targets, skipped targets, and exact commands before apply.
- Do not update dirty target repos unless Mase explicitly confirms.
- Do not update global installs unless Mase explicitly confirms.
- Do not update unknown-source installs unless Mase explicitly confirms.
```

## Implementation Outline

Add an install/update step that manages the target repo `AGENTS.md` guidance.

The implementation should:

1. Detect the target repo root used for the local install or update.
2. Read existing `AGENTS.md` if present.
3. Detect whether a GSD routing section already exists.
4. If no section exists, append a concise section to the existing file or
   create a new file.
5. If a managed GSD routing section exists, refresh only that section when the
   template changes.
6. Preserve all unrelated target repo instructions.
7. Keep fork-specific wording conditional on fork-managed installs, using the
   fork marker or install context as the source of truth.
8. Include dry-run output showing whether `AGENTS.md` would be created,
   appended, refreshed, or left unchanged.

## Relationship To OSS Fork Manager

This `AGENTS.md` routing block should be treated as a repo-local GSD activation
surface for Mase's broader OSS fork manager.

GSD install/update should own the concrete template and write/update behavior.
The OSS fork manager may later inventory, report, dry-run, or repair this
surface as part of GSD propagation, but it should not become the only place
where the target-repo guidance is defined.

Recommended OSS fork manager surface split:

- `gsd.repo.local_install`: local GSD install files, markers, skills, hooks, and
  current/stale install status.
- `gsd.repo.agents_routing`: target repo `AGENTS.md` managed routing block.

Recommended `gsd.repo.agents_routing` surface statuses should stay compatible
with the OSS fork manager shared status enum:

- `current`
- `stale`
- `blocked_dirty_target`
- `not_applicable`
- `not_installed`
- `unknown`

GSD-specific findings such as missing `AGENTS.md`, unmanaged GSD text, ambiguous
duplicate routing blocks, or unreadable files should be carried in evidence or
surface data unless the OSS fork manager shared enum is deliberately extended.

Recommended evidence:

- whether `AGENTS.md` exists
- whether managed routing markers are present
- routing template version or hash
- install marker source and commit
- target repo git status

Recommended apply strategy:

- Use a delegated apply strategy such as `delegate-command`.
- Do not hardcode GSD `AGENTS.md` prose in the global OSS fork manager registry
  or skill.
- Delegate approved repairs to the GSD fork's own installer or propagation
  helper.

Rules:

- GSD local install/update owns creating and refreshing the managed
  `AGENTS.md` block.
- OSS fork manager may detect whether the block is missing, current, stale, or
  unmanaged.
- OSS fork manager may call or wrap the GSD installer/propagator to repair the
  block after dry-run review and explicit approval.
- Mutating target repo instructions remains approval-gated when run through the
  OSS fork manager.
- Dirty target repos remain blocked unless Mase explicitly confirms.

## Managed Block Contract

To make updates safe, the generated section should use explicit markers.

Suggested markers:

```markdown
<!-- gsd-routing-start -->
...
<!-- gsd-routing-end -->
```

Rules:

- If markers exist, update only the content between them.
- If no markers exist but a clear legacy GSD routing section exists, report it
  and choose the safest migration behavior.
- If no GSD routing exists, append the managed block.
- Never remove unrelated human-authored instructions.
- Never silently replace a whole `AGENTS.md`.

## Non-Goals

- Do not make target repo `AGENTS.md` files a full GSD manual.
- Do not replace skill descriptions or workflow docs.
- Do not force project repos to use GSD for every task.
- Do not update dirty target repos without explicit confirmation.
- Do not change global installs without explicit confirmation.
- Do not create Git commits, pushes, or PRs automatically.

## Acceptance Criteria

- A fresh local GSD install into a repo with no `AGENTS.md` creates one with a
  clear GSD routing section.
- A local GSD install/update in a repo with an existing `AGENTS.md` preserves
  existing content and adds or refreshes only the GSD routing section.
- The generated section clearly distinguishes project GSD work from GSD
  framework maintenance.
- Fork-managed installs point framework maintenance to
  `gsd-fork-propagate` in Mase's local `get-shit-done` fork.
- Fork-managed installs warn against `/gsd-update`, public npm, and upstream
  install/update flows unless Mase explicitly asks for upstream replacement.
- Dry-run mode reports the planned `AGENTS.md` action before any write.
- Propagation/update flows continue to skip dirty target repos, global installs,
  and unknown-source installs unless Mase explicitly confirms.

## Open Questions

- Should the installer always append the managed block at the end, or place it
  near an existing workflow/tooling section when one exists?
- Should non-fork upstream installs get a similar but upstream-specific routing
  section?
- Should the updater migrate older unmarked GSD routing text into the managed
  block automatically, or only report that manual cleanup is recommended?
