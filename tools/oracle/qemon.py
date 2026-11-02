"""Minimal client for QEMU's human monitor (HMP) over a unix socket.

It sends keys to the guest and reads the VGA text screen (B800:0000), which is
how the oracle drives MSX88 without a display.
"""
import re
import socket
import time

PROMPT = b'(qemu) '

# Characters to QEMU `sendkey` names (US layout).
_SHIFTED = {
    '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6', '&': '7', '*': '8',
    '(': '9', ')': '0', '_': 'minus', '+': 'equal', '{': 'bracket_left',
    '}': 'bracket_right', ':': 'semicolon', '"': 'apostrophe', '<': 'comma',
    '>': 'dot', '?': 'slash', '|': 'backslash', '~': 'grave_accent',
}
_PLAIN = {
    ' ': 'spc', '-': 'minus', '=': 'equal', '[': 'bracket_left', ']': 'bracket_right',
    ';': 'semicolon', "'": 'apostrophe', ',': 'comma', '.': 'dot', '/': 'slash',
    '\\': 'backslash', '`': 'grave_accent', '\n': 'ret', '\r': 'ret', '\t': 'tab',
}


def key_name(ch):
    if ch.isalpha():
        return f'shift-{ch.lower()}' if ch.isupper() else ch
    if ch.isdigit():
        return ch
    if ch in _PLAIN:
        return _PLAIN[ch]
    if ch in _SHIFTED:
        return f'shift-{_SHIFTED[ch]}'
    raise ValueError(f'no key for {ch!r}')


class Monitor:
    def __init__(self, path, timeout=30):
        deadline = time.time() + timeout
        while True:
            try:
                self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                self.sock.connect(path)
                break
            except OSError:
                if time.time() > deadline:
                    raise
                time.sleep(0.2)
        self.sock.settimeout(30)
        self._read_until_prompt()

    def _read_until_prompt(self):
        data = b''
        while not data.endswith(PROMPT):
            chunk = self.sock.recv(65536)
            if not chunk:
                raise EOFError('monitor closed')
            data += chunk
        return data

    def cmd(self, line):
        self.sock.sendall(line.encode() + b'\n')
        out = self._read_until_prompt().decode('latin-1')
        # Strip the echoed command line and terminal escapes.
        out = re.sub(r'\x1b\[[0-9;]*[A-Za-z]', '', out)
        return out[: -len(PROMPT)].split('\r\n', 1)[-1] if '\r\n' in out else ''

    def key(self, name, hold_ms=40):
        self.cmd(f'sendkey {name} {hold_ms}')
        time.sleep(0.06)

    def type(self, text, delay=0.03):
        for ch in text:
            self.key(key_name(ch))
            time.sleep(delay)

    def read_phys(self, address, length):
        """Reads guest physical memory with `xp` (bytes)."""
        result = bytearray()
        while len(result) < length:
            n = min(4096, length - len(result))
            out = self.cmd(f'xp /{n}bx {address + len(result):#x}')
            for line in out.splitlines():
                if ':' not in line:
                    continue
                result.extend(int(v, 16) for v in line.split(':', 1)[1].split())
        return bytes(result[:length])

    def screen(self, cols=80, rows=25):
        """The text screen as a list of strings (CP437 decoded)."""
        raw = self.read_phys(0xB8000, cols * rows * 2)
        chars = bytes(raw[0::2])
        text = chars.decode('cp437')
        return [text[r * cols:(r + 1) * cols] for r in range(rows)]

    def close(self):
        self.sock.close()
