import { Router } from 'express'
import { Op } from 'sequelize'
import { Internship, Application } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, async (req, res) => {
  try {
    const { industry, type, search } = req.query
    const where = { isActive: true }
    if (industry) where.industry = industry
    if (type)     where.type     = type
    if (search)   where[Op.or]   = [
      { title:   { [Op.like]: `%${search}%` } },
      { company: { [Op.like]: `%${search}%` } },
    ]
    const internships = await Internship.findAll({ where, order: [['created_at', 'DESC']] })
    res.json({ internships })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.get('/:id', authenticate, async (req, res) => {
  try {
    const i = await Internship.findByPk(req.params.id)
    if (!i) return res.status(404).json({ message: 'Not found.' })
    res.json(i)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.post('/:id/apply', authenticate, async (req, res) => {
  try {
    const ex = await Application.findOne({ where: { userId: req.user.id, internshipId: req.params.id } })
    if (ex) return res.status(409).json({ message: 'You have already applied.' })
    const app = await Application.create({ userId: req.user.id, internshipId: req.params.id, coverLetter: req.body.coverLetter || null })
    res.status(201).json({ message: 'Application submitted!', application: app })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

export default router
