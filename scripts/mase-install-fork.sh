#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/mase-install-fork.sh [--runtime codex] [--local --target PATH | --global] [extra installer args...]

Install GSD from Mase's checked-out fork branch instead of the public npm package.

Examples:
  scripts/mase-install-fork.sh --runtime codex --local --target /path/to/project
  scripts/mase-install-fork.sh --runtime codex --global --minimal

Notes:
  - Local installs target the current working directory of the installer, so this
    wrapper runs the installer from --target.
  - The wrapper refuses to install from main unless GSD_ALLOW_MAIN_INSTALL=1 is set.
EOF
}

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
runtime="codex"
scope=""
target=""
config_dir=""
extra_args=()

while [ "$#" -gt 0 ]; do
  case "$1" in
    --runtime)
      runtime="${2:-}"
      if [ -z "$runtime" ]; then
        echo "Missing value for --runtime" >&2
        exit 2
      fi
      shift 2
      ;;
    --local)
      scope="local"
      shift
      ;;
    --global)
      scope="global"
      shift
      ;;
    --target)
      target="${2:-}"
      if [ -z "$target" ]; then
        echo "Missing value for --target" >&2
        exit 2
      fi
      shift 2
      ;;
    --config-dir|-c)
      config_dir="${2:-}"
      if [ -z "$config_dir" ]; then
        echo "Missing value for $1" >&2
        exit 2
      fi
      extra_args+=("$1" "$2")
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      extra_args+=("$1")
      shift
      ;;
  esac
done

if [ -z "$scope" ]; then
  echo "Choose --local or --global." >&2
  usage >&2
  exit 2
fi

if [ "$scope" = "local" ] && [ -z "$target" ]; then
  echo "Local fork installs require --target PATH." >&2
  exit 2
fi

if [ "$scope" = "global" ] && [ -n "$target" ]; then
  echo "--target is only valid with --local." >&2
  exit 2
fi

runtime_dir_name() {
  case "$1" in
    copilot) echo ".github" ;;
    opencode) echo ".opencode" ;;
    gemini) echo ".gemini" ;;
    kilo) echo ".kilo" ;;
    codex) echo ".codex" ;;
    antigravity) echo ".agent" ;;
    cursor) echo ".cursor" ;;
    windsurf) echo ".windsurf" ;;
    augment) echo ".augment" ;;
    trae) echo ".trae" ;;
    qwen) echo ".qwen" ;;
    hermes) echo ".hermes" ;;
    codebuddy) echo ".codebuddy" ;;
    cline) echo ".cline" ;;
    *) echo ".claude" ;;
  esac
}

