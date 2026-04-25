function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildIptcBlock(title: string | null, caption: string | null): Buffer {
  const tags: Buffer[] = []

  const addTag = (tagNum: number, value: string) => {
    const val = Buffer.from(value, 'utf8')
    const tag = Buffer.alloc(5 + val.length)
    tag[0] = 0x1c
    tag[1] = 0x02
    tag[2] = tagNum
    tag.writeUInt16BE(val.length, 3)
    val.copy(tag, 5)
    tags.push(tag)
  }

  if (title) addTag(5, title)       // Object Name (IIM 2:05)
  if (caption) addTag(120, caption) // Caption-Abstract (IIM 2:120)

  if (tags.length === 0) return Buffer.alloc(0)

  const iptcData = Buffer.concat(tags)
  const resourceSize = Buffer.alloc(4)
  resourceSize.writeUInt32BE(iptcData.length)

  // Pad IPTC data to even byte boundary
  const padding = iptcData.length % 2 === 1 ? Buffer.from([0x00]) : Buffer.alloc(0)

  const bimBlock = Buffer.concat([
    Buffer.from('8BIM'),
    Buffer.from([0x04, 0x04]), // IPTC-NAA resource type
    Buffer.from([0x00, 0x00]), // empty Pascal string (even-padded)
    resourceSize,
    iptcData,
    padding,
  ])

  const psHeader = Buffer.from('Photoshop 3.0\0')
  const segmentData = Buffer.concat([psHeader, bimBlock])
  const segmentLength = Buffer.alloc(2)
  segmentLength.writeUInt16BE(segmentData.length + 2)

  return Buffer.concat([Buffer.from([0xff, 0xed]), segmentLength, segmentData])
}

function buildXmpBlock(title: string | null, caption: string | null): Buffer {
  const parts: string[] = []
  if (title) {
    parts.push(
      `<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(title)}</rdf:li></rdf:Alt></dc:title>`
    )
  }
  if (caption) {
    parts.push(
      `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(caption)}</rdf:li></rdf:Alt></dc:description>`
    )
  }
  if (parts.length === 0) return Buffer.alloc(0)

  const xmpPacket = [
    `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>`,
    `<x:xmpmeta xmlns:x="adobe:ns:meta/"`,
    `  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"`,
    `  xmlns:dc="http://purl.org/dc/elements/1.1/">`,
    `  <rdf:RDF><rdf:Description rdf:about="">`,
    ...parts.map((p) => `    ${p}`),
    `  </rdf:Description></rdf:RDF>`,
    `</x:xmpmeta>`,
    `<?xpacket end="w"?>`,
  ].join('\n')

  const namespace = Buffer.from('http://ns.adobe.com/xap/1.0/\0')
  const xmpData = Buffer.from(xmpPacket, 'utf8')
  const segmentData = Buffer.concat([namespace, xmpData])
  const segmentLength = Buffer.alloc(2)
  segmentLength.writeUInt16BE(segmentData.length + 2)

  return Buffer.concat([Buffer.from([0xff, 0xe1]), segmentLength, segmentData])
}

// XMP standard namespace identifier (APP1 marker data prefix)
const XMP_NS = Buffer.from('http://ns.adobe.com/xap/1.0/\0')

/**
 * Injects IPTC (APP13) and XMP (APP1) metadata into a JPEG buffer.
 *
 * Lightroom-exported JPEGs already contain APP13 and XMP blocks. Naively
 * prepending new segments means readers encounter two conflicting sets and
 * use the existing (empty) Lightroom values. This function walks the JPEG
 * segment chain, strips any existing APP13 (IPTC) and standard XMP APP1
 * blocks, then inserts our segments — after the APP0/JFIF header if present,
 * otherwise directly after SOI. EXIF APP1 and all other segments are
 * preserved unchanged.
 *
 * Non-JPEG buffers are returned unchanged.
 */
export function injectJpegMetadata(
  buffer: Buffer,
  title: string | null,
  caption: string | null
): Buffer {
  if (!title && !caption) return buffer
  if (buffer.length < 2 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return buffer

  const iptc = buildIptcBlock(title, caption)
  const xmp = buildXmpBlock(title, caption)
  if (iptc.length === 0 && xmp.length === 0) return buffer

  // Walk the JPEG segment chain up to SOS (Start of Scan). Collect all
  // segments except APP13 (IPTC) and XMP APP1, which we replace with ours.
  const kept: Buffer[] = []
  let insertAt = 0 // index in `kept` after which our segments are injected
  let offset = 2   // start past SOI

  while (offset + 1 < buffer.length) {
    if (buffer[offset] !== 0xff) break

    const marker = buffer[offset + 1]

    // Standalone markers carry no length field
    if (
      marker === 0xd9 || // EOI
      marker === 0x01 || // TEM
      (marker >= 0xd0 && marker <= 0xd7) // RST0–RST7
    ) {
      kept.push(buffer.subarray(offset, offset + 2))
      offset += 2
      continue
    }

    // SOS signals the start of compressed image data — stop parsing
    if (marker === 0xda) break

    // All other markers have a 2-byte length immediately after the marker
    if (offset + 3 >= buffer.length) break
    const segLen = buffer.readUInt16BE(offset + 2) // includes the 2 length bytes
    const segEnd = offset + 2 + segLen
    if (segEnd > buffer.length) break

    const isApp13 = marker === 0xed // Photoshop / IPTC
    const isXmpApp1 =
      marker === 0xe1 &&
      segLen >= 2 + XMP_NS.length &&
      buffer.subarray(offset + 4, offset + 4 + XMP_NS.length).equals(XMP_NS)

    if (!isApp13 && !isXmpApp1) {
      kept.push(buffer.subarray(offset, segEnd))
      // Inject our metadata after APP0 (JFIF header) for spec compliance.
      // insertAt stays 0 (inject right after SOI) if no APP0 is present.
      if (marker === 0xe0) insertAt = kept.length
    }
    // else: drop — these are the existing IPTC/XMP blocks we're replacing

    offset = segEnd
  }

  return Buffer.concat([
    buffer.subarray(0, 2),      // SOI
    ...kept.slice(0, insertAt), // APP0 (if any)
    iptc,                       // our IPTC (APP13)
    xmp,                        // our XMP (APP1)
    ...kept.slice(insertAt),    // EXIF APP1 + all remaining segments
    buffer.subarray(offset),    // SOS header + compressed image data + EOI
  ])
}
