import { Router } from 'express'
import path from 'path'
import { Op } from 'sequelize'
import { Exam, User, Activity, Notification } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'
import { uploadPdf, UPLOADS_DIR } from '../middleware/upload.js'

const router = Router()

// GET /api/exams
router.get('/', authenticate, async (req, res) => {
  try {
    const { university, faculty, year, search, limit, examType } = req.query
    const where = {}
    if (university) where.university = university
    if (faculty)    where.faculty    = faculty
    if (year)       where.year       = Number(year)
    if (examType)   where.examType   = examType
    if (search)     where[Op.or]     = [
      { courseName: { [Op.like]: `%${search}%` } },
      { courseCode: { [Op.like]: `%${search}%` } },
    ]
    let exams
    try {
      exams = await Exam.findAll({
        where,
        order: [['is_featured','DESC'],['created_at','DESC']],
        ...(limit ? { limit: Math.min(Number(limit), 100) } : {}),
        include: [{ model: User, as: 'uploadedBy', attributes: ['id','firstName','lastName'] }],
      })
    } catch (err) {
      // If examType column doesn't exist yet (pre-seed), retry without it
      if (err.message?.includes('examType') || err.message?.includes('exam_type')) {
        delete where.examType
        exams = await Exam.findAll({
          where,
          order: [['is_featured','DESC'],['created_at','DESC']],
          ...(limit ? { limit: Math.min(Number(limit), 100) } : {}),
          include: [{ model: User, as: 'uploadedBy', attributes: ['id','firstName','lastName'] }],
        })
      } else {
        throw err
      }
    }
    res.json({ exams })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/exams/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const exam = await Exam.findByPk(req.params.id, {
      include: [{ model: User, as: 'uploadedBy', attributes: ['id','firstName','lastName'] }],
    })
    if (!exam) return res.status(404).json({ message: 'Exam not found.' })
    await exam.increment('viewCount')
    res.json(exam)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/exams — upload
router.post('/', authenticate, (req, res, next) => {
  req.uploadFolder = 'exams'
  uploadPdf.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message })
    next()
  })
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file received.' })
    const { courseName, courseCode, university, faculty, year, moduleId, examType } = req.body
    if (!courseName?.trim()) return res.status(400).json({ message: 'Course name required.' })
    if (!university)         return res.status(400).json({ message: 'University required.' })
    if (!year)               return res.status(400).json({ message: 'Year required.' })

    const exam = await Exam.create({
      courseName: courseName.trim(), courseCode: courseCode?.trim()||null,
      university, faculty: faculty?.trim()||null, year: Number(year),
      fileUrl: `/uploads/exams/${req.file.filename}`, fileSize: req.file.size,
      uploadedById: req.user.id, moduleId: moduleId||null, examType: examType||'UE',
    })
    await Activity.create({ userId: req.user.id, type: 'EXAM_UPLOAD', title: exam.courseName })

    // Notify users at the same university (background, don't await)
    User.findAll({ where: { university, id: { [Op.ne]: req.user.id } }, attributes: ['id'] })
      .then(users => {
        const notifs = users.map(u => ({
          userId: u.id, type: 'NEW_EXAM',
          title: `New exam: ${exam.courseName}`,
          body:  `${(university||'').toUpperCase()} · ${year}`,
          link:  `/pages/exam-viewer.html?id=${exam.id}`,
        }))
        if (notifs.length) Notification.bulkCreate(notifs).catch(console.error)
      }).catch(console.error)

    console.log('[UPLOAD] Exam:', exam.courseName, '→', req.file.path)
    res.status(201).json(exam)
  } catch (err) { console.error('[EXAM POST]', err.message); res.status(500).json({ message: err.message }) }
})

// GET /api/exams/:id/file
router.get('/:id/file', authenticate, async (req, res) => {
  try {
    const exam = await Exam.findByPk(req.params.id)
    if (!exam) return res.status(404).json({ message: 'Exam not found.' })
    const fp = path.join(UPLOADS_DIR, 'exams', path.basename(exam.fileUrl))
    res.setHeader('Content-Type','application/pdf')
    res.setHeader('Content-Disposition','inline')
    res.sendFile(fp, err => { if (err && !res.headersSent) res.status(404).json({ message: 'File not found.' }) })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/exams/:id/download
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const exam = await Exam.findByPk(req.params.id)
    if (!exam) return res.status(404).json({ message: 'Exam not found.' })
    await exam.increment('downloadCount')
    await Activity.create({ userId: req.user.id, type: 'EXAM_DOWNLOAD', title: exam.courseName })
    const fp = path.join(UPLOADS_DIR, 'exams', path.basename(exam.fileUrl))
    res.download(fp, `${exam.courseName}-${exam.year}.pdf`, err => { if (err && !res.headersSent) res.status(404).json({ message: 'File not found.' }) })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

export default router
