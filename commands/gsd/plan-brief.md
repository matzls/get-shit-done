---
name: gsd:plan-brief
description: Generate or check a human-readable BRIEF.md companion for PLAN.md artifacts
argument-hint: "<plan-path|phase> [--check]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---
<objective>
Generate or verify human-readable `*-BRIEF.md` artifacts derived from executable `*-PLAN.md` files.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/plan-brief.md
</execution_context>

<context>
Target: $ARGUMENTS

Accepted targets:
- A concrete `*-PLAN.md` path
- A phase directory
- A phase number or phase slug

Flags:
- `--check` - verify existing brief freshness using the stored source plan hash
</context>

<process>
Execute the plan-brief workflow from @~/.claude/get-shit-done/workflows/plan-brief.md.
</process>
