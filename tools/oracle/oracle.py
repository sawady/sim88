"""Runs the fidelity corpus on the original MSX88 / ASM88 / LINK88.

Runs inside the oracle container (see Dockerfile and run.sh):

    python3 oracle.py --programs DIR --out DIR [--only NAME ...]

Steps:
1. Downloads MSX88Portable.zip (the package the UNLP courses distribute, from
   vonsim.github.io) and FreeDOS 1.3 Lite to the cache, checks their SHA-256
   and builds a FreeDOS disk image with ASM88, LINK88 and MSX88.
2. Copies the corpus to the image and boots it in QEMU. A batch file
   assembles and links every program (ASM88 and LINK88 read their answers
   from stdin).
3. Drives MSX88 through QEMU's monitor: types the monitor commands (C, L, G,
   ...), reads the CPU state from MSX88's own memory (pmemsave) and the
   command window from a screendump.
4. Writes, per program, `<name>.lst` (ASM88's listing, verbatim) and
   `<name>.json` (assembler summary, parsed listing and the state after
   running) to the output directory.
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qemon import Monitor, key_name  # noqa: E402
import screen  # noqa: E402

CACHE = os.environ.get('ORACLE_CACHE', '/cache')

ASSETS = {
    'msx88': {
        'url': 'https://vonsim.github.io/msx88/MSX88Portable.zip',
        'sha256': '94b2ba995a5dd1772fa6826c263490940289b2a4a2c36906fed7bf3dfb76d406',
        'file': 'MSX88Portable.zip',
    },
    'freedos': {
        'url': 'https://www.ibiblio.org/pub/micro/pc-stuff/freedos/files/distributions/1.3/official/FD13-LiteUSB.zip',
        'sha256': '64a934585087ccd91a18c55e20ee01f5f6762be712eeaa5f456be543778f9f7e',
        'file': 'FD13-LiteUSB.zip',
    },
}

# SHA-256 of the executables inside MSX88Portable.zip (MSX88 V-3.1).
TOOLS = {
    'MSX88.EXE': '8c671c7b60e61b9933495a1bdaa5b03c5da37a8df3196ce7d93d0ef41b5ef36c',
    'ASM88.EXE': 'e21330e39fbb3cf044678cfcc725a479797e9c1192919cd50cdcf3c9dd823b84',
    'LINK88.EXE': '638cfb08c658b9a1bb10bc8b8c7fce19bcde0b4b49aa1161cd3cefeb8b5e7955',
}

PARTITION = '@@32256'  # offset of the FAT partition in FD13LITE.img

FDAUTO = '@echo off\r\nSET DOSDIR=\\FREEDOS\r\nSET PATH=%dosdir%\\BIN\r\nPROMPT $P$G\r\nif exist C:\\RUN.BAT call C:\\RUN.BAT\r\n'
FDCONFIG = 'FILES=40\r\nBUFFERS=20\r\nLASTDRIVE=Z\r\nSHELL=\\FREEDOS\\BIN\\COMMAND.COM \\FREEDOS\\BIN /E:2048 /P=\\FDAUTO.BAT\r\n'

READY = 'ORACLE-READY'


def log(*args):
    print(*args, file=sys.stderr, flush=True)


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def mtools(*args):
    env = dict(os.environ, MTOOLS_SKIP_CHECK='1')
    subprocess.run(args, check=True, env=env, stdout=subprocess.DEVNULL)


# ---------------------------------------------------------------- assets

def fetch(asset):
    dl = os.path.join(CACHE, 'dl')
    os.makedirs(dl, exist_ok=True)
    path = os.path.join(dl, asset['file'])
    if not os.path.exists(path):
        log(f'downloading {asset["url"]}')
        tmp = path + '.part'
        urllib.request.urlretrieve(asset['url'], tmp)
        os.replace(tmp, path)
    digest = sha256(path)
    if digest != asset['sha256']:
        raise SystemExit(f'{path}: SHA-256 {digest} does not match {asset["sha256"]}')
    return path


def base_image():
    """FreeDOS image with ASM88, LINK88 and MSX88 in C:\\M (cached)."""
    image = os.path.join(CACHE, 'base.img')
    if os.path.exists(image):
        return image
    msx88_zip = fetch(ASSETS['msx88'])
    freedos_zip = fetch(ASSETS['freedos'])
    work = tempfile.mkdtemp()
    with zipfile.ZipFile(freedos_zip) as z:
        z.extract('FD13LITE.img', work)
    tools = os.path.join(work, 'tools')
    os.makedirs(tools)
    with zipfile.ZipFile(msx88_zip) as z:
        for name, digest in TOOLS.items():
            data = z.read(f'MSX88Portable/msx88/{name}')
            if hashlib.sha256(data).hexdigest() != digest:
                raise SystemExit(f'{name}: unexpected SHA-256')
            open(os.path.join(tools, name), 'wb').write(data)
    img = os.path.join(work, 'FD13LITE.img')
    target = img + PARTITION
    open(os.path.join(work, 'FDAUTO.BAT'), 'w', newline='').write(FDAUTO)
    open(os.path.join(work, 'FDCONFIG.SYS'), 'w', newline='').write(FDCONFIG)
    mtools('mdel', '-i', target, '::/SETUP.BAT')
    mtools('mcopy', '-o', '-i', target, os.path.join(work, 'FDAUTO.BAT'), '::/FDAUTO.BAT')
    mtools('mcopy', '-o', '-i', target, os.path.join(work, 'FDCONFIG.SYS'), '::/FDCONFIG.SYS')
    mtools('mmd', '-i', target, '::/M')
    mtools('mcopy', '-i', target, *[os.path.join(tools, n) for n in TOOLS], '::/M/')
    shutil.move(img, image)
    shutil.rmtree(work)
    return image


# ---------------------------------------------------------------- corpus

def parse_meta(source):
    """`;; key: value` lines at the top of a program."""
    meta = {}
    for line in source.splitlines():
        m = re.match(r'\s*;;\s*([a-z0-9-]+)\s*:\s*(.*?)\s*$', line)
        if m:
            meta[m.group(1)] = m.group(2)
    return meta


def load_corpus(directory, only):
    programs = []
    for name in sorted(os.listdir(directory)):
        if not name.lower().endswith('.asm'):
            continue
        stem = name[:-4]
        if only and stem not in only:
            continue
        source = open(os.path.join(directory, name), encoding='latin-1').read()
        programs.append({'name': stem, 'source': source, 'meta': parse_meta(source)})
    for i, p in enumerate(programs):
        p['dos'] = f'P{i:03d}'
    return programs


# Calibration programs: print every printable character with INT 7, 32 per line.
CALIBRATION = [list(range(start, min(start + 32, 0x7F))) for start in (0x20, 0x40, 0x60)]


def calibration_source(chars):
    data = ', '.join(f'{c:02X}H' if c < 0xA0 else f'0{c:02X}H' for c in chars)
    return (
        'ORG 1000H\r\n'
        f'T DB {data}\r\n'
        'ORG 2000H\r\n'
        'MOV BX, OFFSET T\r\n'
        f'MOV AL, {len(chars)}\r\n'
        'INT 7\r\n'
        'INT 0\r\n'
        'END\r\n'
    )


def to_crlf(text):
    return text.replace('\r\n', '\n').replace('\n', '\r\n')


def build_image(programs, work):
    image = os.path.join(work, 'run.img')
    shutil.copy(base_image(), image)
    files = []
    batch = ['@echo off', 'cd \\M']
    units = [(p['dos'], p['source']) for p in programs]
    units += [(f'CAL{i}', calibration_source(chars)) for i, chars in enumerate(CALIBRATION)]
    for dos, source in units:
        for ext, content in (
            ('ASM', to_crlf(source)),
            ('IN1', f'{dos}\r\n{dos}\r\n{dos}\r\n'),
            ('IN2', f'{dos}\r\n{dos}\r\n'),
        ):
            path = os.path.join(work, f'{dos}.{ext}')
            open(path, 'w', newline='', encoding='latin-1').write(content)
            files.append(path)
        batch += [
            f'asm88 <{dos}.IN1 >{dos}.OUT',
            f'if exist {dos}.O link88 <{dos}.IN2 >>{dos}.OUT',
        ]
    batch.append(f'echo {READY}')
    run_bat = os.path.join(work, 'RUN.BAT')
    open(run_bat, 'w', newline='').write('\r\n'.join(batch) + '\r\n')
    target = image + PARTITION
    mtools('mcopy', '-o', '-i', target, run_bat, '::/RUN.BAT')
    for chunk in range(0, len(files), 60):
        mtools('mcopy', '-o', '-i', target, *files[chunk:chunk + 60], '::/M/')
    return image


def extract(image, work, names):
    out = os.path.join(work, 'out')
    os.makedirs(out, exist_ok=True)
    env = dict(os.environ, MTOOLS_SKIP_CHECK='1')
    listing = subprocess.run(['mdir', '-b', '-i', image + PARTITION, '::/M'], env=env,
                             capture_output=True, text=True).stdout.split()
    wanted = [f for f in listing if os.path.basename(f).split('.')[0].upper() in names]
    for chunk in range(0, len(wanted), 60):
        mtools('mcopy', '-n', '-o', '-i', image + PARTITION, *wanted[chunk:chunk + 60], out)
    return out


# ---------------------------------------------------------------- MSX88 driver

MAIN_SCREEN = [((320, 476), b'\x00\x00\xa8'), ((600, 20), b'\x57\x57\xff')]
BOTTOM_BAR = (0, 470, 640, 480)
COMMAND_WINDOW = (0, 398, 510, 468)
FLAGS_LABELS = b'I\x00Z\x00S\x00O\x00C\x00A\x00P\x00'
FLAGS_FROM_AX = 0x13DA
REGISTER_RE = re.compile(rb'(AX|BX|CX|DX|IP|SP)\x00([0-9A-F]{2}) ([0-9A-F]{2})\x00')


class Machine:
    def __init__(self, image, work, sock=None):
        self.work = work
        sock = sock or os.path.join(work, 'mon.sock')
        self.qemu = subprocess.Popen(
            ['qemu-system-i386', '-m', '16', '-drive', f'file={image},format=raw,if=ide',
             '-display', 'none', '-monitor', f'unix:{sock},server,nowait', '-no-reboot'],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.m = Monitor(sock)
        self.glyphs = {}
        self.ambiguous = {}
        self.idle_bar = None
        self.memory_base = None

    # -- low level
    def shot(self):
        path = os.path.join(self.work, 'shot.ppm')
        self.m.cmd(f'screendump "{path}"')
        return screen.Image(path)

    def ram(self, start=0, length=0xA0000):
        path = os.path.join(self.work, 'ram.bin')
        self.m.cmd(f'pmemsave {start:#x} {length:#x} "{path}"')
        return open(path, 'rb').read()

    def video_mode(self):
        return self.m.read_phys(0x449, 1)[0]

    def text_screen(self):
        return self.m.screen()

    def wait(self, predicate, timeout, interval=0.25):
        deadline = time.time() + timeout
        while time.time() < deadline:
            result = predicate()
            if result:
                return result
            time.sleep(interval)
        return None

    def wait_dos_prompt(self, timeout=30):
        def ready():
            if self.video_mode() != 3:
                return False
            lines = [l.rstrip() for l in self.text_screen() if l.strip()]
            return lines and lines[-1].endswith('>')
        return self.wait(ready, timeout)

    # -- MSX88 sessions
    def is_main_screen(self, img):
        return all(img.pixel(x, y) == color for (x, y), color in MAIN_SCREEN)

    def is_idle(self, img):
        return img.region(*BOTTOM_BAR) == self.idle_bar

    def start_msx88(self):
        self.m.type('msx88\n')
        if not self.wait(lambda: self.video_mode() == 0x12, 20):
            raise RuntimeError('MSX88 did not switch to graphics mode')
        time.sleep(1.0)
        # Any key dismisses the splash; ESC only clears the (empty) command line.
        self.m.key('esc')
        img = self.wait(lambda: (lambda i: i if self.is_main_screen(i) else None)(self.shot()), 20)
        if not img:
            raise RuntimeError('MSX88 main screen did not appear')
        time.sleep(0.5)
        self.idle_bar = self.shot().region(*BOTTOM_BAR)
        self.settle()
        self.memory_base = None

    def wait_idle(self, timeout):
        return self.wait(lambda: self.is_idle(self.shot()), timeout, interval=0.2)

    def window_signature(self):
        return self.shot().region(*COMMAND_WINDOW)

    def settle(self, timeout=30, quiet=0.6):
        """Waits until MSX88 is idle and the screen stops changing."""
        deadline = time.time() + timeout
        last, since = None, time.time()
        while time.time() < deadline:
            img = self.shot()
            sig = img.pixels
            if sig != last:
                last, since = sig, time.time()
            elif self.is_idle(img) and time.time() - since >= quiet:
                return True
            time.sleep(0.15)
        return False

    def press(self, name, hold=60):
        """Presses a key and waits for the command window to show it (MSX88
        drops keys typed while it is busy, so keys go one at a time)."""
        for _ in range(2):
            before = self.window_signature()
            self.m.key(name, hold)
            if self.wait(lambda: self.window_signature() != before, 4, interval=0.1):
                return
        raise RuntimeError(f'key {name} not taken')

    def command(self, text, timeout=30):
        for ch in text:
            self.press(key_name(ch))
        self.press('ret')
        if not self.settle(timeout):
            raise RuntimeError(f'MSX88 busy after {text!r}')

    def go(self, timeout, keys=()):
        """Runs `G` and waits for the program to end. `keys`: (delay, key name)
        pressed while it runs (keyboard for INT 6, F10, switches...)."""
        self.press('shift-g')
        self.press('ret')
        for delay, name in keys:
            time.sleep(delay)
            self.m.key(name, 100)
        return self.settle(timeout)

    def quit_msx88(self):
        self.press('shift-q')
        self.m.key('ret', 60)
        if not self.wait_dos_prompt():
            raise RuntimeError('MSX88 did not quit')

    def window(self):
        return screen.read_window(self.shot(), self.glyphs)

    # -- state
    def locate_memory(self, ram, expected):
        """Finds MSX88's 64 KB memory in the PC RAM: `expected` maps a few
        addresses to the bytes that must be there (the loaded memory image)."""
        anchor_address, anchor = max(expected.items(), key=lambda kv: len(kv[1]))
        start = 0
        while True:
            pos = ram.find(anchor, start)
            if pos < 0:
                raise RuntimeError('MSX88 memory not found')
            base = pos - anchor_address
            if base >= 0 and all(ram[base + a:base + a + len(b)] == b for a, b in expected.items()):
                return base
            start = pos + 1

    def state(self):
        ram = self.ram()
        registers = {}
        self.register_at = {}
        for m in REGISTER_RE.finditer(ram):
            name = m.group(1).decode()
            shown = int(m.group(2) + m.group(3), 16)
            value = int.from_bytes(ram[m.start() + 0x14:m.start() + 0x16], 'little')
            if value != shown:
                continue
            if name in registers and registers[name] != value:
                raise RuntimeError(f'two candidates for {name}')
            registers[name] = value
            self.register_at[name] = m.start() + 0x14
        if set(registers) != {'AX', 'BX', 'CX', 'DX', 'IP', 'SP'}:
            raise RuntimeError(f'registers not found: {sorted(registers)}')
        # The flags widget is created right after the register widgets.
        flags_at = self.register_at['AX'] + FLAGS_FROM_AX
        if ram[flags_at + 0x42:flags_at + 0x42 + len(FLAGS_LABELS)] != FLAGS_LABELS:
            raise RuntimeError('flags not found')
        flags = int.from_bytes(ram[flags_at:flags_at + 2], 'little')
        memory = ram[self.memory_base:self.memory_base + 0x10000]
        return registers, flags, memory


# ---------------------------------------------------------------- listings

LST_LINE = re.compile(r'^ ([0-9A-F]{4}) ((?:[0-9A-F]{2} ?)+)\t\s*(\d+)\t?(.*)$')
LST_CONT = re.compile(r'^ ([0-9A-F]{4}) ((?:[0-9A-F]{2} ?)+)\s*$')
# DUP: " 1016 3[  <line> ..." then the bytes of one element, then "]".
LST_DUP = re.compile(r'^ ([0-9A-F]{4}) ([0-9A-F]+)\[\s+(\d+)')
LST_DUP_BYTES = re.compile(r'^\t\s+((?:[0-9A-F]{2} ?)+)\s*$')


def parse_listing(text):
    """Address, bytes and source line of each line of a .LST."""
    rows = []
    symbols = []
    in_symbols = False
    dup = None
    for raw in text.splitlines():
        line = raw.rstrip('\r\n')
        if 'S I M B O L O S' in line:
            in_symbols = True
            continue
        if in_symbols:
            m = re.match(r'^ (\S+)\s+(\S+)\s+([0-9A-F]+)h\s*$', line)
            if m:
                symbols.append({'name': m.group(1), 'type': m.group(2), 'value': m.group(3)})
            continue
        if dup is not None:
            m = LST_DUP_BYTES.match(line)
            if m:
                dup['element'] += m.group(1).split()
            elif line.strip() == ']':
                rows.append({'address': dup['address'], 'bytes': dup['element'] * dup['count'],
                             'line': dup['line'], 'dup': dup['count']})
                dup = None
            continue
        m = LST_DUP.match(line)
        if m:
            dup = {'address': m.group(1), 'count': int(m.group(2), 16), 'line': int(m.group(3)), 'element': []}
            continue
        m = LST_LINE.match(line)
        if m:
            rows.append({'address': m.group(1), 'bytes': m.group(2).split(), 'line': int(m.group(3))})
            continue
        m = LST_CONT.match(line)
        if m and rows:
            rows.append({'address': m.group(1), 'bytes': m.group(2).split(), 'line': rows[-1]['line']})
    return rows, symbols


def normalize_listing(text, name):
    """The .LST header names the DOS file (P007.ASM) and the date of the run:
    use the program's name and drop the date, so runs give the same file."""
    text = re.sub(r'Listado Fuente: \S+', f'Listado Fuente: {name}.lst', text)
    text = re.sub(r'Programa Fuente en: \S+', f'Programa Fuente en: {name}.asm', text)
    return re.sub(r' Fecha: [^\r\n]*', ' Fecha: -', text)


