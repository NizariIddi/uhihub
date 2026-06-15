import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

function makeToken(id) {
  return jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '30d' })
}
function safe(u) {
  const j = u.toJSON ? u.toJSON() : { ...u }
  delete j.password
  return j
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, university, faculty, programmeId, yearOfStudy } = req.body
    if (!firstName || !lastName || !email || !password || !university) {
      return res.status(400).json({ message: 'All fields are required.' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' })
    }
    const exists = await User.findOne({ where: { email: email.toLowerCase().trim() } })
    if (exists) return res.status(409).json({ message: 'Email already registered.' })

    const hash = await bcrypt.hash(password, 12)
    const user = await User.create({
      firstName:   firstName.trim(),
      lastName:    lastName.trim(),
      email:       email.toLowerCase().trim(),
      password:    hash,
      university,
      faculty:     faculty?.trim() || null,
      programmeId: programmeId || null,
      yearOfStudy: yearOfStudy ? Number(yearOfStudy) : null,
    })
    res.status(201).json({ token: makeToken(user.id), user: safe(user) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: err.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: 'Email and password required.' })

    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } })
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' })

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ message: 'Invalid email or password.' })

    res.json({ token: makeToken(user.id), user: safe(user) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => res.json({ user: req.user }))

export default router
