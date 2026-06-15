import { Router } from 'express'
import { Report, User, Exam, Note } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

function adminOnly(req, res, next) {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin only.' })
  next()
}

// POST /api/reports — submit a report
router.post('/', authenticate, async (req, res) => {
  try {
    const { resourceType, resourceId, reason, details } = req.body
    if (!resourceType || !resourceId || !reason) return res.status(400).json({ message: 'resourceType, resourceId and reason required.' })
    // One report per user per resource
    const existing = await Report.findOne({ where: { userId: req.user.id, resourceId } })
    if (existing) return res.status(409).json({ message: 'You have already reported this.' })
    await Report.create({ userId: req.user.id, resourceType, resourceId, reason, details })
    res.status(201).json({ message: 'Report submitted. Thank you.' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/reports — admin: list all reports
router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { status = 'PENDING', page = 1, limit = 30 } = req.query
    const where = status !== 'all' ? { status } : {}
    const { count, rows } = await Report.findAndCountAll({
      where,
      order: [['created_at','DESC']],
      limit: Number(limit),
      offset: (Number(page)-1) * Number(limit),
      include: [{ model: User, as: 'reporter', attributes: ['firstName','lastName','email'] }],
    })
    res.json({ reports: rows, total: count, pages: Math.ceil(count/Number(limit)) })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// PATCH /api/reports/:id — admin: update status
router.patch('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { status } = req.body
    const report = await Report.findByPk(req.params.id)
    if (!report) return res.status(404).json({ message: 'Report not found.' })
    await report.update({ status, resolvedById: req.user.id })
    res.json(report)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

export default router
