import jwt from 'jsonwebtoken'
import { User } from '../models/index.js'

export async function authenticate(req, res, next) {
  try {
    const header = req.headers['authorization'] || ''
    const query  = req.query.token || ''
    const token  = header.startsWith('Bearer ') ? header.slice(7) : query

    if (!token) return res.status(401).json({ message: 'Please sign in to continue.' })

    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user    = await User.findByPk(payload.userId, { attributes: { exclude: ['password'] } })
    if (!user) return res.status(401).json({ message: 'User not found.' })

    req.user = user
    next()
  } catch {
    res.status(401).json({ message: 'Session expired. Please sign in again.' })
  }
}