def parse_summary(out_text):
    m = re.search(r'(\d+) Error\(es\)\s+(\d+) Aviso\(s\)', out_text)
    errors, warnings = (int(m.group(1)), int(m.group(2))) if m else (None, None)
    return errors, warnings


# ---------------------------------------------------------------- main flow

def mem_records(path):
    """Parses a .MEM file (text lines: AAAA LL 00 data)."""
    mem = bytearray(0x10000)
    for line in open(path, encoding='ascii').read().split('\r\n'):
        if len(line) < 8:
            continue
        address, count = int(line[0:4], 16), int(line[4:6], 16)
        mem[address:address + count] = bytes.fromhex(line[8:8 + 2 * count])
    return bytes(mem)


def calibrate_font(machine):
    glyphs = {}
    machine.command('+')  # fast mode
    for i, chars in enumerate(CALIBRATION):
        machine.command(f'L CAL{i}')
        machine.command('B')
        machine.command('R IP 2000')
        machine.command('B')
        if not machine.go(20):
            raise RuntimeError('calibration program did not end')
        img = machine.shot()
        for col, ch in enumerate(chars):
            x, y = screen.window_cell(1, col)
            bitmap = img.cell(x, y)
            if ch == 0x20:
                continue
            if not any(bitmap):
                raise RuntimeError(f'calibration: empty glyph for {chr(ch)!r}')
            if bitmap in glyphs:
                # Same glyph in the BGI font (O and 0): read as the first one.
                machine.ambiguous[chr(ch)] = glyphs[bitmap]
                continue
            glyphs[bitmap] = chr(ch)
    machine.glyphs = glyphs
    return glyphs


