import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { Exam, Note, AiUsage, Activity } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'
import { UPLOADS_DIR } from '../middleware/upload.js'

const router   = Router()
const pdfCache = new Map()

// ── Simple in-memory rate limiter: max 30 AI requests per user per minute ──
const aiRateMap = new Map()
function checkAiRateLimit(userId) {
  const now = Date.now()
  const window = 60 * 1000 // 1 minute
  const maxReqs = 30
  if (!aiRateMap.has(userId)) aiRateMap.set(userId, [])
  const timestamps = aiRateMap.get(userId).filter(t => now - t < window)
  if (timestamps.length >= maxReqs) return false
  timestamps.push(now)
  aiRateMap.set(userId, timestamps)
  return true
}
// Clean up old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [uid, ts] of aiRateMap.entries()) {
    const fresh = ts.filter(t => now - t < 60000)
    if (fresh.length === 0) aiRateMap.delete(uid)
    else aiRateMap.set(uid, fresh)
  }
}, 5 * 60 * 1000)

async function readPdf(fileUrl) {
  if (pdfCache.has(fileUrl)) return pdfCache.get(fileUrl)
  try {
    const folder   = fileUrl.includes('notes') ? 'notes' : 'exams'
    const filePath = path.join(UPLOADS_DIR, folder, path.basename(fileUrl))
    if (!fs.existsSync(filePath)) return null
    // pdf-parse has a known ESM quirk — import from lib directly to avoid test file side-effects
    let pdfParse
    try {
      const mod = await import('pdf-parse/lib/pdf-parse.js')
      pdfParse = mod.default
    } catch {
      const mod = await import('pdf-parse')
      pdfParse = mod.default
    }
    const data = await pdfParse(fs.readFileSync(filePath))
    const text = data.text?.trim()
    if (text && text.length > 30) { pdfCache.set(fileUrl, text); return text }
    return null
  } catch (e) { console.error('[PDF]', e.message); return null }
}

async function groq(messages, max = 2000) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: max, temperature: 0.6 }),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d.error?.message || 'Groq API error')
  return d.choices[0].message.content
}

const SYS = {
  en: 'You are an expert academic tutor for Tanzanian university students. Be clear, thorough and encouraging. Plain text only — no asterisks, no pound signs, no markdown symbols. Number your steps when listing. IMPORTANT: Never repeat the user question back to them. Always give a direct, substantive answer. If asked about exam availability or what years exist, clarify that you do not have access to the exam database — only answer what you know about the subject matter itself.',
  sw: 'Wewe ni mwalimu mtaalamu kwa wanafunzi wa vyuo vikuu Tanzania. Kuwa wazi, wa kina na wa kutia moyo. Maandishi ya kawaida tu — bila alama za markdown. Panga hatua kwa nambari. MUHIMU: Usirudie swali la mtumiaji. Toa jibu la moja kwa moja na la kina daima.',
}

