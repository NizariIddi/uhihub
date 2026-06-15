import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

// src/middleware/upload.js
// __dirname = .../backend/src/middleware
// go up 3 levels:  middleware -> src -> backend, then into uploads
export const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads')

// Create folders on startup and print so we can verify
fs.mkdirSync(path.join(UPLOADS_DIR, 'exams'), { recursive: true })
fs.mkdirSync(path.join(UPLOADS_DIR, 'notes'), { recursive: true })
console.log('[UPLOADS_DIR]', UPLOADS_DIR)

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const folder = req.uploadFolder || 'misc'
    const dir    = path.join(UPLOADS_DIR, folder)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf'
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})

export const uploadPdf = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB to support PPT files
  fileFilter(req, file, cb) {
    const name = file.originalname.toLowerCase()
    const isPdf = name.endsWith('.pdf')
    const isPpt = name.endsWith('.ppt') || name.endsWith('.pptx') || name.endsWith('.pptm')
    const okMime = [
      'application/pdf','application/x-pdf','binary/octet-stream','application/octet-stream',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
    ]
    if (isPdf || isPpt || okMime.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Only PDF or PowerPoint files accepted. Got: ${file.mimetype}`))
    }
  },
})
