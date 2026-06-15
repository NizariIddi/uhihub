import { Router } from 'express'
import { Op } from 'sequelize'
import { College, Programme, Module, Topic, Exam, Note, User } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
function adminOnly(req, res, next) {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin only.' })
  next()
}

// ── GET /api/hierarchy/tree?university=udsm ───────────────────
// Full tree: colleges → programmes → modules → topics
router.get('/tree', authenticate, async (req, res) => {
  try {
    const { university } = req.query
    if (!university) return res.status(400).json({ message: 'university required' })
    const colleges = await College.findAll({
      where: { university },
      order: [['name','ASC']],
      include: [{
        model: Programme, as: 'programmes',
        order: [['name','ASC']],
        include: [{
          model: Module, as: 'modules',
          order: [['yearOfStudy','ASC'],['semester','ASC'],['name','ASC']],
          include: [{ model: Topic, as: 'topics', order: [['orderIndex','ASC'],['name','ASC']] }]
        }]
      }]
    })
    res.json({ colleges })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// ── GET /api/hierarchy/colleges?university=udsm ───────────────
router.get('/colleges', authenticate, async (req, res) => {
  try {
    const where = {}
    if (req.query.university) where.university = req.query.university
    const colleges = await College.findAll({ where, order: [['name','ASC']] })
    res.json({ colleges })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// ── GET /api/hierarchy/programmes?collegeId= ─────────────────
router.get('/programmes', authenticate, async (req, res) => {
  try {
    const where = {}
    if (req.query.collegeId) where.collegeId = req.query.collegeId
    const programmes = await Programme.findAll({
      where,
      order: [['name','ASC']],
      include: [{ model: College, as: 'college', attributes: ['id','name','shortName','university'] }]
    })
    res.json({ programmes })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// ── GET /api/hierarchy/modules?programmeId=&year= ─────────────
router.get('/modules', authenticate, async (req, res) => {
  try {
    const where = {}
    if (req.query.programmeId)  where.programmeId  = req.query.programmeId
    if (req.query.yearOfStudy)  where.yearOfStudy  = Number(req.query.yearOfStudy)
    if (req.query.semester && req.query.semester !== 'all') where.semester = req.query.semester
    const modules = await Module.findAll({
      where,
      order: [['yearOfStudy','ASC'],['semester','ASC'],['name','ASC']],
      include: [
        { model: Topic, as: 'topics', order: [['orderIndex','ASC']] },
        { model: Programme, as: 'programme', attributes: ['id','name','code'], include: [{ model: College, as: 'college', attributes: ['id','name','university'] }] }
      ]
    })
    res.json({ modules })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// ── GET /api/hierarchy/modules/:id ───────────────────────────
router.get('/modules/:id', authenticate, async (req, res) => {
  try {
    const mod = await Module.findByPk(req.params.id, {
      include: [
        { model: Topic,   as: 'topics',   order: [['orderIndex','ASC']] },
        { model: Programme, as: 'programme', include: [{ model: College, as: 'college' }] },
        { model: Exam, as: 'exams', attributes: ['id','courseName','courseCode','year','downloadCount','viewCount'],
          include: [{ model: User, as: 'uploadedBy', attributes: ['id','firstName','lastName'] }] },
        { model: Note, as: 'notes', attributes: ['id','title','courseCode','downloadCount'],
          include: [{ model: User, as: 'uploadedBy', attributes: ['id','firstName','lastName'] }] },
      ]
    })
    if (!mod) return res.status(404).json({ message: 'Module not found.' })
    res.json({ module: mod })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// ── ADMIN: Create college ─────────────────────────────────────
router.post('/colleges', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, shortName, university, description, icon } = req.body
    if (!name || !university) return res.status(400).json({ message: 'name and university required' })
    const college = await College.create({ name, shortName, university, description, icon })
    res.status(201).json(college)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.put('/colleges/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const c = await College.findByPk(req.params.id)
    if (!c) return res.status(404).json({ message: 'Not found.' })
    await c.update(req.body)
    res.json(c)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.delete('/colleges/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await College.destroy({ where: { id: req.params.id } })
    res.json({ message: 'Deleted.' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// ── ADMIN: Create programme ───────────────────────────────────
router.post('/programmes', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, code, collegeId, duration, description, degreeLevel } = req.body
    if (!name || !collegeId) return res.status(400).json({ message: 'name and collegeId required' })
    const prog = await Programme.create({ name, code, collegeId, duration, description, degreeLevel })
    res.status(201).json(prog)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.put('/programmes/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const p = await Programme.findByPk(req.params.id)
    if (!p) return res.status(404).json({ message: 'Not found.' })
    await p.update(req.body)
    res.json(p)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.delete('/programmes/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await Programme.destroy({ where: { id: req.params.id } })
    res.json({ message: 'Deleted.' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// ── ADMIN: Create module ──────────────────────────────────────
router.post('/modules', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, code, programmeId, yearOfStudy, semester, credits, description, isCore } = req.body
    if (!name || !code || !programmeId || !yearOfStudy) {
      return res.status(400).json({ message: 'name, code, programmeId, yearOfStudy required' })
    }
    const mod = await Module.create({ name, code, programmeId, yearOfStudy, semester, credits, description, isCore })
    res.status(201).json(mod)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.put('/modules/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const m = await Module.findByPk(req.params.id)
    if (!m) return res.status(404).json({ message: 'Not found.' })
    await m.update(req.body)
    res.json(m)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.delete('/modules/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await Module.destroy({ where: { id: req.params.id } })
    res.json({ message: 'Deleted.' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// ── ADMIN: Create topic ───────────────────────────────────────
router.post('/topics', authenticate, adminOnly, async (req, res) => {
  try {
    const { name, moduleId, orderIndex, description } = req.body
    if (!name || !moduleId) return res.status(400).json({ message: 'name and moduleId required' })
    const topic = await Topic.create({ name, moduleId, orderIndex: orderIndex || 0, description })
    res.status(201).json(topic)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.put('/topics/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const t = await Topic.findByPk(req.params.id)
    if (!t) return res.status(404).json({ message: 'Not found.' })
    await t.update(req.body)
    res.json(t)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

router.delete('/topics/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await Topic.destroy({ where: { id: req.params.id } })
    res.json({ message: 'Deleted.' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

export default router
