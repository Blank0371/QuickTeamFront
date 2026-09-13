// Erzeugt apple-icon.png und favicon.ico aus derselben Geometrie wie icon.svg.
// Reines Node (zlib), keine Bild-Abhaengigkeit im Projekt.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const APP = process.argv[2];

// Werte aus docs/Farbpalette.html — identisch zu app/icon.svg.
const GRUND = [0x16, 0x24, 0x1c]; // Green Deep
const BRONZE = [0xa8, 0x87, 0x4f]; // Gold Bronze
const BRONZE_HI = [0xd4, 0xb4, 0x78]; // Bronze Light

// Geometrie im 32er-Raster, identisch zu app/icon.svg
const SHAPES = [
  { x: 0, y: 0, w: 32, h: 32, r: 8, c: GRUND },
  { x: 7, y: 8, w: 18, h: 4.5, r: 2.25, c: BRONZE },
  { x: 12, y: 14.5, w: 13, h: 4.5, r: 2.25, c: BRONZE_HI },
  { x: 7, y: 21, w: 10, h: 4.5, r: 2.25, c: BRONZE },
];

function inRoundedRect(px, py, s) {
  const { x, y, w, h, r } = s;
  if (px < x || py < y || px > x + w || py > y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

function raster(size, bgRadius) {
  const shapes = SHAPES.map((s, i) => (i === 0 ? { ...s, r: bgRadius } : s));
  const buf = Buffer.alloc(size * size * 4, 0);
  const SS = 4; // 4x4 Supersampling
  const scale = 32 / size;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const ux = (px + (sx + 0.5) / SS) * scale;
          const uy = (py + (sy + 0.5) / SS) * scale;
          let hit = null;
          for (const s of shapes) if (inRoundedRect(ux, uy, s)) hit = s.c;
          if (hit) {
            r += hit[0];
            g += hit[1];
            b += hit[2];
            a += 255;
          }
        }
      }
      const n = SS * SS;
      const alpha = a / n;
      const i = (py * size + px) * 4;
      if (alpha > 0) {
        // Farbe ueber die getroffenen Samples mitteln
        const hits = a / 255;
        buf[i] = Math.round(r / hits);
        buf[i + 1] = Math.round(g / hits);
        buf[i + 2] = Math.round(b / hits);
        buf[i + 3] = Math.round(alpha);
      }
    }
  }
  return buf;
}

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, bgRadius = 8) {
  const rgba = raster(size, bgRadius);
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // Filter: None
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function ico(sizes) {
  const images = sizes.map((s) => ({ size: s, data: png(s) }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = [];
  for (const img of images) {
    const e = Buffer.alloc(16);
    e[0] = img.size >= 256 ? 0 : img.size;
    e[1] = img.size >= 256 ? 0 : img.size;
    e[2] = 0;
    e[3] = 0;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(img.data.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += img.data.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

// iOS legt seine eigene Maske drueber — durchsichtige Ecken wuerden dort
// schwarz. Deshalb voller Rand ohne Radius.
writeFileSync(join(APP, "apple-icon.png"), png(180, 0));
writeFileSync(join(APP, "favicon.ico"), ico([16, 32, 48]));
console.log("apple-icon.png und favicon.ico geschrieben");
