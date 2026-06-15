import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import archiver from 'archiver'
import { Exam, Activity } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'
import { UPLOADS_DIR } from '../middleware/upload.js'

const router = Router()

// GET /api/download/exams?courseCode=EMA201&university=udsm
// Downloads a ZIP of all exam PDFs for that course code
router.get('/exams', authenticate, async (req, res) => {
  try {
    const { courseCode, university } = req.query
    if (!courseCode) return res.status(400).json({ message: 'courseCode is required.' })

    const where = { courseCode }
    if (university) where.university = university

    const exams = await Exam.findAll({ where, order: [['year','DESC']] })

    if (!exams.length) {
      return res.status(404).json({ message: 'No exams found for this course code.' })
    }

    // Check all files exist
    const files = exams.map(e => ({
      exam: e,
      filePath: path.join(UPLOADS_DIR, 'exams', path.basename(e.fileUrl)),
    })).filter(f => fs.existsSync(f.filePath))

    if (!files.length) {
      return res.status(404).json({ message: 'No PDF files found on disk for this course.' })
    }

    const zipName = `${courseCode.replace(/\s+/g, '_')}_exams.zip`
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`)

    const archive = archiver('zip', { zlib: { level: 6 } })
    archive.on('error', err => { console.error('[ZIP]', err.message) })
    archive.pipe(res)

    for (const { exam, filePath } of files) {
      const name = `${exam.courseName} - ${exam.year}.pdf`
        .replace(/[/\\?%*:|"<>]/g, '-')
      archive.file(filePath, { name })
    }

    await archive.finalize()

    // Log activity (don't await — response is streaming)
    Activity.create({
      userId: req.user.id,
      type:   'BULK_DOWNLOAD',
      title:  `Downloaded ${files.length} exams for ${courseCode}`,
    }).catch(console.error)

  } catch (err) {
    console.error('[BULK DOWNLOAD]', err.message)
    if (!res.headersSent) res.status(500).json({ message: err.message })
  }
})

export default router
