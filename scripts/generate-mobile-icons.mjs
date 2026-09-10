#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const resources = join(root, 'resources')

function crc32(buf) {
  let crc = ~0
  for (const byte of buf) {
    crc ^= byte
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

function chunk(type, data) {
  const header = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.concat([header, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcBuf))
  return Buffer.concat([len, header, data, crc])
}

function encodePng(width, height, getPixel) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = getPixel(x, y)
      const i = row + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function inRoundedRect(x, y, size, radius) {
  const dx = Math.min(x, size - 1 - x)
  const dy = Math.min(y, size - 1 - y)
  if (dx >= radius || dy >= radius) return dx >= 0 && dy >= 0
  return Math.hypot(radius - dx, radius - dy) <= radius
}

function paintIcon(size) {
  const bg = [198, 61, 43, 255]
  const paper = [247, 246, 242, 255]
  const ink = [24, 35, 46, 255]
  const radius = size * 0.22
  return encodePng(size, size, (x, y) => {
    if (!inRoundedRect(x, y, size, radius)) return [0, 0, 0, 0]
    const cx = x / size
    const cy = y / size
    const inGlyph =
      (cy > 0.28 && cy < 0.36 && cx > 0.22 && cx < 0.78) ||
      (cx > 0.46 && cx < 0.54 && cy > 0.28 && cy < 0.78) ||
      (cy > 0.46 && cy < 0.54 && cx > 0.3 && cx < 0.7) ||
      (cy > 0.62 && cy < 0.7 && cx > 0.34 && cx < 0.66)
    if (inGlyph) return ink
    if (cx > 0.18 && cx < 0.82 && cy > 0.18 && cy < 0.82) return paper
    return bg
  })
}

function paintSplash(width, height) {
  const bg = [247, 246, 242, 255]
  return encodePng(width, height, () => bg)
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="220" fill="#C63D2B"/>
  <rect x="184" y="184" width="656" height="656" rx="72" fill="#F7F6F2"/>
  <text x="512" y="670" text-anchor="middle" font-size="420" font-family="serif" fill="#18232E">史</text>
</svg>
`

await mkdir(resources, { recursive: true })
await writeFile(join(resources, 'icon.svg'), svg)
await writeFile(join(resources, 'icon.png'), paintIcon(1024))
await writeFile(join(resources, 'icon-foreground.png'), paintIcon(1024))
await writeFile(join(resources, 'splash.png'), paintSplash(1280, 1280))
await writeFile(join(resources, 'splash-dark.png'), paintSplash(1280, 1280))
console.log('Wrote resources/icon.png and splash.png')
