'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  cleanup,
  createTempProject,
  parseFrontmatter,
  runGsdTools,
} = require('./helpers.cjs');

function writePlan(projectDir, relativePath, content = samplePlan()) {
  const fullPath = path.join(projectDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  return fullPath;
}

function samplePlan() {
  return `---
phase: 01-baseline
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/scanner.js
  - tests/scanner.test.js
autonomous: true
requirements: [REQ-01, REQ-02]
must_haves:
  truths:
    - "Rollout scanning has separate operational evidence."
  artifacts:
    - path: "src/scanner.js"
      provides: "Standalone scanner wrapper"
  key_links:
    - from: "src/scanner.js"
      to: "tests/scanner.test.js"
      via: "covered by"
      pattern: "scanner"
---

<objective>
Create a standalone scheduled scanner lane so freshness and failures are visible outside the heartbeat path.
</objective>

<task id="T1">
<name>Add scanner wrapper</name>
<action>Create the wrapper command and route it to the existing scanner implementation.</action>
<done>The wrapper can run independently and records scanner evidence.</done>
</task>

<task id="T2">
<name>Add wrapper tests</name>
<action>Cover dry-run, live-run, stale evidence, and malformed scanner output.</action>
<done>The targeted wrapper tests pass.</done>
</task>
`;
}

describe('gsd-tools plan-brief', () => {
  test('generates a human-readable brief beside a PLAN.md file', (t) => {
    const project = createTempProject('gsd-plan-brief-');
    t.after(() => cleanup(project));
    const planRel = '.planning/phases/01-baseline/01-01-PLAN.md';
    writePlan(project, planRel);

    const result = runGsdTools(['plan-brief', planRel], project);
    assert.equal(result.success, true, result.error);

    const payload = JSON.parse(result.output);
    assert.equal(payload.generated, true);
    assert.equal(payload.count, 1);
    assert.equal(payload.briefs[0].brief, '.planning/phases/01-baseline/01-01-BRIEF.md');

    const briefPath = path.join(project, '.planning/phases/01-baseline/01-01-BRIEF.md');
    assert.equal(fs.existsSync(briefPath), true);

    const brief = fs.readFileSync(briefPath, 'utf8');
    const fm = parseFrontmatter(brief);
    assert.equal(fm.kind, 'brief');
    assert.equal(fm.canonicality, 'derived');
    assert.equal(fm.source_plan, '01-01-PLAN.md');
    assert.match(fm.source_plan_hash, /^sha256:[a-f0-9]{64}$/);
    assert.equal(fm.brief_generator, 'gsd-plan-brief-v1.2');
    assert.match(brief, /## Plain-English Goal/);
    assert.match(brief, /## Dependency Map/);
    assert.match(brief, /## How The Flow Works/);
    assert.match(brief, /## Flow Diagram/);
    assert.match(brief, /```mermaid/);
    assert.match(brief, /Add scanner wrapper/);
    assert.match(brief, /src\/scanner\.js/);
    assert.match(brief, /route it to the existing scanner implementation/);
    assert.match(brief, /`Add scanner wrapper` feeds `Add wrapper tests`/);
    assert.doesNotMatch(brief, /Create as/);
  });

  test('check mode detects current, stale, generator drift, and line-ending-only changes', (t) => {
    const project = createTempProject('gsd-plan-brief-check-');
    t.after(() => cleanup(project));
    const planRel = '.planning/phases/01-baseline/01-01-PLAN.md';
    const planContent = samplePlan();
    writePlan(project, planRel, planContent);

    assert.equal(runGsdTools(['plan-brief', planRel], project).success, true);

    const crlfPlan = planContent.replace(/\n/g, '\r\n');
    fs.writeFileSync(path.join(project, planRel), crlfPlan, 'utf8');
    const lineEndingCheck = runGsdTools(['plan-brief', planRel, '--check'], project);
    assert.equal(lineEndingCheck.success, true, lineEndingCheck.error);
    assert.equal(JSON.parse(lineEndingCheck.output).passed, true);

    const briefPath = path.join(project, '.planning/phases/01-baseline/01-01-BRIEF.md');
    fs.writeFileSync(
      briefPath,
      fs.readFileSync(briefPath, 'utf8').replace('gsd-plan-brief-v1.2', 'gsd-plan-brief-v1'),
      'utf8'
    );
    const generatorCheck = runGsdTools(['plan-brief', planRel, '--check'], project);
    assert.equal(generatorCheck.success, true, generatorCheck.error);
    const generatorPayload = JSON.parse(generatorCheck.output);
    assert.equal(generatorPayload.passed, false);
    assert.equal(generatorPayload.briefs[0].generator_mismatch, true);

    assert.equal(runGsdTools(['plan-brief', planRel], project).success, true);
    fs.writeFileSync(
      path.join(project, planRel),
      crlfPlan.replace('Create a standalone scheduled scanner lane', 'Create a revised standalone scanner lane'),
      'utf8'
    );
    const staleCheck = runGsdTools(['plan-brief', planRel, '--check'], project);
    assert.equal(staleCheck.success, true, staleCheck.error);
    const stalePayload = JSON.parse(staleCheck.output);
    assert.equal(stalePayload.passed, false);
    assert.equal(stalePayload.stale_count, 1);
    assert.equal(stalePayload.briefs[0].stale, true);
  });

  test('phase targets generate briefs for every plan in the phase directory', (t) => {
    const project = createTempProject('gsd-plan-brief-phase-');
    t.after(() => cleanup(project));
    writePlan(project, '.planning/phases/01-baseline/01-01-PLAN.md');
    writePlan(project, '.planning/phases/01-baseline/01-02-PLAN.md', samplePlan().replace('plan: 01', 'plan: 02'));

    const result = runGsdTools(['plan-brief', '1'], project);
    assert.equal(result.success, true, result.error);
    const payload = JSON.parse(result.output);
    assert.equal(payload.count, 2);
    assert.deepEqual(
      payload.briefs.map(item => path.basename(item.brief)),
      ['01-01-BRIEF.md', '01-02-BRIEF.md']
    );
  });

  test('mermaid diagrams sanitize config-style labels that contain markdown syntax', (t) => {
    const project = createTempProject('gsd-plan-brief-mermaid-labels-');
    t.after(() => cleanup(project));
    const planRel = '.planning/phases/01-baseline/01-01-PLAN.md';
    const plan = samplePlan().replace(
      'via: "covered by"',
      'via: "absolute command path in `[[hooks.Stop.hooks]]`"'
    );
    writePlan(project, planRel, plan);

    const result = runGsdTools(['plan-brief', planRel], project);
    assert.equal(result.success, true, result.error);
    const brief = fs.readFileSync(path.join(project, '.planning/phases/01-baseline/01-01-BRIEF.md'), 'utf8');
    const mermaidBlocks = [...brief.matchAll(/```mermaid\n([\s\S]*?)```/g)].map(match => match[1]).join('\n');

    assert.match(mermaidBlocks, /absolute command path in hooks\.Stop\.hooks/);
    assert.doesNotMatch(mermaidBlocks, /\[\[hooks\.Stop\.hooks\]\]/);
    assert.doesNotMatch(mermaidBlocks, /`/);
  });

  test('non-goals ignore negative success conditions inside task blocks', (t) => {
    const project = createTempProject('gsd-plan-brief-nongoals-');
    t.after(() => cleanup(project));
    const planRel = '.planning/phases/01-baseline/01-01-PLAN.md';
    const plan = samplePlan()
      .replace(
        '<done>The wrapper can run independently and records scanner evidence.</done>',
        '<done>The command does not regress existing output.</done>'
      )
      .replace(
        '</objective>',
        '</objective>\n\n<constraints>\nDo not write secrets to logs.\n</constraints>'
      );
    writePlan(project, planRel, plan);

    const result = runGsdTools(['plan-brief', planRel], project);
    assert.equal(result.success, true, result.error);
    const brief = fs.readFileSync(path.join(project, '.planning/phases/01-baseline/01-01-BRIEF.md'), 'utf8');
    const nonGoals = brief.slice(brief.indexOf('## What This Does Not Do'), brief.indexOf('## Success Looks Like'));

    assert.match(nonGoals, /Do not write secrets to logs/);
    assert.doesNotMatch(nonGoals, /does not regress existing output/);
    assert.match(brief, /Done when the command does not regress existing output/);
  });

  test('flow diagram connects every independent runtime root to Start', (t) => {
    const project = createTempProject('gsd-plan-brief-flow-roots-');
    t.after(() => cleanup(project));
    const planRel = '.planning/phases/01-baseline/01-01-PLAN.md';
    const plan = samplePlan().replace(
      /  key_links:[\s\S]*?---/,
      `  key_links:
    - from: "alpha.js"
      to: "beta.js"
      via: "calls"
    - from: "gamma.js"
      to: "delta.js"
      via: "calls"
---`
    );
    writePlan(project, planRel, plan);

    const result = runGsdTools(['plan-brief', planRel], project);
    assert.equal(result.success, true, result.error);
    const brief = fs.readFileSync(path.join(project, '.planning/phases/01-baseline/01-01-BRIEF.md'), 'utf8');
    const flowStart = brief.indexOf('## Flow Diagram');
    const taskStart = brief.indexOf('## Task Summary');
    const flow = brief.slice(flowStart, taskStart);

    assert.match(flow, /Start\(\["Start"\]\) --> S1/);
    assert.match(flow, /Start\(\["Start"\]\) --> S3/);
    assert.match(flow, /S1\["alpha\.js"\] -->\|calls\| S2\["beta\.js"\]/);
    assert.match(flow, /S3\["gamma\.js"\] -->\|calls\| S4\["delta\.js"\]/);
  });

  test('command, workflow, registry, and plan-phase wiring document BRIEF.md artifacts', () => {
    const root = path.join(__dirname, '..');
    const command = fs.readFileSync(path.join(root, 'commands/gsd/plan-brief.md'), 'utf8');
    const workflow = fs.readFileSync(path.join(root, 'get-shit-done/workflows/plan-brief.md'), 'utf8');
    const planPhase = fs.readFileSync(path.join(root, 'get-shit-done/workflows/plan-phase.md'), 'utf8');
    const registry = fs.readFileSync(path.join(root, 'get-shit-done/templates/README.md'), 'utf8');

    assert.match(command, /name: gsd:plan-brief/);
    assert.match(workflow, /source_plan_hash/);
    assert.match(planPhase, /plan-brief "\$\{PHASE_DIR\}"/);
    assert.match(planPhase, /\*-BRIEF\.md/);
    assert.match(planPhase, /\[04-01-BRIEF\.md\]\(\/absolute\/path\/to\/04-01-BRIEF\.md\)/);
    assert.match(planPhase, /terminal TUI renders these\s+markdown\s+file links as clickable/);
    assert.match(workflow, /\[04-01-BRIEF\.md\]\(\/absolute\/path\/to\/04-01-BRIEF\.md\)/);
    assert.match(registry, /NN-MM-BRIEF\.md/);
  });
});
