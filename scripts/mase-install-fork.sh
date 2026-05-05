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

echo "Building hook assets from $repo_root"
(cd "$repo_root" && npm run build:hooks)

if [ "$scope" = "local" ]; then
  mkdir -p "$target"
  echo "Installing Mase fork branch '$branch' into $target for runtime '$runtime'"
  (cd "$target" && node "$repo_root/bin/install.js" "$runtime_flag" --local "${extra_args[@]}")
else
  echo "Installing Mase fork branch '$branch' globally for runtime '$runtime'"
  node "$repo_root/bin/install.js" "$runtime_flag" --global "${extra_args[@]}"
fi