VECTORS = bytes.fromhex('0200cf00' '00000000' '00000000' '0e00cf00' '00000000' '00000000' '1a00cf00' '1e00cf00')


def run_program(machine, program):
    meta = program['meta']
    dos = program['dos']
    machine.start_msx88()
    machine.command('L INICIAL.MEM')
    machine.memory_base = machine.locate_memory(machine.ram(), {0: VECTORS})
    before = machine.state()[2]
    if meta.get('config'):
        machine.command(f'C {meta["config"]}')
    machine.command(f'L {dos}')
    machine.command('+')  # fast mode
    for cmd in filter(None, (c.strip() for c in meta.get('monitor', '').split('|'))):
        machine.command(cmd)
    machine.command('B')
    keys = [k.partition(':') for k in meta.get('keys', '').split()]
    status = 'stopped'
    if not machine.go(float(meta.get('timeout', 15)), [(float(d), n) for d, _, n in keys]):
        status = 'timeout'
        machine.m.key('esc', 100)
        if not machine.settle(15):
            raise RuntimeError('could not stop the program')
    window = machine.window()
    if any('Error en la ejecuci' in line for line in window):
        status = 'error'
    registers, flags, memory = machine.state()
    return {
        'status': status,
        'window': window,
        'registers': {k: f'{v:04X}' for k, v in sorted(registers.items())},
        'flags': f'{flags:04X}',
        'memory': diff_runs(before, memory),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--programs', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--only', nargs='*')
    parser.add_argument('--reparse', action='store_true',
                        help='only rebuild the listings of the golden files from their .lst')
    parser.add_argument('--interactive', action='store_true',
                        help='assemble, then leave QEMU running with its monitor at CACHE/run/mon.sock')
    args = parser.parse_args()

    programs = load_corpus(args.programs, set(args.only or []))
    if args.reparse:
        for program in programs:
            lst = os.path.join(args.out, f'{program["name"]}.lst')
            golden_path = os.path.join(args.out, f'{program["name"]}.json')
            if os.path.exists(lst) and os.path.exists(golden_path):
                golden = json.load(open(golden_path))
                text = open(lst, encoding='latin-1', newline='').read()
                open(lst, 'w', encoding='latin-1', newline='').write(normalize_listing(text, program['name']))
                listing, symbols = parse_listing(text)
                golden['assembler']['listing'], golden['assembler']['symbols'] = listing, symbols
                json.dump(golden, open(golden_path, 'w'), indent=1)
        return
    log(f'{len(programs)} programs')
    work = tempfile.mkdtemp(prefix='oracle-')
    image = build_image(programs, work)
    if args.interactive:
        os.makedirs(os.path.join(CACHE, 'run'), exist_ok=True)
        sock = os.path.join(CACHE, 'run', 'mon.sock')
        if os.path.exists(sock):
            os.remove(sock)
        machine = Machine(image, work, sock)
        machine.m.close()
        log(f'QEMU monitor at {sock} (DOS names: ' + ', '.join(f'{p["dos"]}={p["name"]}' for p in programs) + ')')
        machine.qemu.wait()
        return
    machine = Machine(image, work)
    results = {}
    try:
        if not machine.wait(lambda: any(READY in l for l in machine.text_screen()), 300):
            raise RuntimeError('assembly batch did not finish')
        machine.wait_dos_prompt()
        log('assembled')

        # First session: keep the initial memory of a fresh MSX88 and learn the font.
        machine.start_msx88()
        machine.memory_base = machine.locate_memory(machine.ram(), {0: VECTORS})
        initial = machine.state()[2]
        machine.command('S INICIAL.MEM')
        calibrate_font(machine)
        machine.quit_msx88()
        log(f'font: {len(machine.glyphs)} glyphs')

        for program in programs:
            if program['meta'].get('run', 'yes') == 'no':
                continue
            log(f'run {program["name"]}')
            try:
                results[program['name']] = run_program(machine, program)
            except Exception as error:  # keep going with the rest of the corpus
                log(f'  failed: {error}')
                results[program['name']] = {'status': 'oracle-error', 'detail': str(error)}
                try:
                    machine.m.key('esc')
                    time.sleep(1)
                except Exception:
                    pass
            machine.quit_msx88()
    except Exception:
        # Leave the last screen in the cache to see what went wrong.
        shot = os.path.join(work, 'shot.ppm')
        if os.path.exists(shot):
            shutil.copy(shot, os.path.join(CACHE, 'last-error.ppm'))
        raise
    finally:
        try:
            machine.m.cmd('quit')
        except Exception:
            pass
        machine.qemu.wait(timeout=30)

    names = {p['dos'] for p in programs} | {'INICIAL'}
    out_files = extract(image, work, names)
    write_results(programs, results, out_files, args.out, initial)
    json.dump({'same_glyph': machine.ambiguous}, open(os.path.join(args.out, '_font.json'), 'w'), indent=1)


