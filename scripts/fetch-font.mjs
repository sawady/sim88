#!/usr/bin/env node
// Downloads the screen font: "IBM VGA 8x16" from The Ultimate Oldschool PC
// Font Pack by VileR (https://int10h.org/oldschool-pc-fonts/), licensed
// CC BY-SA 4.0. Third-party fonts are fetched at install time and are not
// kept in the repository; the build serves them from the site itself (no CDN).
//
// Runs after `npm install` / `npm ci` and before `dev` and `build`. It does
// nothing when the font is already there. The archive and the font are
// checked against known SHA-256 sums.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const ZIP = 'oldschool_pc_font_pack_v2.2_web.zip';
const URLS = [
  `https://int10h.org/oldschool-pc-fonts/download/${ZIP}`,
  `https://web.archive.org/web/2021id_/https://int10h.org/oldschool-pc-fonts/download/${ZIP}`,
];
const ZIP_SHA256 = 'f0e0a15e46ab85901165188034e90ad933133e8a205640f624f38dc8a8d74855';
const FILES = {
  'woff - Web (webfonts)/WebPlus_IBM_VGA_8x16.woff': {
    name: 'WebPlus_IBM_VGA_8x16.woff',
    sha256: '4823e093c7f2f69641eaafb6f3465185afa63877cda58d341b6b317fd53dfd1f',
  },
  'LICENSE.TXT': { name: 'LICENSE.TXT' },
};

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'fonts', 'vendor');
const sha256 = (data) => createHash('sha256').update(data).digest('hex');

const present = () =>
  Object.values(FILES).every(({ name, sha256: sum }) => {
    const path = join(OUT, name);
    return existsSync(path) && (!sum || sha256(readFileSync(path)) === sum);
  });

// Minimal ZIP reader: the central directory gives each entry's offset.
function unzip(zip, wanted) {
  const found = {};
  let end = zip.length - 22;
  while (end >= 0 && zip.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error('not a zip file');
  let p = zip.readUInt32LE(end + 16);
  const count = zip.readUInt16LE(end + 10);
  for (let i = 0; i < count; i++) {
    const method = zip.readUInt16LE(p + 10);
    const size = zip.readUInt32LE(p + 20);
    const nameLength = zip.readUInt16LE(p + 28);
    const extraLength = zip.readUInt16LE(p + 30);
    const commentLength = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const name = zip.toString('utf8', p + 46, p + 46 + nameLength);
    if (wanted.includes(name)) {
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + size);
      found[name] = method === 0 ? data : inflateRawSync(data);
    }
    p += 46 + nameLength + extraLength + commentLength;
  }
  return found;
}

async function download() {
  for (const url of URLS) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const zip = Buffer.from(await response.arrayBuffer());
      if (sha256(zip) !== ZIP_SHA256) throw new Error('unexpected SHA-256');
      return zip;
    } catch (e) {
      console.warn(`fetch-font: ${url}: ${e.message}`);
    }
  }
  throw new Error('could not download the font pack');
}

if (!present()) {
  const zip = await download();
  const files = unzip(zip, Object.keys(FILES));
  mkdirSync(OUT, { recursive: true });
  for (const [entry, { name, sha256: sum }] of Object.entries(FILES)) {
    const data = files[entry];
    if (!data || (sum && sha256(data) !== sum)) throw new Error(`fetch-font: bad ${entry}`);
    writeFileSync(join(OUT, name), data);
  }
  console.log(`fetch-font: IBM VGA 8x16 (CC BY-SA 4.0, VileR) saved in ${OUT}`);
}
