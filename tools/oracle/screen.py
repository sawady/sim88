"""Reads MSX88's graphic screen (VGA mode 12h, 640x480) from a QEMU screendump.

MSX88 draws text with the 8x8 BGI font. The oracle learns the glyphs at run
time (see oracle.calibrate_font) by printing every printable character with
INT 7, so no font data is stored in the repo.
"""
from collections import Counter

# The command window ("pantalla de comandos"): 5 lines of text.
WINDOW_X = 11
WINDOW_Y = 406
LINE_PITCH = 10
WINDOW_LINES = 5
WINDOW_COLS = 60

# The printer's paper (F9 shows the peripherals, F5 the paper): white text in
# a proportional stroked font, on a dithered background. Lines are 14 pixels
# apart; after a new line past the seventh, the paper scrolls and shows the
# last seven (tests/fidelity: printer-lines).
PAPER_X = 444
PAPER_RIGHT = 612
PAPER_Y = 289
PAPER_PITCH = 14
PAPER_LINES = 8
PAPER_CELL_ROWS = 9
PAPER_SPACE = 8  # about the width of a space
WHITE = b'\xff\xff\xff'


class Image:
    """A PPM (P6) image as written by QEMU's `screendump`."""

    def __init__(self, path):
        data = open(path, 'rb').read()
        parts = []
        pos = 0
        while len(parts) < 4:
            while data[pos:pos + 1].isspace():
                pos += 1
            if data[pos:pos + 1] == b'#':
                pos = data.index(b'\n', pos)
                continue
            end = pos
            while not data[end:end + 1].isspace():
                end += 1
            parts.append(data[pos:end])
            pos = end
        pos += 1
        assert parts[0] == b'P6', parts[0]
        self.width, self.height = int(parts[1]), int(parts[2])
        self.pixels = data[pos:]

    def pixel(self, x, y):
        i = (y * self.width + x) * 3
        return self.pixels[i:i + 3]

    def region(self, x0, y0, x1, y1):
        """Raw bytes of a rectangle (used as a signature)."""
        return b''.join(self.pixels[(y * self.width + x0) * 3:(y * self.width + x1) * 3] for y in range(y0, y1))

    def cell(self, x0, y0):
        """The 8x8 cell at (x0, y0) as a tuple of 8 row bitmasks (foreground = 1)."""
        colors = [self.pixel(x0 + dx, y0 + dy) for dy in range(8) for dx in range(8)]
        background = Counter(colors).most_common(1)[0][0]
        rows = []
        for dy in range(8):
            bits = 0
            for dx in range(8):
                if colors[dy * 8 + dx] != background:
                    bits |= 0x80 >> dx
            rows.append(bits)
        return tuple(rows)


def window_cell(line, col):
    return WINDOW_X + col * 8, WINDOW_Y + line * LINE_PITCH


def read_line(image, glyphs, line, cols=WINDOW_COLS, x=WINDOW_X, y=None):
    y = WINDOW_Y + line * LINE_PITCH if y is None else y
    out = []
    for col in range(cols):
        bitmap = image.cell(x + col * 8, y)
        if not any(bitmap):
            out.append(' ')
        else:
            out.append(glyphs.get(bitmap, '�'))
    return ''.join(out).rstrip()


def paper_glyphs(image, line):
    """The glyphs of a line of the paper, left to right, as (x, width, columns):
    a glyph is a run of columns with white pixels (the columns are bitmasks of
    the rows, so a glyph is its shape, wherever it is)."""
    y0 = PAPER_Y + line * PAPER_PITCH
    columns = []
    for x in range(PAPER_X - 2, PAPER_RIGHT):
        mask = 0
        for dy in range(PAPER_CELL_ROWS):
            if image.pixel(x, y0 + dy) == WHITE:
                mask |= 1 << dy
        columns.append((x, mask))
    glyphs = []
    run = []
    for x, mask in columns + [(PAPER_RIGHT, 0)]:
        if mask:
            run.append((x, mask))
        elif run:
            glyphs.append((run[0][0], len(run), tuple(m for _, m in run)))
            run = []
    return glyphs


def read_paper_line(image, glyphs, line):
    text = ''
    next_x = PAPER_X
    for x, width, shape in paper_glyphs(image, line):
        gap = x - next_x
        if gap >= PAPER_SPACE - 2:
            text += ' ' * max(1, round(gap / PAPER_SPACE))
        text += glyphs.get(shape, '\ufffd')
        next_x = x + width + 2
    return text


def read_paper(image, glyphs):
    """The lines of the paper, without the blank ones at the end."""
    lines = [read_paper_line(image, glyphs, line) for line in range(PAPER_LINES)]
    while lines and not lines[-1]:
        lines.pop()
    return lines


def read_window(image, glyphs):
    return [read_line(image, glyphs, n) for n in range(WINDOW_LINES)]
