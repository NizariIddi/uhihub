import { Router } from 'express'
import { Op } from 'sequelize'
import { Course, Exam, Note, Review, User } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

function adminOnly(req, res, next) {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin only.' })
  next()
}

// GET /api/courses — list / search courses
router.get('/', authenticate, async (req, res) => {
  try {
    const { university, faculty, search, page = 1, limit = 30 } = req.query
    const where = {}
    if (university) where.university = university
    if (faculty)    where.faculty    = faculty
    if (search)     where[Op.or]     = [
      { courseName: { [Op.like]: `%${search}%` } },
      { courseCode: { [Op.like]: `%${search}%` } },
    ]
    const { count, rows } = await Course.findAndCountAll({
      where,
      order: [['faculty','ASC'],['courseName','ASC']],
      limit:  Number(limit),
      offset: (Number(page) - 1) * Number(limit),
    })
    res.json({ courses: rows, total: count, pages: Math.ceil(count / Number(limit)) })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/courses/faculties?university=udsm — distinct faculties for a university
router.get('/faculties', authenticate, async (req, res) => {
  try {
    const { university } = req.query
    const where = university ? { university } : {}
    const results = await Course.findAll({
      where,
      attributes: ['faculty'],
      group: ['faculty'],
      order: [['faculty','ASC']],
    })
    res.json({ faculties: results.map(r => r.faculty) })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/courses/:id — single course with exams, notes, reviews
router.get('/:id', authenticate, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id)
    if (!course) return res.status(404).json({ message: 'Course not found.' })

    const [exams, notes, reviews] = await Promise.all([
      Exam.findAll({
        where: { courseCode: course.courseCode, university: course.university },
        order: [['year','DESC']],
        include: [{ model: User, as: 'uploadedBy', attributes: ['id','firstName','lastName'] }],
      }),
      Note.findAll({
        where: { courseCode: course.courseCode, university: course.university },
        order: [['created_at','DESC']],
        include: [{ model: User, as: 'uploadedBy', attributes: ['id','firstName','lastName'] }],
      }),
      Review.findAll({
        where: { courseCode: course.courseCode, university: course.university },
        order: [['created_at','DESC']],
        include: [{ model: User, as: 'author', attributes: ['id','firstName','lastName'] }],
      }),
    ])

    const avg = reviews.length ? {
      difficulty:     +(reviews.reduce((s,r) => s+r.difficulty,0)     / reviews.length).toFixed(1),
      lecturerRating: +(reviews.reduce((s,r) => s+r.lecturerRating,0) / reviews.length).toFixed(1),
      overallRating:  +(reviews.reduce((s,r) => s+r.overallRating,0)  / reviews.length).toFixed(1),
    } : null

    res.json({ course, exams, notes, reviews, avg })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/courses — admin: create course
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { courseCode, courseName, university, faculty, year, semester, description, credits } = req.body
    if (!courseCode || !courseName || !university || !faculty) {
      return res.status(400).json({ message: 'courseCode, courseName, university and faculty are required.' })
    }
    const existing = await Course.findOne({ where: { courseCode, university } })
    if (existing) return res.status(409).json({ message: 'Course already exists for this university.' })
    const course = await Course.create({ courseCode, courseName, university, faculty, year, semester, description, credits })
    res.status(201).json(course)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// PUT /api/courses/:id — admin: edit course
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id)
    if (!course) return res.status(404).json({ message: 'Not found.' })
    const { courseCode, courseName, university, faculty, year, semester, description, credits } = req.body
    await course.update({ courseCode, courseName, university, faculty, year, semester, description, credits })
    res.json(course)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// DELETE /api/courses/:id — admin
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await Course.destroy({ where: { id: req.params.id } })
    res.json({ message: 'Deleted.' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

export default router
