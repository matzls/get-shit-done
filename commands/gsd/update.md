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
Parse the first token of $ARGUMENTS:
- If it is `--sync`: strip the flag, execute the sync-skills workflow (passing remaining args for --from/--to/--dry-run/--apply).
- If it is `--reapply`: strip the flag, execute the reapply-patches workflow.
- Otherwise: run the fork-managed install preflight below, then execute the update workflow end-to-end.

### Mase Fork Install Preflight

Before the standard npm-backed update workflow, check whether this install was
created from Mase's fork. If a marker exists and `GSD_ALLOW_UPSTREAM_UPDATE` is
not set to `1`, stop before any npm update step.

Use the runtime config dir that matches the current install scope when known.
If the scope is not known yet, check the common local and global marker paths:

```bash
for marker in \
  .codex/mase-fork-install.json \
  .claude/mase-fork-install.json \
  "${CODEX_HOME:-$HOME/.codex}/mase-fork-install.json" \
  "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/mase-fork-install.json"
do
  if [ -f "$marker" ] && grep -q '"source"[[:space:]]*:[[:space:]]*"mase-fork"' "$marker"; then
    if [ "${GSD_ALLOW_UPSTREAM_UPDATE:-}" != "1" ]; then
      echo "This GSD install is managed from Mase's fork."
      echo "Do not update it from upstream npm."
      echo "Ask Codex: update GSD from my fork"
      echo "Marker: $marker"
      exit 42
    fi
  fi
done
```

If this preflight exits `42`, report the message to the user and do not continue
to the upstream update workflow. Only continue when no Mase fork marker is found
or when `GSD_ALLOW_UPSTREAM_UPDATE=1` is explicitly set.

</process>

<execution_context_extended>
@~/.claude/get-shit-done/workflows/sync-skills.md
@~/.claude/get-shit-done/workflows/reapply-patches.md
</execution_context_extended>
