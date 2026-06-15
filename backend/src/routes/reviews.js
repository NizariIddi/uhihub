import { Router } from 'express'
import { Op } from 'sequelize'
import { Review, User } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// GET /api/reviews?courseCode=xxx&university=xxx
router.get('/', authenticate, async (req, res) => {
  try {
    const { courseCode, university, faculty, page = 1, limit = 50 } = req.query
    const where = {}
    if (courseCode) where.courseCode = courseCode
    if (university) where.university = university
    if (faculty)    where.faculty    = faculty
    const { count, rows } = await Review.findAndCountAll({
      where,
      order: [['created_at','DESC']],
      limit: Number(limit),
      offset: (Number(page)-1) * Number(limit),
      include: [{ model: User, as: 'author', attributes: ['firstName','lastName','university'] }],
    })
    // Compute averages
    const avg = rows.length ? {
      difficulty:     +(rows.reduce((s,r) => s+r.difficulty,0)     / rows.length).toFixed(1),
      lecturerRating: +(rows.reduce((s,r) => s+r.lecturerRating,0) / rows.length).toFixed(1),
      overallRating:  +(rows.reduce((s,r) => s+r.overallRating,0)  / rows.length).toFixed(1),
    } : null
    res.json({ reviews: rows, total: count, avg })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/reviews/my
router.get('/my', authenticate, async (req, res) => {
  try {
    const reviews = await Review.findAll({ where: { userId: req.user.id }, order: [['created_at','DESC']] })
    res.json({ reviews })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/reviews
router.post('/', authenticate, async (req, res) => {
  try {
    const { courseCode, courseName, university, difficulty, lecturerRating, overallRating, comment, semester, faculty } = req.body
    if (!courseCode || !courseName || !university) return res.status(400).json({ message: 'courseCode, courseName and university are required.' })
    if (!difficulty || !lecturerRating || !overallRating) return res.status(400).json({ message: 'All ratings are required.' })
    // One review per user per course
    const existing = await Review.findOne({ where: { userId: req.user.id, courseCode, university } })
    if (existing) return res.status(409).json({ message: 'You have already reviewed this course. Delete your old review to submit a new one.' })
    const review = await Review.create({
      userId: req.user.id, courseCode, courseName, university,
      difficulty: Number(difficulty), lecturerRating: Number(lecturerRating), overallRating: Number(overallRating),
      comment, semester, faculty: faculty||null,
    })
    const full = await Review.findByPk(review.id, {
      include: [{ model: User, as: 'author', attributes: ['firstName','lastName','university'] }],
    })
    res.status(201).json(full)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// DELETE /api/reviews/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const r = await Review.findByPk(req.params.id)
    if (!r) return res.status(404).json({ message: 'Review not found.' })
    if (r.userId !== req.user.id && !req.user.isAdmin) return res.status(403).json({ message: 'Not authorized.' })
    await r.destroy()
    res.json({ message: 'Review deleted.' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

export default router
