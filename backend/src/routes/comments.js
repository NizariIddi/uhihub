import { Router } from 'express'
import { Comment, User } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// GET /api/comments?resourceType=exam&resourceId=xxx
router.get('/', authenticate, async (req, res) => {
  try {
    const { resourceType, resourceId } = req.query
    if (!resourceType || !resourceId) return res.status(400).json({ message: 'resourceType and resourceId required.' })
    const comments = await Comment.findAll({
      where: { resourceType, resourceId, parentId: null },
      order: [['created_at','ASC']],
      include: [
        { model: User, as: 'author', attributes: ['id','firstName','lastName'] },
        { model: Comment, as: 'replies', include: [{ model: User, as: 'author', attributes: ['id','firstName','lastName'] }] },
      ],
    })
    res.json({ comments })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/comments
router.post('/', authenticate, async (req, res) => {
  try {
    const { resourceType, resourceId, body, parentId } = req.body
    if (!resourceType || !resourceId || !body?.trim()) return res.status(400).json({ message: 'resourceType, resourceId and body required.' })
    const comment = await Comment.create({ userId: req.user.id, resourceType, resourceId, body: body.trim(), parentId: parentId || null })
    const full = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id','firstName','lastName'] }],
    })
    res.status(201).json(full)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// DELETE /api/comments/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const c = await Comment.findByPk(req.params.id)
    if (!c) return res.status(404).json({ message: 'Comment not found.' })
    if (c.userId !== req.user.id && !req.user.isAdmin) return res.status(403).json({ message: 'Not authorized.' })
    // Delete replies too
    await Comment.destroy({ where: { parentId: c.id } })
    await c.destroy()
    res.json({ message: 'Deleted.' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

export default router