global_runtime_dir() {
  if [ -n "$config_dir" ]; then
    case "$config_dir" in
      ~/*) printf '%s/%s\n' "$HOME" "${config_dir#~/}" ;;
      *) printf '%s\n' "$config_dir" ;;
    esac
    return
  fi

  case "$1" in
    opencode) printf '%s\n' "${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}" ;;
    kilo) printf '%s\n' "${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}" ;;
    gemini) printf '%s\n' "${GEMINI_CONFIG_DIR:-$HOME/.gemini}" ;;
    codex) printf '%s\n' "${CODEX_HOME:-$HOME/.codex}" ;;
    copilot) printf '%s\n' "${COPILOT_CONFIG_DIR:-$HOME/.copilot}" ;;
    antigravity) printf '%s\n' "${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}" ;;
    cursor) printf '%s\n' "${CURSOR_CONFIG_DIR:-$HOME/.cursor}" ;;
    windsurf) printf '%s\n' "${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}" ;;
    augment) printf '%s\n' "${AUGMENT_CONFIG_DIR:-$HOME/.augment}" ;;
    trae) printf '%s\n' "${TRAE_CONFIG_DIR:-$HOME/.trae}" ;;
    qwen) printf '%s\n' "${QWEN_CONFIG_DIR:-$HOME/.qwen}" ;;
    hermes) printf '%s\n' "${HERMES_HOME:-$HOME/.hermes}" ;;
    codebuddy) printf '%s\n' "${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}" ;;
    cline) printf '%s\n' "${CLINE_CONFIG_DIR:-$HOME/.cline}" ;;
    *) printf '%s\n' "${CLAUDE_CONFIG_DIR:-$HOME/.claude}" ;;
  esac
}

install_config_dir() {
  if [ "$scope" = "local" ]; then
    if [ "$runtime" = "cline" ]; then
      printf '%s\n' "$(cd "$target" && pwd -P)"
    else
      printf '%s/%s\n' "$(cd "$target" && pwd -P)" "$(runtime_dir_name "$runtime")"
    fi
  else
    global_runtime_dir "$runtime"
  fi
}

has_arg() {
  local needle="$1"
  shift
  for arg in "$@"; do
    if [ "$arg" = "$needle" ]; then
      return 0
    fi
  done
  return 1
}

write_marker() {
  local runtime_config_dir="$1"
  local mode="$2"
  local target_path="$3"
  local branch_name="$4"
  local commit_sha="$5"
  local installed_at
  installed_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  mkdir -p "$runtime_config_dir"
  node - "$runtime_config_dir/mase-fork-install.json" "$repo_root" "$branch_name" "$commit_sha" "$runtime" "$scope" "$target_path" "$mode" "$installed_at" <<'JSEOF'
const fs = require('node:fs');
const path = require('node:path');
const [,, markerPath, forkPath, branch, commit, runtime, scope, targetPath, mode, installedAt] = process.argv;
const data = {
  schema_version: 1,
  source: 'mase-fork',
  fork_path: forkPath,
  branch,
  commit,
  runtime,
  scope,
  target_path: targetPath,
  config_dir: path.dirname(markerPath),
  mode,
  installed_at: installedAt,
  installer: 'scripts/mase-install-fork.sh',
};
fs.writeFileSync(markerPath, JSON.stringify(data, null, 2) + '\n');
JSEOF
  echo "Wrote Mase fork install marker: $runtime_config_dir/mase-fork-install.json"
}

remove_marker() {
  local runtime_config_dir="$1"
  local marker="$runtime_config_dir/mase-fork-install.json"
  if [ -f "$marker" ]; then
    rm -f "$marker"
    echo "Removed Mase fork install marker: $marker"
  fi
}

branch="$(git -C "$repo_root" branch --show-current)"
if [ "$branch" = "main" ] && [ "${GSD_ALLOW_MAIN_INSTALL:-}" != "1" ]; then
  echo "Refusing to install from main; main is the clean upstream mirror." >&2
  echo "Checkout mase/local-fixes, or set GSD_ALLOW_MAIN_INSTALL=1 intentionally." >&2
  exit 1
fi

if [ -n "$(git -C "$repo_root" status --porcelain)" ]; then
  echo "Refusing to install from a dirty fork checkout." >&2
  echo "Commit or stash changes first so installed files map to a known branch state." >&2
  exit 1
fi

runtime_flag="--$runtime"
if [ "$scope" = "local" ]; then
  mkdir -p "$target"
fi
runtime_config_dir="$(install_config_dir)"
commit_sha="$(git -C "$repo_root" rev-parse HEAD)"
mode="full"
if has_arg "--minimal" "${extra_args[@]}" || has_arg "--core-only" "${extra_args[@]}"; then
  mode="minimal"
fi
target_path="$runtime_config_dir"
if [ "$scope" = "local" ]; then
  target_path="$(cd "$target" && pwd -P)"
fi

echo "Building hook assets from $repo_root"
(cd "$repo_root" && npm run build:hooks)

if [ "$scope" = "local" ]; then
  echo "Installing Mase fork branch '$branch' into $target for runtime '$runtime'"
  (cd "$target" && node "$repo_root/bin/install.js" "$runtime_flag" --local "${extra_args[@]}")
else
  echo "Installing Mase fork branch '$branch' globally for runtime '$runtime'"
  node "$repo_root/bin/install.js" "$runtime_flag" --global "${extra_args[@]}"
fi

if has_arg "--uninstall" "${extra_args[@]}" || has_arg "-u" "${extra_args[@]}"; then
  remove_marker "$runtime_config_dir"
else
  write_marker "$runtime_config_dir" "$mode" "$target_path" "$branch" "$commit_sha"
fi
