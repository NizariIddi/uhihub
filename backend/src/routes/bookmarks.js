import { Router } from 'express'
import { Bookmark, Exam, Note } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// GET /api/bookmarks
router.get('/', authenticate, async (req, res) => {
  try {
    const bms = await Bookmark.findAll({ where: { userId: req.user.id }, order: [['created_at','DESC']] })
    // Fetch the actual resources
    const examIds = bms.filter(b => b.resourceType==='exam').map(b => b.resourceId)
    const noteIds = bms.filter(b => b.resourceType==='note').map(b => b.resourceId)
    const [exams, notes] = await Promise.all([
      examIds.length ? Exam.findAll({ where: { id: examIds } }) : [],
      noteIds.length ? Note.findAll({ where: { id: noteIds } }) : [],
    ])
    res.json({ bookmarks: bms, exams, notes })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/bookmarks  — toggle
router.post('/', authenticate, async (req, res) => {
  try {
    const { resourceType, resourceId } = req.body
    if (!resourceType || !resourceId) return res.status(400).json({ message: 'resourceType and resourceId required.' })
    const existing = await Bookmark.findOne({ where: { userId: req.user.id, resourceType, resourceId } })
    if (existing) {
      await existing.destroy()
      return res.json({ bookmarked: false })
    }
    await Bookmark.create({ userId: req.user.id, resourceType, resourceId })
    res.json({ bookmarked: true })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/bookmarks/check?resourceType=exam&resourceId=xxx
router.get('/check', authenticate, async (req, res) => {
  try {
    const { resourceType, resourceId } = req.query
    const bm = await Bookmark.findOne({ where: { userId: req.user.id, resourceType, resourceId } })
    res.json({ bookmarked: !!bm })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/bookmarks/ids — all bookmarked IDs for current user (for rendering state on list pages)
router.get('/ids', authenticate, async (req, res) => {
  try {
    const bms = await Bookmark.findAll({ where: { userId: req.user.id }, attributes: ['resourceType','resourceId'] })
    res.json({ bookmarks: bms })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

export default router
