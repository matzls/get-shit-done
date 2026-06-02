'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  cleanup,
  createTempProject,
  runGsdTools,
} = require('./helpers.cjs');

const REPO_ROOT = path.join(__dirname, '..');
const PLAN_PHASE_PATH = path.join(REPO_ROOT, 'get-shit-done', 'workflows', 'plan-phase.md');

function samplePlan() {
  return `---
phase: 01-baseline
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/finalizer.js
requirements: [REQ-01]
---

<objective>
Create a deterministic finalization path for phase planning.
</objective>

<task id="T1">
<name>Add finalization guard</name>
<action>Generate and check derived plan briefs before marking the phase ready.</action>
<done>The brief check passes before the ready state is written.</done>
</task>
`;
}

function writeState(projectDir) {
  fs.writeFileSync(
    path.join(projectDir, '.planning', 'STATE.md'),
    `# Project State

**Current Phase:** 01
**Status:** Ready to plan
**Current Plan:** Not started
**Total Plans in Phase:** 0
**Last Activity:** 2026-01-01
**Last Activity Description:** Starting planning

## Current Position

Status: Ready to plan
Last Activity: 2026-01-01
`,
    'utf8'
  );
}

describe('plan-phase brief finalization invariant', () => {
  test('workflow checks generated briefs before marking the phase ready', () => {
    const content = fs.readFileSync(PLAN_PHASE_PATH, 'utf8');
    const planCountIndex = content.indexOf('PLAN_COUNT=$(printf');
    const briefCheckIndex = content.indexOf('PLAN_BRIEF_CHECK=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" plan-brief "${PHASE_DIR}" --check)');
    const readyStateIndex = content.indexOf('gsd-sdk query state.planned-phase');
    const finalStatusGuardIndex = content.indexOf('Before presenting the final status, enforce the plan-brief completion invariant');

    assert.notEqual(planCountIndex, -1, 'workflow must recompute PLAN_COUNT from disk');
    assert.notEqual(briefCheckIndex, -1, 'workflow must run plan-brief --check in finalization');
    assert.notEqual(readyStateIndex, -1, 'workflow must still record state.planned-phase');
    assert.ok(planCountIndex < briefCheckIndex, 'disk-derived PLAN_COUNT must precede brief checking');
    assert.ok(briefCheckIndex < readyStateIndex, 'brief check must precede state.planned-phase');
    assert.ok(finalStatusGuardIndex > readyStateIndex, 'Step 14 defense-in-depth guard must remain after ready-state write');
  });

  test('workflow stops on init agent preflight before spawning subagents', () => {
    const content = fs.readFileSync(PLAN_PHASE_PATH, 'utf8');
    const initIndex = content.indexOf('INIT=$(gsd-sdk query init.plan-phase "$PHASE")');
    const preflightIndex = content.indexOf('AGENTS_INSTALLED=$(node -e');
    const researcherSkillsIndex = content.indexOf('AGENT_SKILLS_RESEARCHER=$(gsd-sdk query agent-skills gsd-phase-researcher)');
    const spawnIndex = content.indexOf('subagent_type="gsd-phase-researcher"');

    assert.notEqual(initIndex, -1, 'workflow must initialize through init.plan-phase');
    assert.notEqual(preflightIndex, -1, 'workflow must parse agents_installed from init output');
    assert.notEqual(researcherSkillsIndex, -1, 'workflow must still load researcher skills');
    assert.notEqual(spawnIndex, -1, 'workflow must still spawn researcher later');
    assert.ok(initIndex < preflightIndex, 'agent preflight must use init output');
    assert.ok(preflightIndex < spawnIndex, 'agent preflight must run before any researcher spawn');
    assert.match(content, /Do not recalculate the required agent set/);
  });

  test('final status guard is check-only after state is written', () => {
    const content = fs.readFileSync(PLAN_PHASE_PATH, 'utf8');
    const finalStatusGuardIndex = content.indexOf('Before presenting the final status, enforce the plan-brief completion invariant');
    const finalStatusText = content.slice(finalStatusGuardIndex, content.indexOf('## 15. Auto-Advance Check'));

    assert.notEqual(finalStatusGuardIndex, -1, 'workflow must keep final status guard');
    assert.match(finalStatusText, /do not regenerate briefs in this final status step/);
    assert.match(finalStatusText, /route back through §13d/);
  });

  test('workflow fails closed when no executable plans exist', () => {
    const content = fs.readFileSync(PLAN_PHASE_PATH, 'utf8');
    const noPlansIndex = content.indexOf('No executable PLAN.md files found in ${PHASE_DIR}');
    const readyStateIndex = content.indexOf('gsd-sdk query state.planned-phase');

    assert.notEqual(noPlansIndex, -1, 'workflow must explicitly handle zero executable plans');
    assert.ok(noPlansIndex < readyStateIndex, 'zero-plan guard must run before state.planned-phase');
    assert.match(content, /must not be marked `Ready to execute`/);
  });

  test('simulated fallback plans generate current briefs before ready state is written', (t) => {
    const project = createTempProject('gsd-plan-phase-finalization-');
    t.after(() => cleanup(project));

    writeState(project);
    const phaseDir = path.join(project, '.planning', 'phases', '01-baseline');
    fs.mkdirSync(phaseDir, { recursive: true });
    fs.writeFileSync(path.join(phaseDir, '01-01-PLAN.md'), samplePlan(), 'utf8');

    const generate = runGsdTools(['plan-brief', phaseDir], project);
    assert.equal(generate.success, true, generate.error);

    const check = runGsdTools(['plan-brief', phaseDir, '--check'], project);
    assert.equal(check.success, true, check.error);
    assert.equal(JSON.parse(check.output).passed, true);
    assert.equal(fs.existsSync(path.join(phaseDir, '01-01-BRIEF.md')), true);

    const ready = runGsdTools(['state', 'planned-phase', '--phase', '01', '--plans', '1'], project);
    assert.equal(ready.success, true, ready.error);

    const state = fs.readFileSync(path.join(project, '.planning', 'STATE.md'), 'utf8');
    assert.match(state, /Ready to execute/);
    assert.match(state, /\*\*Total Plans in Phase:\*\* 1/);
  });
});
