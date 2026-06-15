import { Router } from 'express'
import { Op } from 'sequelize'
import { Exam, Note, Internship } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// GET /api/search?q=...&type=all|exams|notes|internships
router.get('/', authenticate, async (req, res) => {
  try {
    const { q, type = 'all' } = req.query
    if (!q || q.trim().length < 2) return res.status(400).json({ message: 'Query must be at least 2 characters.' })

    const term = q.trim()
    const like = { [Op.like]: `%${term}%` }
    const results = {}

    if (type === 'all' || type === 'exams') {
      results.exams = await Exam.findAll({
        where: { [Op.or]: [{ courseName: like }, { courseCode: like }, { university: like }, { faculty: like }] },
        order: [['created_at', 'DESC']],
        limit: 20,
      })
    }

    if (type === 'all' || type === 'notes') {
      results.notes = await Note.findAll({
        where: { [Op.or]: [{ title: like }, { courseCode: like }, { university: like }, { faculty: like }] },
        order: [['created_at', 'DESC']],
        limit: 20,
      })
    }

    if (type === 'all' || type === 'internships') {
      results.internships = await Internship.findAll({
        where: { isActive: true, [Op.or]: [{ title: like }, { company: like }, { industry: like }, { location: like }] },
        order: [['created_at', 'DESC']],
        limit: 20,
      })
    }

    const total = (results.exams?.length || 0) + (results.notes?.length || 0) + (results.internships?.length || 0)
    res.json({ query: term, total, ...results })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

export default router
