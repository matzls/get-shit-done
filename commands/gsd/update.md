---
name: gsd:update
description: Update GSD to latest version with changelog display
argument-hint: "[--sync | --reapply]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Check for GSD updates, install if available, and display what changed.

Routes to the update workflow which handles:
- Version detection (local vs global installation)
- npm version checking
- Changelog fetching and display
- User confirmation with clean install warning
- Update execution and cache clearing
- Restart reminder
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/update.md
</execution_context>

<flags>
- **--sync**: Sync managed GSD skills across runtime roots so multi-runtime users stay aligned after an update. Runs the sync-skills workflow (--from, --to, --dry-run, --apply flags supported).
- **--reapply**: Reapply local modifications after a GSD update. Uses three-way comparison (pristine baseline, user-modified backup, newly installed version) to merge user customizations back. Runs the reapply-patches workflow.
- **(no flag)**: Standard update — check for new version, show changelog, install.
</flags>

<process>
## Mase Fork Install Preflight

Before running the standard upstream update workflow, check whether this runtime
installation is managed by Mase's fork.

Look for `mase-fork-install.json` in the active runtime config directory. For
common Codex installs this is usually one of:

```text
.codex/mase-fork-install.json
~/.codex/mase-fork-install.json
```

If the marker exists and contains `source: "mase-fork"`, stop unless
`GSD_ALLOW_UPSTREAM_UPDATE=1` is set.

Report:

```text
This GSD install is managed by Mase's fork.
Do not update it from upstream npm or public Open GSD package flows.
Use the fork checkout and scripts/mase-gsd-propagate.sh after the fork is
validated, or set GSD_ALLOW_UPSTREAM_UPDATE=1 only if Mase explicitly wants to
replace the fork-managed install with upstream.
```

Do not continue into the standard update workflow for fork-managed installs
without the explicit override.

## Standard Update Flow

Parse the first token of $ARGUMENTS:
- If it is `--sync`: strip the flag, execute the sync-skills workflow (passing remaining args for --from/--to/--dry-run/--apply).
- If it is `--reapply`: strip the flag, execute the reapply-patches workflow.
- Otherwise: execute the update workflow end-to-end.

</process>

<execution_context_extended>
@~/.claude/get-shit-done/workflows/sync-skills.md
@~/.claude/get-shit-done/workflows/reapply-patches.md
</execution_context_extended>
