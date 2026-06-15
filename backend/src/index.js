import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { UPLOADS_DIR } from './middleware/upload.js'
import db from './config/db.js'

import authRoutes         from './routes/auth.js'
import userRoutes         from './routes/users.js'
import examRoutes         from './routes/exams.js'
import noteRoutes         from './routes/notes.js'
import aiRoutes           from './routes/ai.js'
import internshipRoutes   from './routes/internships.js'
import searchRoutes       from './routes/search.js'
import adminRoutes        from './routes/admin.js'
import bookmarkRoutes     from './routes/bookmarks.js'
import notificationRoutes from './routes/notifications.js'
import reviewRoutes       from './routes/reviews.js'
import commentRoutes      from './routes/comments.js'
import reportRoutes       from './routes/reports.js'
import profileRoutes      from './routes/profile.js'
import marketplaceRoutes  from './routes/marketplace.js'
import downloadRoutes     from './routes/download.js'
import hierarchyRoutes    from './routes/hierarchy.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND  = path.resolve(__dirname, '..', '..','public')
const app  = express()
const PORT = process.env.PORT || 3232;

app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true, limit: '5mb' }))
app.use((req, res, next) => { res.setHeader('Cross-Origin-Resource-Policy','cross-origin'); next() })
app.use((req, res, next) => { if (req.path.startsWith('/api')) console.log(`${req.method} ${req.path}`); next() })

app.get('/api/health', (req, res) => {
  let files = 0
  try { files = fs.readdirSync(path.join(UPLOADS_DIR,'exams')).filter(f=>!f.startsWith('.')).length } catch {}
  res.json({ ok: true, UPLOADS_DIR, examFiles: files })
})

app.use('/api/auth',          authRoutes)
app.use('/api/users',         userRoutes)
app.use('/api/exams',         examRoutes)
app.use('/api/notes',         noteRoutes)
app.use('/api/ai',            aiRoutes)
app.use('/api/internships',   internshipRoutes)
app.use('/api/search',        searchRoutes)
app.use('/api/admin',         adminRoutes)
app.use('/api/bookmarks',     bookmarkRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/reviews',       reviewRoutes)
app.use('/api/comments',      commentRoutes)
app.use('/api/reports',       reportRoutes)
app.use('/api/profile',       profileRoutes)
app.use('/api/marketplace',   marketplaceRoutes)
app.use('/api/download',      downloadRoutes)
app.use('/api/hierarchy',     hierarchyRoutes)

app.use('/api', (req, res) => res.status(404).json({ message: `No route: ${req.method} ${req.originalUrl}` }))
app.use('/api', (err, req, res, next) => {
  console.error('[API ERROR]', err.message)
  res.status(err.status||500).json({ message: err.message||'Server error.' })
})

app.use('/uploads', express.static(UPLOADS_DIR))
app.use(express.static(FRONTEND))
app.get('*', (req, res) => res.sendFile(path.join(FRONTEND, 'index.html')))

// Sync DB then start — alter:true adds new columns/tables without dropping existing data
async function start() {
  try {
    await db.authenticate()
    console.log('📦 Database connected')
  } catch (err) {
    console.error('❌ DB connection failed:', err.message)
    console.error('   Check your .env — DB_HOST, DB_USER, DB_PASSWORD, DB_NAME')
    process.exit(1)
  }

  // Sync schema in background — adds new columns without blocking startup
  db.sync({ alter: true }).then(() => {
    console.log('✅ Schema up to date')
  }).catch(err => {
    console.warn('⚠️  Schema sync warning (safe to ignore if tables exist):', err.message)
  })

  app.listen(PORT, () => {
    console.log(`\n🎓 UniHub Tanzania → http://localhost:${PORT}`)
    console.log(`   Uploads → ${UPLOADS_DIR}\n`)
  })
}

start()
