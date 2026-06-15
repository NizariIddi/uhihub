import { Router } from 'express'
import { Op } from 'sequelize'
import { NoteRequest, Note, User, Notification } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'
import { uploadPdf, UPLOADS_DIR } from '../middleware/upload.js'
import path from 'path'

const router = Router()

// GET /api/marketplace — list all requests
router.get('/', authenticate, async (req, res) => {
  try {
    const { university, status, search, page = 1, limit = 20 } = req.query
    const where = {}
    if (university) where.university = university
    if (status)     where.status     = status
    if (search)     where[Op.or]     = [
      { courseName: { [Op.like]: `%${search}%` } },
      { courseCode: { [Op.like]: `%${search}%` } },
    ]
    const { count, rows } = await NoteRequest.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit:  Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      include: [{ model: User, as: 'requester', attributes: ['id','firstName','lastName','university'] }],
    })
    res.json({ requests: rows, total: count, pages: Math.ceil(count / Number(limit)) })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/marketplace/:id — single request + fulfillments
router.get('/:id', authenticate, async (req, res) => {
  try {
    const req_ = await NoteRequest.findByPk(req.params.id, {
      include: [{ model: User, as: 'requester', attributes: ['id','firstName','lastName'] }],
    })
    if (!req_) return res.status(404).json({ message: 'Request not found.' })
    // Find notes that reference this request via description matching courseCode+university
    const notes = await Note.findAll({
      where: {
        courseCode: req_.courseCode,
        university: req_.university,
      },
      order: [['created_at','DESC']],
      include: [{ model: User, as: 'uploadedBy', attributes: ['id','firstName','lastName'] }],
    })
    res.json({ request: req_, notes })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/marketplace — create a request
router.post('/', authenticate, async (req, res) => {
  try {
    const { courseCode, courseName, university, faculty, description } = req.body
    if (!courseCode || !courseName || !university) {
      return res.status(400).json({ message: 'courseCode, courseName and university are required.' })
    }
    const request = await NoteRequest.create({
      userId: req.user.id, courseCode, courseName, university,
      faculty: faculty || null, description: description || null,
    })
    const full = await NoteRequest.findByPk(request.id, {
      include: [{ model: User, as: 'requester', attributes: ['id','firstName','lastName','university'] }],
    })
    res.status(201).json(full)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/marketplace/:id/fulfill — upload notes to fulfill a request
router.post('/:id/fulfill', authenticate,
  (req, res, next) => { req.uploadFolder = 'notes'; next() },
  uploadPdf.single('file'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'PDF file required.' })
      const request = await NoteRequest.findByPk(req.params.id)
      if (!request) return res.status(404).json({ message: 'Request not found.' })

      const { title, description } = req.body
      if (!title?.trim()) return res.status(400).json({ message: 'Title is required.' })

      // Create the note linked to this request
      const note = await Note.create({
        title:       title.trim(),
        description: description?.trim() || `Fulfillment for request: ${request.courseName}`,
        university:  request.university,
        faculty:     request.faculty || null,
        courseCode:  request.courseCode,
        fileUrl:     `/uploads/notes/${req.file.filename}`,
        uploadedById: req.user.id,
      })

      // Update request status and count
      await request.increment('fulfillCount')
      if (request.status === 'open') {
        await request.update({ status: 'fulfilled' })
      }

      // Notify the requester
      if (request.userId !== req.user.id) {
        await Notification.create({
          userId: request.userId,
          type:   'REQUEST_FULFILLED',
          title:  `Your request for ${request.courseName} was fulfilled!`,
          body:   `${req.user.firstName} uploaded notes: "${note.title}"`,
          link:   `/pages/notes.html`,
        })
      }

      res.status(201).json({ note, request: await NoteRequest.findByPk(request.id) })
    } catch (err) { res.status(500).json({ message: err.message }) }
  }
)

// DELETE /api/marketplace/:id — delete own request
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const request = await NoteRequest.findByPk(req.params.id)
    if (!request) return res.status(404).json({ message: 'Not found.' })
    if (request.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized.' })
    }
    await request.destroy()
    res.json({ message: 'Request deleted.' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

export default router
