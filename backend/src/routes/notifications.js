import { Router } from 'express'
import { Notification } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// GET /api/notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const notifs = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['created_at','DESC']],
      limit: 30,
    })
    const unread = notifs.filter(n => !n.isRead).length
    res.json({ notifications: notifs, unread })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await Notification.update({ isRead: true }, { where: { userId: req.user.id, isRead: false } })
    res.json({ message: 'All marked as read.' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await Notification.update({ isRead: true }, { where: { id: req.params.id, userId: req.user.id } })
    res.json({ message: 'Marked as read.' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/notifications/unread-count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const count = await Notification.count({ where: { userId: req.user.id, isRead: false } })
    res.json({ count })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

export default router
