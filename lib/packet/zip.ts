/**
 * A tiny STORE-method (no compression) ZIP writer. The applicant's uploads are already
 * compressed (PDF, JPEG, PNG), so deflating them buys nothing — storing them keeps this
 * dependency-free (the repo has no zip library) and the output trivially correct.
 *
 * Format: PKZIP APPNOTE — local file headers, then a central directory, then the
 * end-of-central-directory record. Filenames are UTF-8 (bit 11 set).
 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

export interface ZipEntry {
  name: string
  data: Uint8Array
}

// A fixed DOS timestamp (1980-01-01 00:00) — the archive is content, not a clock, and
// this keeps output deterministic without reading the wall clock.
const DOS_TIME = 0
const DOS_DATE = 0x21 // (1980-1980)<<9 | 1<<5 | 1

export function makeZip(entries: ZipEntry[]): Buffer {
  const chunks: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, "utf8")
    const data = Buffer.from(entry.data)
    const crc = crc32(data)
    const size = data.length

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0) // local file header signature
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0x0800, 6) // flags: UTF-8 filename
    local.writeUInt16LE(0, 8) // compression: store
    local.writeUInt16LE(DOS_TIME, 10)
    local.writeUInt16LE(DOS_DATE, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(size, 18) // compressed
    local.writeUInt32LE(size, 22) // uncompressed
    local.writeUInt16LE(nameBytes.length, 26)
    local.writeUInt16LE(0, 28) // extra length

    chunks.push(local, nameBytes, data)

    const cd = Buffer.alloc(46)
    cd.writeUInt32LE(0x02014b50, 0) // central dir header signature
    cd.writeUInt16LE(20, 4) // version made by
    cd.writeUInt16LE(20, 6) // version needed
    cd.writeUInt16LE(0x0800, 8) // flags: UTF-8
    cd.writeUInt16LE(0, 10) // compression: store
    cd.writeUInt16LE(DOS_TIME, 12)
    cd.writeUInt16LE(DOS_DATE, 14)
    cd.writeUInt32LE(crc, 16)
    cd.writeUInt32LE(size, 20)
    cd.writeUInt32LE(size, 24)
    cd.writeUInt16LE(nameBytes.length, 28)
    cd.writeUInt16LE(0, 30) // extra
    cd.writeUInt16LE(0, 32) // comment
    cd.writeUInt16LE(0, 34) // disk number start
    cd.writeUInt16LE(0, 36) // internal attrs
    cd.writeUInt32LE(0, 38) // external attrs
    cd.writeUInt32LE(offset, 42) // local header offset
    central.push(Buffer.concat([cd, nameBytes]))

    offset += local.length + nameBytes.length + data.length
  }

  const cdBuf = Buffer.concat(central)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0) // EOCD signature
  eocd.writeUInt16LE(0, 4) // disk number
  eocd.writeUInt16LE(0, 6) // disk with CD
  eocd.writeUInt16LE(entries.length, 8) // entries this disk
  eocd.writeUInt16LE(entries.length, 10) // total entries
  eocd.writeUInt32LE(cdBuf.length, 12) // CD size
  eocd.writeUInt32LE(offset, 16) // CD offset
  eocd.writeUInt16LE(0, 20) // comment length

  return Buffer.concat([...chunks, cdBuf, eocd])
}
