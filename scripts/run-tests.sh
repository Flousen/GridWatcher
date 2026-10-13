#!/usr/bin/env bash
# Run the unit tests in the terminal with gjs (GNOME's JavaScript shell).
# No gjs? Open tests.html in any browser instead.
set -euo pipefail
cd "$(dirname "$0")/.."
exec gjs tests/run-cli.js