// POST /api/ai/explain — no limits, fully free
router.post('/explain', authenticate, async (req, res) => {
  try {
    if (!checkAiRateLimit(req.user.id)) {
      return res.status(429).json({ message: 'Too many requests. Please wait a moment before asking again.' })
    }
    const { question, language = 'english' } = req.body
    if (!question?.trim()) return res.status(400).json({ message: 'Question is required.' })

    const reply = await groq([
      { role: 'system', content: language === 'swahili' ? SYS.sw : SYS.en },
      { role: 'user',   content: question.trim() },
    ])

    await Promise.all([
      AiUsage.create({ userId: req.user.id, question: question.trim(), explanation: reply, language }),
      Activity.create({ userId: req.user.id, type: 'AI_EXPLAIN', title: question.trim().slice(0, 80) }),
    ])
    res.json({ explanation: reply })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/ai/read-exam
router.post('/read-exam', authenticate, async (req, res) => {
  try {
    const { examId } = req.body
    if (!examId) return res.status(400).json({ message: 'examId required.' })
    const exam = await Exam.findByPk(examId)
    if (!exam) return res.status(404).json({ message: 'Exam not found.' })

    const text = await readPdf(exam.fileUrl)
    if (!text) {
      return res.json({ success: false, message: 'This exam is a scanned image — text cannot be extracted. You can still type the question and I will answer from my knowledge.' })
    }
    const list = await groq([
      { role: 'system', content: 'List all exam questions you can identify. Numbered list, plain text only.' },
      { role: 'user',   content: `Extract all questions from:\n\n${text.slice(0, 9000)}` },
    ], 700)
    res.json({ success: true, questionList: list, totalChars: text.length })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// POST /api/ai/chat — viewer sidebar for both exams and notes
router.post('/chat', authenticate, async (req, res) => {
  try {
    if (!checkAiRateLimit(req.user.id)) {
      return res.status(429).json({ message: 'Too many requests. Please wait a moment before asking again.' })
    }
    const { messages, examId, noteId, language = 'english' } = req.body
    if (!messages?.length) return res.status(400).json({ message: 'messages required.' })

    let system = language === 'swahili' ? SYS.sw : SYS.en

    if (examId) {
      const exam = await Exam.findByPk(examId)
      if (exam) {
        const text = await readPdf(exam.fileUrl)
        if (text) {
          const chunk = text.length > 12000 ? text.slice(0, 12000) + '\n[... continues ...]' : text
          system = `${system}\n\nYou have the full text of this exam:\nCourse: ${exam.courseName} | ${(exam.university||'').toUpperCase()} | ${exam.year}\n\n---\n${chunk}\n---\n\nWhen asked to answer a question: find it in the text, quote it briefly, then give a complete detailed answer. For "give me all answers" go through every question one by one.`
        } else {
          system = `${system}\n\nStudent is viewing: "${exam.courseName}" (${exam.year}). PDF is a scanned image — help from your subject knowledge.`
        }
      }
    } else if (noteId) {
      const note = await Note.findByPk(noteId)
      if (note) {
        const text = note.fileType === 'pdf' ? await readPdf(note.fileUrl) : null
        if (text) {
          const chunk = text.length > 12000 ? text.slice(0, 12000) + '\n[... continues ...]' : text
          system = `${system}\n\nYou have the full text of these student notes:\nTitle: ${note.title} | ${(note.university||'').toUpperCase()}${note.courseCode?' | '+note.courseCode:''}\n\n---\n${chunk}\n---\n\nHelp the student understand this material. Explain concepts clearly, give examples, and connect ideas to what they've read. If asked about something not in the notes, draw on your broader knowledge of the subject.`
        } else if (note.fileType === 'ppt') {
          system = `${system}\n\nStudent is viewing PowerPoint notes: "${note.title}"${note.courseCode?' ('+note.courseCode+')':''}. The slides cannot be read as text, but help the student with questions about the subject using your knowledge.`
        } else {
          system = `${system}\n\nStudent is viewing notes: "${note.title}"${note.courseCode?' ('+note.courseCode+')':''}. Help them understand the material.`
        }
      }
    }

    const reply = await groq([{ role: 'system', content: system }, ...messages.slice(-12)])
    const lastQ = messages.at(-1)?.content || ''
    // Save to AiUsage for history when standalone tutor (not exam/note viewer)
    if (!examId && !noteId) {
      AiUsage.create({ userId: req.user.id, question: lastQ.slice(0, 500),
        explanation: reply.slice(0, 3000), language }).catch(()=>{})
    }
    await Activity.create({ userId: req.user.id, type: 'AI_EXPLAIN', title: lastQ.slice(0, 80) || 'chat' })
    res.json({ reply })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// GET /api/ai/history
router.get('/history', authenticate, async (req, res) => {
  try {
    const h = await AiUsage.findAll({ where: { userId: req.user.id }, order: [['created_at', 'DESC']], limit: 40, attributes: ['id', 'question', 'explanation', 'language', 'created_at'] })
    res.json(h)
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// DELETE /api/ai/history/:id — delete a single history item
router.delete('/history/:id', authenticate, async (req, res) => {
  try {
    const item = await AiUsage.findOne({ where: { id: req.params.id, userId: req.user.id } })
    if (!item) return res.status(404).json({ message: 'History item not found.' })
    await item.destroy()
    res.json({ message: 'Deleted.' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// DELETE /api/ai/history — clear all history for current user
router.delete('/history', authenticate, async (req, res) => {
  try {
    await AiUsage.destroy({ where: { userId: req.user.id } })
    res.json({ message: 'History cleared.' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

export default router
