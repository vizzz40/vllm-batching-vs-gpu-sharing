#!/usr/bin/env bash
# Run the k6 concurrency sweep against one vLLM server and save one JSON summary per level.
# Usage:   loadtest/run-sweep.sh PREFIX [VUs ...]
# Example: loadtest/run-sweep.sh knee 64 128 256
# Writes loadtest/results/PREFIX-vusN.json. Pick a new PREFIX: an existing one is overwritten.
# Set URL=... to target another server (default: http://localhost:8000/v1/chat/completions).
set -euo pipefail

prefix="${1:?usage: run-sweep.sh PREFIX [VUs ...]}"
shift
levels="${*:-1 2 4 8 16 32 64}"
dir="$(dirname "$0")"

for v in $levels; do
  echo "== $v VUs"
  k6 run -e VUS="$v" ${URL:+-e URL="$URL"} --summary-trend-stats "med,p(95),p(99)" \
    --summary-export "$dir/results/$prefix-vus$v.json" "$dir/sweep.js"
done
