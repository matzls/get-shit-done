/**
 * Plan Brief - deterministic human-readable companions for PLAN.md artifacts.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  atomicWriteFileSync,
  error,
  findPhaseInternal,
  normalizeMd,
  output,
  toPosixPath,
} = require('./core.cjs');
const { extractFrontmatter, parseMustHavesBlock } = require('./frontmatter.cjs');

const GENERATOR_ID = 'gsd-plan-brief-v1.1';

function normalizeForHash(content) {
  return String(content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function sourcePlanHash(content) {
  return 'sha256:' + crypto.createHash('sha256').update(normalizeForHash(content), 'utf8').digest('hex');
}

function planBriefPathFor(planPath) {
  if (!/-PLAN\.md$/i.test(planPath)) {
    error(`Plan brief requires a *-PLAN.md file, got: ${planPath}`);
  }
  return planPath.replace(/-PLAN\.md$/i, '-BRIEF.md');
}

function yamlQuote(value) {
  return `"${String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function compactText(value, fallback = 'Not specified in source plan.') {
  const text = String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text || fallback;
}

function extractXmlBlock(content, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = content.match(re);
  return match ? match[1].trim() : '';
}

function extractXmlTag(content, tag) {
  return compactText(extractXmlBlock(content, tag), '');
}

function extractTasks(content) {
  const tasks = [];
  const re = /<task\b([^>]*)>([\s\S]*?)<\/task>/gi;
  let match;
  while ((match = re.exec(content)) !== null) {
    const attrs = match[1] || '';
    const body = match[2] || '';
    const id = (attrs.match(/\bid=["']([^"']+)["']/i) || [])[1] || `task-${tasks.length + 1}`;
    const title = extractXmlTag(body, 'name') || compactText(body.split(/\r?\n/)[0], `Task ${tasks.length + 1}`);
    const action = extractXmlTag(body, 'action') || extractXmlTag(body, 'description') || 'Not specified in source plan.';
    const done = extractXmlTag(body, 'done') || extractXmlTag(body, 'success') || 'Not specified in source plan.';
    tasks.push({ id, title, action, done });
  }
  return tasks;
}

function cleanTaskTitle(title, fallback) {
  return compactText(title, fallback)
    .replace(/^Task\s+\d+\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentenceCase(value) {
  const text = compactText(value, '');
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function trimSentence(value, maxLength = 180) {
  const text = compactText(value, '');
  if (text.length <= maxLength) return text.endsWith('.') ? text : `${text}.`;
  const clipped = text.slice(0, maxLength + 1);
  const boundary = Math.max(clipped.lastIndexOf(' '), clipped.lastIndexOf(','));
  const trimmed = clipped.slice(0, boundary > 80 ? boundary : maxLength).replace(/[,\s]+$/g, '');
  return `${trimmed}.`;
}

function titleAsAction(title) {
  const cleanTitle = cleanTaskTitle(title, 'Complete the planned task.');
  return trimSentence(sentenceCase(cleanTitle));
}

function taskWorkSummary(task) {
  const fallback = titleAsAction(task.title);
  const action = compactText(task.action, '');
  if (!action) return fallback;

  let text = action
    .replace(/`[^`]+`/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const sentenceMatch = text.match(/^(.+?[.!?])(?:\s|$)/);
  text = sentenceMatch ? sentenceMatch[1] : text;
  text = text
    .split(';')[0]
    .replace(/:\s+.*$/i, '')
    .replace(/^(Create|Add|Implement|Extend|Run|Capture|Define|Wire)\b([\s\S]*?)\s+and\s+.*$/i, '$1$2')
    .replace(/\s+by\s+(adapting|copying|calling|using|patching|importing)\b.*$/i, '')
    .replace(/\s+from\s+\S+.*$/i, '')
    .replace(/\s+with\s+[`./\w-]+.*$/i, '')
    .replace(/\s+and\s+(assert|capture|patch|import|inspect|confirm)\b.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (
    text.length < 24 ||
    /^(create|add|implement|extend|run|capture|cover|define|wire)$/i.test(text) ||
    /^create\s+as\b/i.test(text)
  ) {
    return fallback;
  }
  return trimSentence(sentenceCase(text));
}

function listValue(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') {
    if (value.trim() === '[]') return [];
    return value.split(',').map(v => v.replace(/^\[|\]$/g, '').trim()).filter(Boolean);
  }
  return [];
}

function bulletList(items, fallback = 'Not specified in source plan.') {
  const clean = items.map(item => compactText(item, '')).filter(Boolean);
  if (clean.length === 0) return `- ${fallback}`;
  return clean.map(item => `- ${item}`).join('\n');
}

function markdownTable(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map(row => `| ${row.map(cell => String(cell || '').replace(/\|/g, '\\|')).join(' | ')} |`);
  return [head, sep, ...body].join('\n');
}

function mermaidLabel(value) {
  return String(value || 'unspecified')
    .replace(/\\/g, '/')
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function dependencyMermaid(keyLinks, tasks) {
  const lines = ['```mermaid', 'flowchart LR'];
  if (keyLinks.length > 0) {
    const ids = new Map();
    const idFor = (label) => {
      const key = mermaidLabel(label);
      if (!ids.has(key)) ids.set(key, `N${ids.size + 1}`);
      return ids.get(key);
    };
    for (const link of keyLinks) {
      if (!link || typeof link !== 'object') continue;
      const from = link.from || link.source || 'source plan';
      const to = link.to || link.target || 'planned artifact';
      const via = link.via || link.provides || 'feeds';
      const fromId = idFor(from);
      const toId = idFor(to);
      lines.push(`  ${fromId}["${mermaidLabel(from)}"] -->|${mermaidLabel(via)}| ${toId}["${mermaidLabel(to)}"]`);
    }
  } else if (tasks.length > 0) {
    tasks.forEach((task, index) => {
      const id = `T${index + 1}`;
      lines.push(`  ${id}["${mermaidLabel(task.title)}"]`);
      if (index > 0) lines.push(`  T${index} --> ${id}`);
    });
  } else {
    lines.push('  P["Source PLAN.md"] --> B["Human-readable brief"]');
  }
  lines.push('```');
  return lines.join('\n');
}

function makeTitle(planPath, frontmatter) {
  const planId = path.basename(planPath).replace(/-PLAN\.md$/i, '');
  const phase = frontmatter.phase ? `Phase ${frontmatter.phase}` : 'Plan';
  return `${phase} Brief: ${planId}`;
}

function generateBrief(planPath, content, opts = {}) {
  const now = opts.date || new Date().toISOString().slice(0, 10);
  const fm = extractFrontmatter(content);
  const tasks = extractTasks(content);
  const keyLinks = parseMustHavesBlock(content, 'key_links').filter(link => link && typeof link === 'object');
  const artifacts = parseMustHavesBlock(content, 'artifacts');
  const requirements = listValue(fm.requirements || fm.requirements_addressed);
  const filesModified = listValue(fm.files_modified);
  const dependencies = listValue(fm.depends_on);
  const objective = compactText(extractXmlBlock(content, 'objective'));
  const title = makeTitle(planPath, fm);
  const relSource = './' + path.basename(planPath);
  const hash = sourcePlanHash(content);

  const changes = [];
  for (const file of filesModified) changes.push(`File or area: ${file}`);
  for (const artifact of artifacts) {
    if (artifact && typeof artifact === 'object' && artifact.path) {
      changes.push(`${artifact.path}${artifact.provides ? ` - ${artifact.provides}` : ''}`);
    } else if (artifact) {
      changes.push(String(artifact));
    }
  }

  const taskRows = tasks.length > 0
    ? tasks.map(task => [task.id, cleanTaskTitle(task.title, task.id), taskWorkSummary(task)])
    : [['Not specified', 'Not specified in source plan.', 'Not specified in source plan.']];

  const sourceRows = [
    ['Source plan', path.basename(planPath)],
    ['Source hash', hash],
    ['Generator', GENERATOR_ID],
  ];
  if (requirements.length > 0) sourceRows.push(['Requirements', requirements.join(', ')]);
  if (dependencies.length > 0) sourceRows.push(['Plan dependencies', dependencies.join(', ')]);

  const lines = [
    '---',
    `title: ${yamlQuote(title)}`,
    'kind: brief',
    'status: active',
    'audience: "humans-agents"',
    'canonicality: derived',
    `created: ${now}`,
    `updated: ${now}`,
    `source_of_truth: ${yamlQuote(relSource)}`,
    `source_plan: ${yamlQuote(path.basename(planPath))}`,
    `source_plan_hash: ${yamlQuote(hash)}`,
    `brief_generator: ${yamlQuote(GENERATOR_ID)}`,
    '---',
    '',
    `# ${title}`,
    '',
    '> This is a derived, human-readable companion to the executable PLAN.md. If this brief disagrees with the source plan, the PLAN.md is authoritative.',
    '',
    '## Plain-English Goal',
    '',
    objective,
    '',
    '## What Will Change',
    '',
    bulletList(changes),
    '',
    '## Dependency Map',
    '',
    dependencyMermaid(keyLinks, tasks),
    '',
    '## Task Summary',
    '',
    markdownTable(['Task', 'Outcome', 'Plain-English Work'], taskRows),
    '',
    '## What This Does Not Do',
    '',
    '- Not specified in source plan.',
    '',
    '## Success Looks Like',
    '',
    bulletList(tasks.map(task => task.done)),
    '',
    '## Risks / Watchpoints',
    '',
    bulletList([
      dependencies.length > 0 ? `Depends on prior plan(s): ${dependencies.join(', ')}` : '',
      content.includes('<threat_model>') ? 'Source plan includes a threat model section that should be checked during execution.' : '',
      content.includes('<validation') || content.includes('<verification') ? 'Source plan includes validation expectations that should be preserved.' : '',
    ]),
    '',
    '## Source Trace',
    '',
    markdownTable(['Field', 'Value'], sourceRows),
    '',
  ];

  return normalizeMd(lines.join('\n'));
}

function readBriefFrontmatter(content) {
  const fm = extractFrontmatter(content);
  return {
    sourcePlanHash: fm.source_plan_hash || '',
    generator: fm.brief_generator || '',
  };
}

function resolvePlanFiles(cwd, target) {
  if (!target) error('plan-brief requires a *-PLAN.md path, phase directory, or phase number');

  const fullTarget = path.isAbsolute(target) ? target : path.join(cwd, target);
  if (fs.existsSync(fullTarget)) {
    const stat = fs.statSync(fullTarget);
    if (stat.isFile()) return [fullTarget];
    if (stat.isDirectory()) return listPlanFiles(fullTarget);
  }

  const phase = findPhaseInternal(cwd, target);
  if (!phase || !phase.directory) error(`Phase not found for plan-brief target: ${target}`);
  return listPlanFiles(path.join(cwd, phase.directory));
}

function listPlanFiles(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    error(`Plan brief target is not a directory: ${dir}`);
  }
  return fs.readdirSync(dir)
    .filter(name => /-PLAN\.md$/i.test(name) && !/\.pre-bounce\.md$/i.test(name))
    .sort()
    .map(name => path.join(dir, name));
}

function generatePlanBriefs(cwd, target, raw) {
  const plans = resolvePlanFiles(cwd, target);
  const briefs = plans.map(planPath => {
    const content = fs.readFileSync(planPath, 'utf-8');
    const briefPath = planBriefPathFor(planPath);
    const brief = generateBrief(planPath, content);
    atomicWriteFileSync(briefPath, brief);
    return {
      plan: toPosixPath(path.relative(cwd, planPath)),
      brief: toPosixPath(path.relative(cwd, briefPath)),
      source_plan_hash: sourcePlanHash(content),
    };
  });
  output({ generated: true, checked: false, count: briefs.length, briefs }, raw);
}

function checkPlanBriefs(cwd, target, raw) {
  const plans = resolvePlanFiles(cwd, target);
  const briefs = plans.map(planPath => {
    const content = fs.readFileSync(planPath, 'utf-8');
    const briefPath = planBriefPathFor(planPath);
    const expectedHash = sourcePlanHash(content);
    const exists = fs.existsSync(briefPath);
    const actual = exists ? readBriefFrontmatter(fs.readFileSync(briefPath, 'utf-8')) : { sourcePlanHash: '', generator: '' };
    const hashMismatch = actual.sourcePlanHash !== expectedHash;
    const generatorMismatch = actual.generator !== GENERATOR_ID;
    const stale = !exists || hashMismatch || generatorMismatch;
    return {
      plan: toPosixPath(path.relative(cwd, planPath)),
      brief: toPosixPath(path.relative(cwd, briefPath)),
      exists,
      stale,
      generator_mismatch: generatorMismatch,
      expected_hash: expectedHash,
      actual_hash: actual.sourcePlanHash,
      expected_generator: GENERATOR_ID,
      actual_generator: actual.generator,
    };
  });
  const missingCount = briefs.filter(item => !item.exists).length;
  const staleCount = briefs.filter(item => item.stale).length;
  output({
    generated: false,
    checked: true,
    passed: missingCount === 0 && staleCount === 0,
    count: briefs.length,
    missing_count: missingCount,
    stale_count: staleCount,
    briefs,
  }, raw);
}

function cmdPlanBrief(cwd, args, raw) {
  const check = args.includes('--check');
  const target = args.slice(1).filter(arg => arg !== '--check')[0];
  if (check) {
    checkPlanBriefs(cwd, target, raw);
  } else {
    generatePlanBriefs(cwd, target, raw);
  }
}

module.exports = {
  GENERATOR_ID,
  cmdPlanBrief,
  generateBrief,
  normalizeForHash,
  planBriefPathFor,
  sourcePlanHash,
  taskWorkSummary,
};