def write_results(programs, results, files, out, initial):
    os.makedirs(out, exist_ok=True)
    nonzero = {f'{a:04X}': f'{b:02X}' for a, b in enumerate(initial) if b}
    json.dump({'nonzero': nonzero}, open(os.path.join(out, '_initial-memory.json'), 'w'), indent=1)
    for program in programs:
        dos = program['dos']
        get = lambda ext: (open(os.path.join(files, f'{dos}.{ext}'), encoding='latin-1').read()
                           if os.path.exists(os.path.join(files, f'{dos}.{ext}')) else None)
        lst, out_text = get('LST'), get('OUT') or ''
        errors, warnings = parse_summary(out_text)
        golden = {
            'program': f'{program["name"]}.asm',
            'assembler': {
                'errors': errors,
                'warnings': warnings,
                'messages': [l.strip() for l in out_text.splitlines()
                             if re.search(r'(Error|Aviso|Warning|!!)', l) and 'Error(es)' not in l],
            },
        }
        if lst is not None:
            listing, symbols = parse_listing(lst)
            golden['assembler']['listing'] = listing
            golden['assembler']['symbols'] = symbols
            open(os.path.join(out, f'{program["name"]}.lst'), 'w', encoding='latin-1', newline='').write(
                normalize_listing(lst, program['name']))
        if program['name'] in results:
            golden['run'] = results[program['name']]
        json.dump(golden, open(os.path.join(out, f'{program["name"]}.json'), 'w'), indent=1)
        log(f'wrote {program["name"]}')


def diff_runs(before, after, gap=4):
    """Bytes of `after` that differ from `before`, as {start: hex} runs
    (differences closer than `gap` bytes share a run)."""
    changed = [a for a in range(0x10000) if before[a] != after[a]]
    runs = {}
    i = 0
    while i < len(changed):
        start = end = changed[i]
        while i + 1 < len(changed) and changed[i + 1] - end <= gap:
            i += 1
            end = changed[i]
        runs[f'{start:04X}'] = after[start:end + 1].hex().upper()
        i += 1
    return runs


if __name__ == '__main__':
    main()
