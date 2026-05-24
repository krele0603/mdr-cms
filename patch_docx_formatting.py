path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/api/qms-templates/route.ts'
with open(path, 'r') as f:
    content = f.read()

# Replace the mammoth import section with the enhanced version
old = """    try {
      const mammoth   = await import('mammoth')
      const buffer    = Buffer.from(await file.arrayBuffer())
      const result    = await mammoth.convertToHtml({ buffer })
      // Return raw HTML to the client — TipTap parses it natively
      // This is more reliable than any custom HTML→JSON converter
      if (preview) {
        return NextResponse.json({
          name,
          level,
          html: result.value,           // raw HTML for TipTap setContent()
          warnings: result.messages,
        })
      }"""

new = """    try {
      const mammoth   = await import('mammoth')
      const JSZip     = (await import('jszip')).default
      const buffer    = Buffer.from(await file.arrayBuffer())

      // ── Extract alignment + color from raw DOCX XML ───────────────────────
      // Mammoth discards these — we read them directly from word/document.xml
      const zip = await JSZip.loadAsync(buffer)
      const xmlFile = zip.file('word/document.xml')
      const styleXmlFile = zip.file('word/styles.xml')
      const docXml = xmlFile ? await xmlFile.async('text') : ''
      const styleXml = styleXmlFile ? await styleXmlFile.async('text') : ''

      // Parse paragraph and run formatting from XML
      interface ParaStyle { align?: string }
      interface RunStyle { color?: string }
      interface ParaData { style: ParaStyle; runs: RunStyle[] }

      function extractParaStyles(xml: string): ParaData[] {
        const paras: ParaData[] = []
        // Match each paragraph block
        const paraRegex = /<w:p[ >][\s\S]*?<\/w:p>/g
        let pm
        while ((pm = paraRegex.exec(xml)) !== null) {
          const paraXml = pm[0]
          // Alignment: <w:jc w:val="center"/> or "right" or "both"
          const alignMatch = paraXml.match(/<w:jc[^>]*w:val="([^"]+)"/)
          const align = alignMatch ? alignMatch[1] : undefined

          // Runs: extract color per run
          const runs: RunStyle[] = []
          const runRegex = /<w:r[ >][\s\S]*?<\/w:r>/g
          let rm
          while ((rm = runRegex.exec(paraXml)) !== null) {
            const runXml = rm[0]
            // Color: <w:color w:val="FF0000"/> — skip "auto" and "000000"
            const colorMatch = runXml.match(/<w:color[^>]*w:val="([^"]+)"/)
            const color = colorMatch && colorMatch[1] !== 'auto' && colorMatch[1] !== '000000'
              ? '#' + colorMatch[1]
              : undefined
            runs.push({ color })
          }

          paras.push({ style: { align }, runs })
        }
        return paras
      }

      const paraStyles = extractParaStyles(docXml)

      // ── Run mammoth for content/structure ────────────────────────────────
      const result = await mammoth.convertToHtml({ buffer })
      let html = result.value

      // ── Post-process HTML: inject alignment and color styles ──────────────
      // Match mammoth's block elements in order and apply styles from paraStyles
      // We process paragraphs and headings — tables are handled separately
      let paraIndex = 0

      // Process each block-level element and inject styles
      html = html.replace(
        /<(p|h[1-6])([^>]*)>([\s\S]*?)<\/\1>/gi,
        (match: string, tag: string, attrs: string, inner: string) => {
          const para = paraStyles[paraIndex++]
          if (!para) return match

          const styles: string[] = []

          // Alignment
          if (para.style.align) {
            const alignMap: Record<string, string> = {
              center: 'center',
              right: 'right',
              both: 'justify',
              left: 'left',
            }
            const textAlign = alignMap[para.style.align]
            if (textAlign && textAlign !== 'left') {
              styles.push(`text-align:${textAlign}`)
            }
          }

          let result = match

          // Apply paragraph-level styles
          if (styles.length > 0) {
            const styleStr = styles.join(';')
            result = `<${tag}${attrs} style="${styleStr}">${inner}</${tag}>`
          }

          // Apply run-level colors — match <strong>, <em>, or plain text spans
          // For simplicity: if all runs have same color, apply to whole paragraph
          const colors = para.runs.map((r: RunStyle) => r.color).filter(Boolean)
          if (colors.length > 0) {
            // Find dominant color (most frequent)
            const colorCount: Record<string, number> = {}
            colors.forEach((c: string | undefined) => { if (c) colorCount[c] = (colorCount[c] || 0) + 1 })
            const dominantColor = Object.entries(colorCount).sort((a, b) => b[1] - a[1])[0]?.[0]
            if (dominantColor) {
              // Inject color into existing style or add new style
              result = result.replace(
                new RegExp(`<${tag}([^>]*?)>`),
                (m: string, existingAttrs: string) => {
                  if (existingAttrs.includes('style="')) {
                    return m.replace('style="', `style="color:${dominantColor};`)
                  }
                  return `<${tag}${existingAttrs} style="color:${dominantColor}">`
                }
              )
            }
          }

          return result
        }
      )

      // Return enhanced HTML to the client
      if (preview) {
        return NextResponse.json({
          name,
          level,
          html,
          warnings: result.messages,
        })
      }"""

if old in content:
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print('Patched successfully')
else:
    print('ERROR: string not found')
