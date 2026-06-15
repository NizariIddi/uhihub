import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { User, Exam, Note, Review, Activity } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// GET /api/profile/:id — public profile
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password','email'] },
    })
    if (!user) return res.status(404).json({ message: 'User not found.' })

    const [exams, notes, reviews] = await Promise.all([
      Exam.findAll({ where: { uploadedById: user.id }, order: [['created_at','DESC']], limit: 10 }),
      Note.findAll({ where: { uploadedById: user.id }, order: [['created_at','DESC']], limit: 10 }),
      Review.findAll({ where: { userId: user.id }, order: [['created_at','DESC']], limit: 5 }),
    ])
    res.json({ user, exams, notes, reviews })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// PUT /api/profile/me — edit own profile
router.put('/me', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, faculty, yearOfStudy, bio } = req.body
    const updates = {}
    if (firstName?.trim()) updates.firstName  = firstName.trim()
    if (lastName?.trim())  updates.lastName   = lastName.trim()
    if (faculty !== undefined)     updates.faculty     = faculty
    if (yearOfStudy !== undefined) updates.yearOfStudy = yearOfStudy
    if (bio !== undefined)         updates.bio         = bio
    await User.update(updates, { where: { id: req.user.id } })
    const updated = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } })
    res.json(updated)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// PUT /api/profile/me/password — change password
router.put('/me/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Both passwords required.' })
    if (newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters.' })
    const user = await User.findByPk(req.user.id)
    const ok = await bcrypt.compare(currentPassword, user.password)
    if (!ok) return res.status(401).json({ message: 'Current password is incorrect.' })
    await User.update({ password: await bcrypt.hash(newPassword, 12) }, { where: { id: req.user.id } })
    res.json({ message: 'Password changed.' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

export default router
