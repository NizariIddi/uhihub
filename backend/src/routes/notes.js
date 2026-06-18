import { Router } from 'express'
import path from 'path'
import { Op } from 'sequelize'
import { Note, User, Activity, Notification } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'
import { uploadPdf, UPLOADS_DIR } from '../middleware/upload.js'

const router = Router()

router.get('/', authenticate, async (req, res) => {
  try {
    const { university, faculty, search } = req.query
    const where = {}
    if (university) where.university = university
    if (faculty)    where.faculty    = faculty
    if (search)     where[Op.or]     = [
      { title:      { [Op.like]: `%${search}%` } },
      { courseCode: { [Op.like]: `%${search}%` } },
    ]
    const notes = await Note.findAll({
      where,
      order: [['isFeatured','DESC'],['createdAt','DESC']],
      include: [{ model: User, as: 'uploadedBy', attributes: ['id','firstName','lastName'] }],
    })
    res.json({ notes })
  } catch (err) {
    console.error('[NOTES GET]', err.message)
    res.status(500).json({ message: err.message })
  }
})

router.get('/:id', authenticate, async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.id, {
      include: [{ model: User, as: 'uploadedBy', attributes: ['id','firstName','lastName'] }],
    })
    if (!note) return res.status(404).json({ message: 'Note not found.' })
    res.json(note)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.post('/', authenticate, (req, res, next) => {
  req.uploadFolder = 'notes'
  uploadPdf.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message })
    next()
  })
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file received.' })
    const { title, description, university, faculty, courseCode, moduleId } = req.body
    if (!title?.trim())  return res.status(400).json({ message: 'Title required.' })
    if (!university)     return res.status(400).json({ message: 'University required.' })

    const origName = req.file.originalname.toLowerCase()
    const fileType = (origName.endsWith('.ppt')||origName.endsWith('.pptx')||origName.endsWith('.pptm')) ? 'ppt' : 'pdf'
    const note = await Note.create({
      title: title.trim(), description: description?.trim()||null,
      university, faculty: faculty?.trim()||null, courseCode: courseCode?.trim()||null,
      fileUrl: `/uploads/notes/${req.file.filename}`, uploadedById: req.user.id,
      moduleId: moduleId||null, fileType,
    })
    await Activity.create({ userId: req.user.id, type: 'NOTE_UPLOAD', title: note.title })

    User.findAll({ where: { university, id: { [Op.ne]: req.user.id } }, attributes: ['id'] })
      .then(users => {
        const notifs = users.map(u => ({
          userId: u.id, type: 'NEW_NOTE',
          title: `New notes: ${note.title}`,
          body:  `${(university||'').toUpperCase()}${courseCode?' · '+courseCode:''}`,
          link:  `/pages/note-viewer.html?id=${note.id}`,
        }))
        if (notifs.length) Notification.bulkCreate(notifs).catch(console.error)
      }).catch(console.error)

    console.log('[UPLOAD] Note:', note.title, '→', req.file.path)
    res.status(201).json(note)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.get('/:id/file', authenticate, async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.id)
    if (!note) return res.status(404).json({ message: 'Note not found.' })
    const fp = path.join(UPLOADS_DIR, 'notes', path.basename(note.fileUrl))
    const isPpt = note.fileType === 'ppt'
    const contentType = isPpt
      ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      : 'application/pdf'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', 'inline')
    res.sendFile(fp, err => { if (err && !res.headersSent) res.status(404).json({ message: 'File not found.' }) })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.id)
    if (!note) return res.status(404).json({ message: 'Note not found.' })
    await note.increment('downloadCount')
    await Activity.create({ userId: req.user.id, type: 'NOTE_DOWNLOAD', title: note.title })
    const fp = path.join(UPLOADS_DIR, 'notes', path.basename(note.fileUrl))
    const ext = note.fileType === 'ppt' ? '.pptx' : '.pdf'
    const safeTitle = note.title.replace(/[^a-z0-9 _-]/gi, '_')
    res.download(fp, `${safeTitle}${ext}`, err => { if (err && !res.headersSent) res.status(404).json({ message: 'File not found.' }) })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

export default router
