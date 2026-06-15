import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { Op } from 'sequelize'
import { User, Exam, Note, Internship, Activity, AiUsage } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'
import { uploadPdf, UPLOADS_DIR } from '../middleware/upload.js'

const router = Router()

// Admin check middleware
function adminOnly(req, res, next) {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required.' })
  next()
}

// ── Stats ─────────────────────────────────────────────────────
// GET /api/admin/public-stats — no auth, for landing page
router.get('/public-stats', async (req, res) => {
  try {
    const [users, exams, notes, universities] = await Promise.all([
      User.count(),
      Exam.count(),
      Note.count(),
      User.count({ distinct: true, col: 'university' }),
    ])
    res.json({ users, exams, notes, universities })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.get('/stats', authenticate, adminOnly, async (req, res) => {
  try {
    const [users, exams, notes, internships, aiUsage, activities] = await Promise.all([
      User.count(),
      Exam.count(),
      Note.count(),
      Internship.count({ where: { isActive: true } }),
      AiUsage.count(),
      Activity.count(),
    ])
    // Recent signups (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const newUsers = await User.count({ where: { created_at: { [Op.gte]: weekAgo } } })
    res.json({ users, exams, notes, internships, aiUsage, activities, newUsers })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// ── Users ─────────────────────────────────────────────────────
router.get('/users', authenticate, adminOnly, async (req, res) => {
  try {
    const { search, page = 1, limit = 30 } = req.query
    const where = search ? { [Op.or]: [
      { firstName: { [Op.like]: `%${search}%` } },
      { lastName:  { [Op.like]: `%${search}%` } },
      { email:     { [Op.like]: `%${search}%` } },
    ]} : {}
    const { count, rows } = await User.findAndCountAll({
      where, attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']],
      limit: Number(limit), offset: (Number(page) - 1) * Number(limit),
    })
    res.json({ users: rows, total: count, pages: Math.ceil(count / Number(limit)) })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.patch('/users/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { isAdmin } = req.body
    await User.update({ isAdmin }, { where: { id: req.params.id } })
    const u = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } })
    res.json(u)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.delete('/users/:id', authenticate, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'Cannot delete your own account.' })
    await User.destroy({ where: { id: req.params.id } })
    res.json({ message: 'User deleted.' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// ── Exams ─────────────────────────────────────────────────────
router.get('/exams', authenticate, adminOnly, async (req, res) => {
  try {
    const { search, university, page = 1, limit = 30 } = req.query
    const where = {}
    if (university) where.university = university
    if (search) where[Op.or] = [{ courseName: { [Op.like]: `%${search}%` } }, { courseCode: { [Op.like]: `%${search}%` } }]
    const { count, rows } = await Exam.findAndCountAll({
      where, order: [['created_at', 'DESC']],
      include: [{ model: User, as: 'uploadedBy', attributes: ['firstName', 'lastName', 'email'] }],
      limit: Number(limit), offset: (Number(page) - 1) * Number(limit),
    })
    res.json({ exams: rows, total: count, pages: Math.ceil(count / Number(limit)) })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.delete('/exams/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const exam = await Exam.findByPk(req.params.id)
    if (!exam) return res.status(404).json({ message: 'Not found.' })
    // Delete file from disk
    const filePath = path.join(UPLOADS_DIR, 'exams', path.basename(exam.fileUrl))
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    await exam.destroy()
    res.json({ message: 'Exam deleted.' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// ── Notes ─────────────────────────────────────────────────────
router.get('/notes', authenticate, adminOnly, async (req, res) => {
  try {
    const { search, university, page = 1, limit = 30 } = req.query
    const where = {}
    if (university) where.university = university
    if (search) where[Op.or] = [{ title: { [Op.like]: `%${search}%` } }, { courseCode: { [Op.like]: `%${search}%` } }]
    const { count, rows } = await Note.findAndCountAll({
      where, order: [['created_at', 'DESC']],
      include: [{ model: User, as: 'uploadedBy', attributes: ['firstName', 'lastName', 'email'] }],
      limit: Number(limit), offset: (Number(page) - 1) * Number(limit),
    })
    res.json({ notes: rows, total: count, pages: Math.ceil(count / Number(limit)) })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.delete('/notes/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.id)
    if (!note) return res.status(404).json({ message: 'Not found.' })
    const filePath = path.join(UPLOADS_DIR, 'notes', path.basename(note.fileUrl))
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    await note.destroy()
    res.json({ message: 'Note deleted.' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// ── Internships ───────────────────────────────────────────────
router.get('/internships', authenticate, adminOnly, async (req, res) => {
  try {
    const { search, page = 1, limit = 30 } = req.query
    const where = search ? { [Op.or]: [{ title: { [Op.like]: `%${search}%` } }, { company: { [Op.like]: `%${search}%` } }] } : {}
    const { count, rows } = await Internship.findAndCountAll({
      where, order: [['created_at', 'DESC']],
      limit: Number(limit), offset: (Number(page) - 1) * Number(limit),
    })
    res.json({ internships: rows, total: count, pages: Math.ceil(count / Number(limit)) })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.post('/internships', authenticate, adminOnly, async (req, res) => {
  try {
    const { title, company, location, description, requirements, industry, type, isPaid, salary, contactEmail } = req.body
    if (!title || !company || !location || !description || !industry) return res.status(400).json({ message: 'title, company, location, description and industry are required.' })
    const i = await Internship.create({ title, company, location, description, requirements, industry, type: type||'internship', isPaid: !!isPaid, salary, contactEmail })
    res.status(201).json(i)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.put('/internships/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { title, company, location, description, requirements, industry, type, isPaid, salary, contactEmail, isActive } = req.body
    await Internship.update({ title, company, location, description, requirements, industry, type, isPaid, salary, contactEmail, isActive }, { where: { id: req.params.id } })
    const i = await Internship.findByPk(req.params.id)
    res.json(i)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.delete('/internships/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await Internship.destroy({ where: { id: req.params.id } })
    res.json({ message: 'Deleted.' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

export default router

// ── Analytics ─────────────────────────────────────────────────
router.get('/analytics', authenticate, adminOnly, async (req, res) => {
  try {
    const db = (await import('../config/db.js')).default
    const { QueryTypes } = await import('sequelize')

    // Signups per day (last 30 days)
    const signups = await db.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at) ORDER BY date ASC`, { type: QueryTypes.SELECT })

    // Uploads per day (last 30 days)
    const examUploads = await db.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM exams WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at) ORDER BY date ASC`, { type: QueryTypes.SELECT })

    // Uploads by university
    const byUniversity = await db.query(`
      SELECT university, COUNT(*) as count FROM exams GROUP BY university ORDER BY count DESC`, { type: QueryTypes.SELECT })

    // Most downloaded exams
    const topExams = await db.query(`
      SELECT id, course_name, university, year, download_count
      FROM exams ORDER BY download_count DESC LIMIT 10`, { type: QueryTypes.SELECT })

    // AI usage per day (last 14 days)
    const aiUsage = await db.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM ai_usage WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
      GROUP BY DATE(created_at) ORDER BY date ASC`, { type: QueryTypes.SELECT })

    res.json({ signups, examUploads, byUniversity, topExams, aiUsage })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// ── Featured toggle ───────────────────────────────────────────
router.patch('/exams/:id/featured', authenticate, adminOnly, async (req, res) => {
  try {
    const { Exam } = await import('../models/index.js')
    const exam = await Exam.findByPk(req.params.id)
    if (!exam) return res.status(404).json({ message: 'Not found.' })
    await exam.update({ isFeatured: !exam.isFeatured })
    res.json({ isFeatured: exam.isFeatured })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.patch('/notes/:id/featured', authenticate, adminOnly, async (req, res) => {
  try {
    const { Note } = await import('../models/index.js')
    const note = await Note.findByPk(req.params.id)
    if (!note) return res.status(404).json({ message: 'Not found.' })
    await note.update({ isFeatured: !note.isFeatured })
    res.json({ isFeatured: note.isFeatured })
  } catch (err) { res.status(500).json({ message: err.message }) }
})
