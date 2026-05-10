#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/mase-gsd-install-inventory.sh [--root PATH ...] [--runtime codex|claude|all] [--json]

Find local/global GSD installs and classify Mase fork-managed installs.

Defaults:
  --runtime all
  roots: ~/.codex, ~/.claude, /Users/mase/Codebase when present
EOF
}

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
json=false
runtime_filter="all"
roots=()

while [ "$#" -gt 0 ]; do
  case "$1" in
    --root)
      roots+=("${2:-}")
      if [ -z "${2:-}" ]; then
        echo "Missing value for --root" >&2
        exit 2
      fi
      shift 2
      ;;
    --runtime)
      runtime_filter="${2:-}"
      if [ -z "$runtime_filter" ]; then
        echo "Missing value for --runtime" >&2
        exit 2
      fi
      shift 2
      ;;
    --json)
      json=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [ "${#roots[@]}" -eq 0 ]; then
  [ -d "$HOME/.codex" ] && roots+=("$HOME/.codex")
  [ -d "$HOME/.claude" ] && roots+=("$HOME/.claude")
  [ -d "/Users/mase/Codebase" ] && roots+=("/Users/mase/Codebase")
fi

node - "$repo_root" "$runtime_filter" "$json" "${roots[@]}" <<'JSEOF'
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const [, , repoRoot, runtimeFilter, jsonFlag, ...roots] = process.argv;
const agentsRouting = require(path.join(repoRoot, 'scripts', 'mase-gsd-agents-routing.cjs'));
const emitJson = jsonFlag === 'true';
const skipNames = new Set(['.git', 'node_modules', '.next', 'dist', 'build', '.cache', 'coverage', 'vendor', '.venv', 'venv']);
const runtimeByDir = new Map([
  ['.codex', 'codex'],
  ['.claude', 'claude'],
]);

function real(p) {
  return path.resolve(p);
}

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    return { __read_error: err.message };
  }
}

