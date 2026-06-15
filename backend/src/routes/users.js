import { Router } from 'express'
import { User, Activity } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/me/stats', authenticate, async (req, res) => {
  try {
    const [downloads, aiUsed, notesUploaded, examsUploaded] = await Promise.all([
      Activity.count({ where: { userId: req.user.id, type: 'EXAM_DOWNLOAD' } }),
      Activity.count({ where: { userId: req.user.id, type: 'AI_EXPLAIN' } }),
      Activity.count({ where: { userId: req.user.id, type: 'NOTE_UPLOAD' } }),
      Activity.count({ where: { userId: req.user.id, type: 'EXAM_UPLOAD' } }),
    ])
    res.json({ examsDownloaded: downloads, aiUsed, notesUploaded, examsUploaded })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.get('/me/activity', authenticate, async (req, res) => {
  try {
    const acts = await Activity.findAll({ where: { userId: req.user.id }, order: [['created_at', 'DESC']], limit: 15 })
    res.json(acts)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

export default router
