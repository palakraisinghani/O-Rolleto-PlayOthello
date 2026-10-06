#!/usr/bin/env bash
# Launch Othello Player in development mode:  bash launch.sh
# (--check only verifies the prerequisites and exits.)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Pick up toolchains installed by rustup and nvm, which only add themselves to
# interactive shells' PATH.
[ -d "$HOME/.cargo/bin" ] && export PATH="$HOME/.cargo/bin:$PATH"
if ! command -v node >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh"
fi

missing=0
need() { # need <command> <how to get it>
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing: $1. $2" >&2
    missing=1
  fi
}
need cargo "Install Rust: https://rustup.rs"
need node "Install Node.js (an LTS release), e.g. with nvm: https://github.com/nvm-sh/nvm"
need npm "It comes with Node.js."
[ "$missing" -eq 0 ] || exit 1

if [ "${1:-}" = "--check" ]; then
  echo "OK: cargo $(cargo --version | cut -d' ' -f2), node $(node --version), npm $(npm --version)"
  exit 0
fi

if [ ! -d "$ROOT/ui/node_modules" ]; then
  echo "Installing UI dependencies (first run)..."
  (cd "$ROOT/ui" && npm install)
fi

# The first launch compiles the Rust side and takes a minute or two.
cd "$ROOT/app"
exec npx --prefix ../ui tauri dev
