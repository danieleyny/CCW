/**
 * Just enough PNG decoding to trim a captured signature.
 *
 * A signature drawn on a 520×150 canvas is mostly empty: the ink might occupy a
 * third of it, with transparent padding all around. Embed that as-is and the
 * *canvas* gets positioned, not the strokes — so the signature floats somewhere
 * above the rule instead of sitting on it, by an amount that changes with every
 * signature. Cropping to the ink bounds is what makes placement predictable.
 *
 * Scope is deliberately narrow: 8-bit non-interlaced RGBA/RGB/grey PNGs, which
 * is what HTMLCanvas.toDataURL produces. Anything else returns null and the
 * caller embeds the original — a slightly floaty signature beats a failed
 * document.
 */
import { inflateSync, deflateSync } from "node:zlib"
import { crc32 } from "node:zlib"

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

interface Decoded {
  width: number
  height: number
  /** RGBA, 4 bytes per pixel. */
  pixels: Buffer
}

function chunks(buf: Buffer) {
  const out: { type: string; data: Buffer }[] = []
  let p = 8
  while (p + 8 <= buf.length) {
    const len = buf.readUInt32BE(p)
    const type = buf.toString("ascii", p + 4, p + 8)
    out.push({ type, data: buf.subarray(p + 8, p + 8 + len) })
    p += 12 + len // length + type + data + crc
  }
  return out
}

/** Undo PNG's per-scanline filters (spec §9.2). */
function unfilter(raw: Buffer, width: number, height: number, bpp: number): Buffer | null {
  const stride = width * bpp
  const out = Buffer.alloc(stride * height)
  let pos = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++]
    const line = raw.subarray(pos, pos + stride)
    pos += stride
    const o = y * stride
    const prior = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null

    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[o + x - bpp] : 0
      const b = prior ? prior[x] : 0
      const c = prior && x >= bpp ? prior[x - bpp] : 0
      const v = line[x]
      switch (filter) {
        case 0: out[o + x] = v; break
        case 1: out[o + x] = (v + a) & 0xff; break
        case 2: out[o + x] = (v + b) & 0xff; break
        case 3: out[o + x] = (v + ((a + b) >> 1)) & 0xff; break
        case 4: {
          const p = a + b - c
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
          const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
          out[o + x] = (v + pred) & 0xff
          break
        }
        default:
          return null // unknown filter — bail rather than guess
      }
    }
  }
  return out
}

function decode(png: Uint8Array): Decoded | null {
  const buf = Buffer.from(png)
  if (!buf.subarray(0, 8).equals(SIG)) return null

  const cs = chunks(buf)
  const ihdr = cs.find((c) => c.type === "IHDR")
  if (!ihdr) return null

  const width = ihdr.data.readUInt32BE(0)
  const height = ihdr.data.readUInt32BE(4)
  const depth = ihdr.data[8]
  const colorType = ihdr.data[9]
  const interlace = ihdr.data[12]
  // 8-bit, non-interlaced, no palette. Canvas output is always colorType 6.
  if (depth !== 8 || interlace !== 0 || ![0, 2, 4, 6].includes(colorType)) return null

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1
  const idat = Buffer.concat(cs.filter((c) => c.type === "IDAT").map((c) => c.data))
  if (!idat.length) return null

  let raw: Buffer
  try {
    raw = inflateSync(idat)
  } catch {
    return null
  }
  const flat = unfilter(raw, width, height, channels)
  if (!flat) return null

  // Normalize to RGBA so the caller only deals with one layout.
  const pixels = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const s = i * channels
    const d = i * 4
    if (channels === 4) {
      flat.copy(pixels, d, s, s + 4)
    } else if (channels === 3) {
      pixels[d] = flat[s]; pixels[d + 1] = flat[s + 1]; pixels[d + 2] = flat[s + 2]; pixels[d + 3] = 255
    } else if (channels === 2) {
      pixels[d] = pixels[d + 1] = pixels[d + 2] = flat[s]; pixels[d + 3] = flat[s + 1]
    } else {
      pixels[d] = pixels[d + 1] = pixels[d + 2] = flat[s]; pixels[d + 3] = 255
    }
  }
  return { width, height, pixels }
}

function encode(width: number, height: number, pixels: Buffer): Uint8Array {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, "ascii"), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body) >>> 0)
    return Buffer.concat([len, body, crc])
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return new Uint8Array(
    Buffer.concat([SIG, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))])
  )
}

export interface TrimmedSignature {
  png: Uint8Array
  width: number
  height: number
}

/**
 * Smallest image we'll accept as a signature. Anything under this is a blank
 * canvas, a stray dot, or a 1x1 placeholder — stamping it stretches a few pixels
 * into a solid block sitting where a signature should be, which looks like a
 * redaction and is worse than an honest blank line.
 */
export const MIN_SIGNATURE_PX = 8

/** Does this PNG contain enough visible ink to be somebody's signature? */
export function hasVisibleInk(png: Uint8Array): boolean {
  const t = trimSignaturePng(png)
  return !!t && t.width >= MIN_SIGNATURE_PX && t.height >= MIN_SIGNATURE_PX
}

/**
 * Crop a signature PNG to its visible ink, with a hair of padding.
 *
 * `alphaFloor` ignores near-transparent antialiasing fringe so a stray 2%-opacity
 * pixel in the corner doesn't defeat the whole crop. Returns null when the image
 * can't be decoded or is entirely blank — callers fall back to the original.
 */
export function trimSignaturePng(png: Uint8Array, alphaFloor = 16): TrimmedSignature | null {
  const img = decode(png)
  if (!img) return null

  const { width, height, pixels } = img
  let minX = width, minY = height, maxX = -1, maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const a = pixels[i + 3]
      // Ink is either opaque-ish, or dark-on-opaque (a signature drawn on a
      // white background rather than a transparent one).
      const dark = a > alphaFloor && pixels[i] + pixels[i + 1] + pixels[i + 2] < 600
      if (a > alphaFloor && dark) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0 || maxY < 0) return null // nothing visible

  const pad = 2
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(width - 1, maxX + pad)
  maxY = Math.min(height - 1, maxY + pad)

  const w = maxX - minX + 1
  const h = maxY - minY + 1
  if (w === width && h === height) return { png, width, height } // already tight

  const cropped = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++) {
    const from = ((minY + y) * width + minX) * 4
    pixels.copy(cropped, y * w * 4, from, from + w * 4)
  }
  return { png: encode(w, h, cropped), width: w, height: h }
}
