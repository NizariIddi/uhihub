/**
 * convertPpt.js
 * Converts a PowerPoint file (.ppt/.pptx) to PDF using LibreOffice.
 *
 * LibreOffice must be installed on the server:
 *   Ubuntu/Debian:  sudo apt-get install -y libreoffice
 *   macOS:          brew install --cask libreoffice
 *   Or download from: https://www.libreoffice.org/download/
 *
 * Returns the path to the new PDF, or null if conversion fails / LibreOffice not installed.
 */

import { execFile } from 'child_process'
import path from 'path'
import fs from 'fs'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/**
 * Check whether LibreOffice (or soffice) is available on this machine.
 * Returns the command to use, or null if not found.
 */
async function findLibreOffice() {
  const candidates = ['libreoffice', 'soffice', '/usr/bin/libreoffice', '/usr/bin/soffice',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice']
  for (const cmd of candidates) {
    try {
      await execFileAsync(cmd, ['--version'])
      return cmd
    } catch {}
  }
  return null
}

/**
 * Convert a PPT/PPTX file to PDF.
 * @param {string} inputPath  - absolute path to the .ppt/.pptx file
 * @returns {string|null}     - absolute path to the generated .pdf, or null on failure
 */
export async function convertPptToPdf(inputPath) {
  try {
    const cmd = await findLibreOffice()
    if (!cmd) {
      console.warn('[PPT→PDF] LibreOffice not found. Keeping original PPT file.')
      console.warn('[PPT→PDF] Install with: sudo apt-get install -y libreoffice')
      return null
    }

    const dir = path.dirname(inputPath)
    const base = path.basename(inputPath, path.extname(inputPath))

    // LibreOffice --headless --convert-to pdf <file> --outdir <dir>
    await execFileAsync(cmd, [
      '--headless',
      '--convert-to', 'pdf',
      '--outdir', dir,
      inputPath,
    ], {
      timeout: 60000,  // 60 second timeout
      env: { ...process.env, HOME: '/tmp' },  // LibreOffice needs a writable HOME
    })

    const pdfPath = path.join(dir, base + '.pdf')
    if (fs.existsSync(pdfPath)) {
      console.log('[PPT→PDF] Converted:', path.basename(inputPath), '→', path.basename(pdfPath))
      return pdfPath
    }

    console.warn('[PPT→PDF] Conversion ran but output PDF not found at:', pdfPath)
    return null
  } catch (err) {
    console.warn('[PPT→PDF] Conversion failed:', err.message)
    return null
  }
}
