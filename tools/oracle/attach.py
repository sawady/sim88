"""Helpers to poke an oracle started with `run.sh --interactive` from the host.

    python3 tools/oracle/attach.py 'T:msx88\\n' S:5 K:esc SHOT:/tmp/x.ppm

T:text types, K:name presses a key, S:secs sleeps, SHOT:path saves a
screendump (path as seen by the container: /cache/...), TEXT prints the DOS
text screen.
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qemon import Monitor  # noqa: E402

CACHE = os.environ.get('SIM88_ORACLE_CACHE', os.path.expanduser('~/.cache/sim88-oracle'))

m = Monitor(os.path.join(CACHE, 'run', 'mon.sock'))
for arg in sys.argv[1:]:
    kind, _, value = arg.partition(':')
    if kind == 'T':
        m.type(value.encode().decode('unicode_escape'))
    elif kind == 'K':
        m.key(value)
    elif kind == 'S':
        time.sleep(float(value))
    elif kind == 'SHOT':
        print(m.cmd(f'screendump "{value}"'))
    elif kind == 'TEXT':
        print('\n'.join(l.rstrip() for l in m.screen()))
    elif kind == 'CMD':
        print(m.cmd(value))
