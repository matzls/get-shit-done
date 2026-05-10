#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

const START = '<!-- gsd-routing-start -->';
const END = '<!-- gsd-routing-end -->';
const TEMPLATE_VERSION = '2026-05-10.1';

function usage() {
  process.stderr.write(`Usage: scripts/mase-gsd-agents-routing.cjs status|apply --target PATH [--json]\n`);
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function template() {
  return [
    START,
    `<!-- template-version: ${TEMPLATE_VERSION} -->`,
    `<!-- template-sha256: ${sha256(templateBody())} -->`,
    '',
    templateBody(),
    END,
    '',
  ].join('\n');
}

function templateBody() {
  return [
    '## GSD Routing',
    '',
    'GSD is installed locally in this repo.',
    '',
    "Use this repo's `.codex/skills/gsd-*` skills when the task is about managing,",
    'planning, implementing, debugging, validating, documenting, or shipping work',
    'inside this project.',
    '',
    'Default routing:',
    '- Use `gsd-progress` or `gsd-health` to inspect project/workflow state.',
    '- Use `gsd-discuss-phase`, `gsd-spec-phase`, or `gsd-plan-phase` when work',
    '  needs clarification, specification, or planning.',
    '- Use `gsd-execute-phase`, `gsd-quick`, or `gsd-fast` for implementation work,',
    '  depending on scope.',
    '- Use `gsd-debug` for bugs, regressions, failing checks, or unexplained runtime',
    '  behavior.',
    '- Use `gsd-code-review`, `gsd-validate-phase`, or `gsd-verify-work` for quality',
    '  gates after implementation.',
    '- Use `gsd-docs-update` for verified project documentation updates.',
    '- Use `gsd-ship` only when preparing verified work for PR or release.',
    '',
    "Do not use this repo's project workflow skills to update the GSD framework",
    'itself.',
    '',
    'For GSD framework updates, install inventory, stale install checks,',
    "propagation dry-runs, or confirmed propagation, use Mase's local GSD fork:",
    '',
    'the local fork propagation skill (`.codex/skills/gsd-fork-propagate/SKILL.md` in the fork checkout)',
    '',
    'Do not use `/gsd-update`, `npx get-shit-done-cc@latest`, public npm update',
    'flows, or upstream install flows unless Mase explicitly asks to replace the',
    'fork-managed setup with upstream.',
    '',
    'Safety rules:',
    '- Always dry-run propagation before apply.',
    '- Report selected targets, skipped targets, and exact commands before apply.',
    '- Do not update dirty target repos unless Mase explicitly confirms.',
    '- Do not update global installs unless Mase explicitly confirms.',
    '- Do not update unknown-source installs unless Mase explicitly confirms.',
  ].join('\n');
}

function readText(file) {
  try {
    return { ok: true, text: fs.readFileSync(file, 'utf8') };
  } catch (err) {
    if (err && err.code === 'ENOENT') return { ok: false, missing: true, text: '' };
    return { ok: false, error: err.message, text: '' };
  }
}

function findManagedBlock(text) {
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  if (start === -1 && end === -1) return { count: 0 };
  if (start === -1 || end === -1 || end < start) return { count: 0, ambiguous: true };
  const nextStart = text.indexOf(START, start + START.length);
  const nextEnd = text.indexOf(END, end + END.length);
  if (nextStart !== -1 || nextEnd !== -1) return { count: 2, ambiguous: true };
  return { count: 1, start, end: end + END.length };
}

function inspect(target) {
  const targetPath = path.resolve(target);
  const agentsPath = path.join(targetPath, 'AGENTS.md');
  const markerPath = path.join(targetPath, '.codex', 'mase-fork-install.json');
  const evidence = [];
  const data = {
    agents_path: agentsPath,
    marker_path: markerPath,
    template_version: TEMPLATE_VERSION,
    template_sha256: sha256(templateBody()),
  };

  if (fs.existsSync(markerPath)) {
    evidence.push(`install_marker:${markerPath}`);
    try {
      const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
      data.install_marker_source = marker.source || null;
      data.install_marker_commit = marker.commit || null;
      data.install_marker_mode = marker.mode || null;
      if (marker.source) evidence.push(`install_marker_source:${marker.source}`);
      if (marker.commit) evidence.push(`install_marker_commit:${marker.commit}`);
    } catch (err) {
      evidence.push(`install_marker_unreadable:${err.message}`);
    }
  } else {
    evidence.push(`install_marker_missing:${markerPath}`);
  }

  const read = readText(agentsPath);
  if (!read.ok && read.missing) {
    evidence.push(`agents_missing:${agentsPath}`);
    return { status: 'not_installed', evidence, data };
  }
  if (!read.ok) {
    evidence.push(`agents_unreadable:${read.error}`);
    return { status: 'unknown', evidence, data };
  }

  evidence.push(`agents_exists:${agentsPath}`);
  const block = findManagedBlock(read.text);
  if (block.ambiguous) {
    evidence.push('managed_markers_ambiguous');
    return { status: 'unknown', evidence, data: { ...data, finding: 'ambiguous_managed_markers' } };
  }

  if (block.count === 1) {
    const currentBlock = read.text.slice(block.start, block.end);
    const expectedBlock = template().trimEnd();
    if (currentBlock.trimEnd() === expectedBlock) {
      evidence.push(`managed_markers_present:${START}|${END}`);
      evidence.push(`template_version:${TEMPLATE_VERSION}`);
      return { status: 'current', evidence, data };
    }
    evidence.push('managed_markers_present_but_stale');
    return { status: 'stale', evidence, data };
  }

  if (/GSD Routing|gsd-fork-propagate|\.codex\/skills\/gsd-\*/i.test(read.text)) {
    evidence.push('unmanaged_gsd_routing_text_present');
    return { status: 'unknown', evidence, data: { ...data, finding: 'unmanaged_gsd_routing' } };
  }

  evidence.push('managed_markers_missing');
  return { status: 'not_installed', evidence, data };
}

function apply(target) {
  const targetPath = path.resolve(target);
  const agentsPath = path.join(targetPath, 'AGENTS.md');
  const before = inspect(targetPath);
  const block = template();

  if (before.status === 'current') {
    return { ...before, action: 'unchanged' };
  }
  if (before.data && before.data.finding === 'ambiguous_managed_markers') {
    return { ...before, action: 'blocked' };
  }

  fs.mkdirSync(targetPath, { recursive: true });
  const read = readText(agentsPath);
  let next;
  if (!read.ok && read.missing) {
    next = `# Project Instructions\n\n${block}`;
  } else if (!read.ok) {
    return { ...before, action: 'blocked' };
  } else {
    const existing = read.text;
    const managed = findManagedBlock(existing);
    if (managed.ambiguous) {
      return { ...before, action: 'blocked' };
    }
    if (managed.count === 1) {
      next = `${existing.slice(0, managed.start)}${block.trimEnd()}${existing.slice(managed.end)}`;
      if (!next.endsWith('\n')) next += '\n';
    } else {
      const spacer = existing.endsWith('\n\n') ? '' : existing.endsWith('\n') ? '\n' : '\n\n';
      next = `${existing}${spacer}${block}`;
    }
  }

  fs.writeFileSync(agentsPath, next);
  const after = inspect(targetPath);
  return { ...after, action: before.status === 'not_installed' ? 'created_or_appended' : 'refreshed', before_status: before.status };
}

function main(argv) {
  const [command, ...rest] = argv;
  let target = '';
  let json = false;
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--target') {
      target = rest[i + 1] || '';
      i += 1;
    } else if (arg === '--json') {
      json = true;
    } else {
      usage();
      return 2;
    }
  }
  if (!['status', 'apply'].includes(command) || !target) {
    usage();
    return 2;
  }

  const result = command === 'status' ? inspect(target) : apply(target);
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${result.status}: ${path.join(path.resolve(target), 'AGENTS.md')}\n`);
    for (const item of result.evidence || []) process.stdout.write(`  ${item}\n`);
  }
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = {
  END,
  START,
  TEMPLATE_VERSION,
  apply,
  inspect,
  template,
};
