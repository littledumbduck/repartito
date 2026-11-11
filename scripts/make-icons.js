// Genera assets/icon.png (256x256) y assets/tray.png (32x32) sin dependencias.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c, crc = ~0;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x / size, y / size, size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Mascota: cara redonda naranja con orejas, ojos y mejillas.
function critter(u, v) {
  const d = (cx, cy) => Math.hypot(u - cx, v - cy);
  const T = [0, 0, 0, 0];
  if (d(0.5, 0.56) < 0.38) {
    if (d(0.36, 0.5) < 0.05 || d(0.64, 0.5) < 0.05) return [40, 30, 30, 255];
    if (d(0.28, 0.62) < 0.06 || d(0.72, 0.62) < 0.06) return [255, 140, 120, 255];
    if (d(0.5, 0.62) < 0.03) return [40, 30, 30, 255];
    return [255, 170, 40, 255];
  }
  if (d(0.22, 0.26) < 0.12 || d(0.78, 0.26) < 0.12) return [235, 140, 20, 255];
  return T;
}

const dir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'icon.png'), png(256, critter));
fs.writeFileSync(path.join(dir, 'tray.png'), png(32, critter));
console.log('Iconos generados en', dir);
