// Generates the app icons (red square with a white "full height" arrow) without any image deps.
// Usage: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs'
import { crc32, deflateSync } from 'node:zlib'

const RED = [255, 0, 0, 255]
const WHITE = [255, 255, 255, 255]

/** Shape test in normalised 0..1 coordinates. */
function isWhite(x, y) {
  const bar = (cy) => Math.abs(y - cy) < 0.025 && x > 0.3 && x < 0.7
  const shaft = Math.abs(x - 0.5) < 0.035 && y > 0.3 && y < 0.7
  // Arrow heads: apex at 0.22 / 0.78, base at 0.36 / 0.64, half width 0.13 at the base.
  const head = (apex, base) => {
    const t = (y - apex) / (base - apex)
    return t >= 0 && t <= 1 && Math.abs(x - 0.5) < 0.13 * t
  }
  return bar(0.16) || bar(0.84) || shaft || head(0.22, 0.36) || head(0.78, 0.64)
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let py = 0; py < size; py++) {
    const row = py * (size * 4 + 1)
    raw[row] = 0 // filter: none
    for (let px = 0; px < size; px++) {
      const [r, g, b, a] = isWhite((px + 0.5) / size, (py + 0.5) / size) ? WHITE : RED
      raw.set([r, g, b, a], row + 1 + px * 4)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr.set([8, 6, 0, 0, 0], 8) // 8 bit, RGBA, deflate, no filter, no interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const out = new URL('../public/', import.meta.url)
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  writeFileSync(new URL(name, out), png(size))
  console.log(`wrote public/${name} (${size}x${size})`)
}
