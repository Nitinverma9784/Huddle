import mammoth from 'mammoth'

export interface ParsedDocument {
  text: string
  characterCount: number
  wordCount: number
  warning?: string
}

/**
 * Extracts plain text server-side from supported document types:
 * - PDF
 * - DOCX (via mammoth)
 * - TXT
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ParsedDocument> {
  let extracted = ''

  const lowerName = filename.toLowerCase()

  if (mimeType.includes('pdf') || lowerName.endsWith('.pdf')) {
    try {
      // Dynamic import supporting both pdf-parse v2 (PDFParse class) and v1 (function)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const importedPdf = (await import('pdf-parse')) as any
      if (typeof importedPdf.PDFParse === 'function') {
        const parser = new importedPdf.PDFParse({ data: buffer })
        const result = await parser.getText()
        extracted = result?.text || ''
        await parser.destroy().catch(() => {})
      } else if (typeof importedPdf === 'function') {
        const data = await importedPdf(buffer)
        extracted = data?.text || ''
      } else if (typeof importedPdf.default === 'function') {
        const data = await importedPdf.default(buffer)
        extracted = data?.text || ''
      } else {
        throw new Error('Unsupported pdf-parse module format')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`Failed to parse PDF file: ${msg}`)
    }
  } else if (
    mimeType.includes('wordprocessingml') ||
    mimeType.includes('docx') ||
    lowerName.endsWith('.docx')
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer })
      extracted = result.value || ''
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`Failed to parse Word document (.docx): ${msg}`)
    }
  } else if (
    mimeType.includes('presentationml') ||
    mimeType.includes('pptx') ||
    lowerName.endsWith('.pptx')
  ) {
    // Basic text extraction for PPTX XML or fallback
    try {
      const content = buffer.toString('utf-8')
      const matches = content.match(/<a:t>([^<]+)<\/a:t>/g)
      if (matches && matches.length > 0) {
        extracted = matches.map((m) => m.replace(/<\/?a:t>/g, '')).join(' ')
      } else {
        extracted = buffer.toString('ascii').replace(/[^\x20-\x7E\t\n\r]/g, ' ')
      }
    } catch {
      extracted = buffer.toString('utf-8')
    }
  } else {
    // Plain text or markdown
    extracted = buffer.toString('utf-8')
  }

  // Sanitize text
  const cleaned = extracted
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const wordCount = cleaned.split(/\s+/).filter(Boolean).length
  let warning: string | undefined

  if (cleaned.length < 50) {
    warning = 'The document text appears very short. Generated quiz questions might be generic.'
  }

  return {
    text: cleaned,
    characterCount: cleaned.length,
    wordCount,
    warning,
  }
}
