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


def read_window(image, glyphs):
    return [read_line(image, glyphs, n) for n in range(WINDOW_LINES)]
