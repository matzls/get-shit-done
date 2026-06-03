#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/mase-gsd-propagate.sh [--dry-run|--apply] [--root PATH ...] [--runtime codex|claude|all] [--target PATH] [--include-global] [--include-unknown] [--json]

Propagate Mase's checked-out GSD fork to discovered fork-managed installs.

Defaults:
  --dry-run
  --runtime all
  skip global installs
  skip unknown-source installs
  skip dirty target repos
EOF
}

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mode="dry-run"
runtime_filter="all"
include_global=false
include_unknown=false
json=false
target_filter=""
roots=()

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)
      mode="dry-run"
      shift
      ;;
    --apply)
      mode="apply"
      shift
      ;;
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
    --target)
      target_filter="${2:-}"
      if [ -z "$target_filter" ]; then
        echo "Missing value for --target" >&2
        exit 2
      fi
      shift 2
      ;;
    --include-global)
      include_global=true
      shift
      ;;
    --include-unknown)
      include_unknown=true
      shift
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

inventory_args=(--runtime "$runtime_filter" --json)
if [ "${#roots[@]}" -gt 0 ]; then
  for root in "${roots[@]}"; do
    inventory_args+=(--root "$root")
  done
fi

inventory_json="$("$repo_root/scripts/mase-gsd-install-inventory.sh" "${inventory_args[@]}")"

node - "$repo_root" "$mode" "$include_global" "$include_unknown" "$json" "$target_filter" "$inventory_json" <<'JSEOF'
const cp = require('node:child_process');
const path = require('node:path');

const [, , repoRoot, mode, includeGlobalRaw, includeUnknownRaw, jsonRaw, targetFilterRaw, inventoryRaw] = process.argv;
const includeGlobal = includeGlobalRaw === 'true';
const includeUnknown = includeUnknownRaw === 'true';
const emitJson = jsonRaw === 'true';
const targetFilter = targetFilterRaw ? path.resolve(targetFilterRaw) : '';
const inventory = JSON.parse(inventoryRaw);

function commandFor(row) {
  const args = [path.join(repoRoot, 'scripts', 'mase-install-fork.sh'), '--runtime', row.runtime];
  if (row.scope === 'global') {
    args.push('--global');
  } else {
    args.push('--local', '--target', row.target_path);
  }
  if (row.profile && row.profile !== 'full') {
    if (row.profile === 'mase-minimal') {
      args.push('--minimal');
    } else {
      args.push(`--profile=${row.profile}`);
    }
  } else if (row.mode === 'minimal') {
    args.push('--minimal');
  }
  return args;
}

function shellQuote(s) {
  if (/^[A-Za-z0-9_./:=@+-]+$/.test(s)) return s;
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

const decisions = [];
for (const row of inventory.installs) {
  const resolvedTarget = path.resolve(row.target_path);
  const selectedByStatus = row.status === 'stale' && row.source === 'mase-fork';
  const selectedUnknown = includeUnknown && row.source === 'unknown';
  const selectedByTarget = targetFilter && (resolvedTarget === targetFilter || path.resolve(row.install_dir) === targetFilter);
  const selected = selectedByTarget || selectedByStatus || selectedUnknown;
  let action = selected ? 'would_update' : 'skip';
  let reason = row.reason;

  if (!selected) {
    reason = 'not selected';
  } else if (row.scope === 'global' && !includeGlobal) {
    action = 'skip';
    reason = 'global install skipped; pass --include-global to update';
  } else if (row.target_git_status === 'dirty') {
    action = 'skip';
    reason = 'target git repo is dirty';
  } else if (row.source === 'unknown' && !includeUnknown) {
    action = 'skip';
    reason = 'unknown-source install skipped; pass --include-unknown to update';
  }

  const args = action === 'would_update' ? commandFor(row) : [];
  decisions.push({
    action: mode === 'apply' && action === 'would_update' ? 'updated' : action,
    reason,
    row,
    command: args.length ? args.map(shellQuote).join(' ') : '',
    args,
  });
}

if (mode === 'apply') {
  for (const decision of decisions) {
    if (decision.action !== 'updated') continue;
    const [cmd, ...args] = decision.args;
    try {
      cp.execFileSync(cmd, args, { stdio: 'inherit' });
    } catch (err) {
      decision.action = 'failed';
      decision.reason = `wrapper failed with exit ${err.status ?? 'unknown'}`;
      process.exitCode = 1;
      break;
    }
  }
}

if (emitJson) {
  process.stdout.write(JSON.stringify({ mode, decisions }, null, 2) + '\n');
} else {
  process.stdout.write(`Mode: ${mode}\n`);
  for (const decision of decisions) {
    process.stdout.write(`${decision.action}: ${decision.row.install_dir}\n  ${decision.reason}\n`);
    if (decision.command) process.stdout.write(`  ${decision.command}\n`);
  }
}
JSEOF
