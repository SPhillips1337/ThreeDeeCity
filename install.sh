#!/usr/bin/env bash
set -euo pipefail

REPO_OWNER="SPhillips1337"
REPO_NAME="ThreeDeeCity"
REPO_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}.git"
DEFAULT_TARGET_DIR="${REPO_NAME}"

usage() {
  cat <<'USAGE'
Usage: ./install.sh [target-directory]

Installs ThreeDeeCity dependencies for local development. If run outside a
ThreeDeeCity checkout, the script clones https://github.com/SPhillips1337/ThreeDeeCity.git
into the specified target directory (default: ./ThreeDeeCity) before installing.

Environment variables:
  THREEDEECITY_SKIP_INSTALL=1   Validate only; skip npm dependency installation.
USAGE
}

log() {
  printf '[ThreeDeeCity install] %s\n' "$*"
}

fail() {
  printf '[ThreeDeeCity install] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command '$1' was not found in PATH."
}

normalize_git_url() {
  printf '%s' "$1" \
    | sed -E 's#^git@github.com:#https://github.com/#; s#^git\+##; s#\.git$##; s#/$##'
}

is_threedeecity_checkout() {
  [ -f "package.json" ] || return 1
  [ -f "index.html" ] || return 1
  [ -f "main.js" ] || return 1
  [ -d "src" ] || return 1
  grep -Eq '"name"[[:space:]]*:[[:space:]]*"three-dee-city"' package.json || return 1
  grep -Eq '"vite"[[:space:]]*:' package.json || return 1
}

validate_existing_checkout() {
  [ -d ".git" ] || fail "Existing directory '$PWD' is not a git checkout; refusing to install dependencies without repository identity validation."

  local origin=""
  origin="$(git remote get-url origin 2>/dev/null || true)"
  [ -n "$origin" ] || fail "Existing git checkout has no origin remote; refusing to install dependencies without repository identity validation."

  local normalized expected
  normalized="$(normalize_git_url "$origin")"
  expected="$(normalize_git_url "$REPO_URL")"
  [ "$normalized" = "$expected" ] || fail "Existing git checkout origin '$origin' does not match $REPO_URL."

  is_threedeecity_checkout || fail "Directory '$PWD' does not look like a ThreeDeeCity checkout; refusing to install here."
}

install_dependencies() {
  require_cmd npm
  local npm_version
  npm_version="$(npm --version)"
  log "Using npm ${npm_version}."

  if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then
    log "Lockfile found; running npm ci."
    npm ci
  else
    log "No npm lockfile found; running npm install."
    npm install
  fi
}

main() {
  if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
    usage
    exit 0
  fi

  require_cmd git
  require_cmd grep
  require_cmd sed

  local target_dir="${1:-$DEFAULT_TARGET_DIR}"

  if is_threedeecity_checkout; then
    log "Existing checkout detected in $PWD."
    validate_existing_checkout
  else
    if [ -e "$target_dir" ]; then
      [ -d "$target_dir" ] || fail "Target '$target_dir' exists and is not a directory."
      cd "$target_dir"
      validate_existing_checkout
    else
      log "Cloning ${REPO_URL} into ${target_dir}."
      git clone -- "$REPO_URL" "$target_dir"
      cd "$target_dir"
      validate_existing_checkout
    fi
  fi

  if [ "${THREEDEECITY_SKIP_INSTALL:-0}" = "1" ]; then
    log "THREEDEECITY_SKIP_INSTALL=1; skipping dependency installation."
  else
    install_dependencies
  fi

  log "Installation complete. Start the dev server with: npm run dev"
}

main "$@"
