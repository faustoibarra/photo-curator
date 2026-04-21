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

  if (title) addTag(5, title)    // Object Name (IIM 2:05)
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
    `<?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?>`,
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

/**
 * Injects IPTC (APP13) and XMP (APP1) metadata into a JPEG buffer.
 * Segments are inserted immediately after the SOI marker.
 * Non-JPEG buffers are returned unchanged.
 */
export function injectJpegMetadata(
  buffer: Buffer,
  title: string | null,
  caption: string | null
): Buffer {
  if (!title && !caption) return buffer
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return buffer

  const iptc = buildIptcBlock(title, caption)
  const xmp = buildXmpBlock(title, caption)

  return Buffer.concat([
    buffer.subarray(0, 2), // SOI
    iptc,
    xmp,
    buffer.subarray(2),   // rest of JPEG
  ])
}