function run(args, cwd) {
  try {
    return cp.execFileSync(args[0], args.slice(1), {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function branchTip(forkPath) {
  return run(['git', '-C', forkPath, 'rev-parse', 'refs/heads/mase/local-fixes']) || '';
}

function gitStatus(targetPath) {
  const isGit = run(['git', '-C', targetPath, 'rev-parse', '--is-inside-work-tree']);
  if (isGit !== 'true') return 'not_git';
  const status = run(['git', '-C', targetPath, 'status', '--short']);
  return status ? 'dirty' : 'clean';
}

function hasGsdPayload(configDir) {
  if (exists(path.join(configDir, 'get-shit-done', 'VERSION'))) return true;
  const skillsDir = path.join(configDir, 'skills');
  try {
    return fs.readdirSync(skillsDir, { withFileTypes: true })
      .some((entry) => entry.isDirectory() && entry.name.startsWith('gsd-') && exists(path.join(skillsDir, entry.name, 'SKILL.md')));
  } catch {
    return false;
  }
}

function isGlobalConfig(configDir, runtime) {
  const home = process.env.HOME || '';
  const resolved = real(configDir);
  const globalCandidates = runtime === 'codex'
    ? [process.env.CODEX_HOME || path.join(home, '.codex')]
    : [process.env.CLAUDE_CONFIG_DIR || path.join(home, '.claude')];
  return globalCandidates.map(real).includes(resolved);
}

function collectConfigDirs(root, out, seen) {
  if (!exists(root)) return;
  const resolved = real(root);
  const base = path.basename(resolved);
  if (runtimeByDir.has(base)) {
    const runtime = runtimeByDir.get(base);
    if (runtimeFilter === 'all' || runtimeFilter === runtime) {
      if (!seen.has(resolved)) {
        seen.add(resolved);
        out.push({ configDir: resolved, runtime });
      }
    }
    return;
  }

  let entries;
  try {
    entries = fs.readdirSync(resolved, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (skipNames.has(entry.name)) continue;
    collectConfigDirs(path.join(resolved, entry.name), out, seen);
  }
}

const seen = new Set();
const configDirs = [];
for (const root of roots) collectConfigDirs(root, configDirs, seen);

const rows = [];
for (const { configDir, runtime } of configDirs) {
  const markerPath = path.join(configDir, 'mase-fork-install.json');
  const markerExists = exists(markerPath);
  const payload = hasGsdPayload(configDir);
  if (!markerExists && !payload) continue;

  const marker = markerExists ? readJson(markerPath) : null;
  const source = marker && !marker.__read_error ? marker.source || 'unknown' : markerExists ? 'broken-marker' : 'unknown';
  const forkPath = marker && marker.fork_path ? marker.fork_path : repoRoot;
  const currentForkCommit = branchTip(forkPath);
  const installedCommit = marker && marker.commit ? marker.commit : '';
  const scope = marker && marker.scope ? marker.scope : isGlobalConfig(configDir, runtime) ? 'global' : 'local';
  const targetPath = marker && marker.target_path
    ? marker.target_path
    : scope === 'local'
      ? path.dirname(configDir)
      : configDir;
  const targetGitStatus = scope === 'local' ? gitStatus(targetPath) : 'not_git';
  let status = 'unknown';
  let reason = 'GSD files found without Mase fork marker';

  if (markerExists && marker && marker.__read_error) {
    status = 'broken';
    reason = `marker unreadable: ${marker.__read_error}`;
  } else if (markerExists && !payload) {
    status = 'broken';
    reason = 'marker exists but no GSD payload was found';
  } else if (source === 'mase-fork') {
    if (!installedCommit || !currentForkCommit) {
      status = 'unknown';
      reason = 'missing installed or current fork commit';
    } else if (installedCommit === currentForkCommit || currentForkCommit.startsWith(installedCommit) || installedCommit.startsWith(currentForkCommit)) {
      status = 'current';
      reason = 'installed commit matches mase/local-fixes';
    } else {
      status = 'stale';
      reason = 'installed commit differs from mase/local-fixes';
    }
  }

  rows.push({
    target_path: targetPath,
    runtime,
    scope,
    install_dir: configDir,
    marker_path: markerPath,
    source,
    mode: marker && marker.mode ? marker.mode : 'unknown',
    installed_commit: installedCommit,
    current_fork_commit: currentForkCommit,
    status,
    target_git_status: targetGitStatus,
    reason,
    ...agentsRoutingFields({ runtime, scope, targetPath, targetGitStatus }),
  });
}

function agentsRoutingFields({ runtime, scope, targetPath, targetGitStatus }) {
  if (runtime !== 'codex' || scope !== 'local') return {};
  if (targetGitStatus === 'dirty') {
    const status = agentsRouting.inspect(targetPath);
    return {
      agents_routing_status: 'blocked_dirty_target',
      agents_routing_evidence: [
        ...status.evidence,
        'target_git_status:dirty',
      ],
      agents_routing_data: status.data,
    };
  }
  const status = agentsRouting.inspect(targetPath);
  return {
    agents_routing_status: status.status,
    agents_routing_evidence: status.evidence,
    agents_routing_data: status.data,
  };
}

rows.sort((a, b) => a.install_dir.localeCompare(b.install_dir));

if (emitJson) {
  process.stdout.write(JSON.stringify({
    scanned_roots: roots.map(real),
    scanned_runtimes: runtimeFilter === 'all' ? ['codex', 'claude'] : [runtimeFilter],
    installs: rows,
  }, null, 2) + '\n');
} else {
  process.stdout.write(`Scanned roots: ${roots.map(real).join(', ')}\n`);
  process.stdout.write(`Scanned runtimes: ${runtimeFilter === 'all' ? 'codex, claude' : runtimeFilter}\n\n`);
  if (rows.length === 0) {
    process.stdout.write('No GSD installs found.\n');
  } else {
    for (const row of rows) {
      process.stdout.write([
        row.status.padEnd(8),
        row.runtime.padEnd(6),
        row.scope.padEnd(6),
        row.mode.padEnd(7),
        row.target_git_status.padEnd(7),
        row.install_dir,
      ].join('  ') + `\n  ${row.reason}\n`);
    }
  }
}
JSEOF
