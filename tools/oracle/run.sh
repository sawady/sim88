#!/bin/sh
# Runs the fidelity corpus on the original MSX88 (see README.md).
#
#   tools/oracle/run.sh [PROGRAM_NAME ...]
#
# Programs: tests/fidelity/programs/*.asm. Results (golden files):
# tests/fidelity/golden/. The MSX88 and FreeDOS downloads and the disk image
# are cached in ${SIM88_ORACLE_CACHE:-~/.cache/sim88-oracle}, outside the repo.
set -eu
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
CACHE=${SIM88_ORACLE_CACHE:-$HOME/.cache/sim88-oracle}
PROGRAMS=${SIM88_ORACLE_PROGRAMS:-$ROOT/tests/fidelity/programs}
OUT=${SIM88_ORACLE_OUT:-$ROOT/tests/fidelity/golden}
IMAGE=sim88-oracle:1
mkdir -p "$CACHE" "$OUT"
docker build -q -t "$IMAGE" "$ROOT/tools/oracle" >/dev/null
ONLY=""
EXTRA=""
case "${1:-}" in --interactive|--reparse) EXTRA="$1"; shift;; esac
[ $# -gt 0 ] && ONLY="--only $*"
exec docker run --rm --name "sim88-oracle-$$" \
  -u "$(id -u):$(id -g)" \
  -v "$ROOT/tools/oracle:/oracle:ro" \
  -v "$PROGRAMS:/programs:ro" \
  -v "$CACHE:/cache" \
  ${SIM88_ORACLE_CONTAINER_ARGS:-} \
  -v "$OUT:/out" \
  "$IMAGE" python3 /oracle/oracle.py --programs /programs --out /out $ONLY $EXTRA
