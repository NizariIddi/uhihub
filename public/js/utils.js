// ── API Client ────────────────────────────────────────────────
const api = {
  async req(method, url, body) {
    const token = localStorage.getItem('token')
    const heads = { 'Content-Type': 'application/json' }
    if (token) heads['Authorization'] = `Bearer ${token}`
    let res, text
    try {
      res  = await fetch(url, { method, headers: heads, body: body ? JSON.stringify(body) : undefined })
      text = await res.text()
    } catch { throw new Error('Cannot reach server. Is it running?') }
    let data
    try { data = JSON.parse(text) } catch {
      console.error('Non-JSON response:', text.slice(0,300))
      throw new Error('Server error — check browser console.')
    }
    if (!res.ok) {
      if (res.status === 401) { logout(); return }
      const e = new Error(data.message || `Error ${res.status}`)
      e.status = res.status
      throw e
    }
    return data
  },
  get:    url      => api.req('GET',    url),
  post:   (url, b) => api.req('POST',   url, b),
  put:    (url, b) => api.req('PUT',    url, b),
  patch:  (url, b) => api.req('PATCH',  url, b),
  delete: url      => api.req('DELETE', url),

  upload(url, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('token')
      const xhr   = new XMLHttpRequest()
      if (onProgress) xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round(e.loaded/e.total*100)) }
      xhr.onload = () => {
        let data
        try { data = JSON.parse(xhr.responseText) } catch {
          return reject(new Error('Server error during upload.'))
        }
        xhr.status >= 200 && xhr.status < 300 ? resolve(data) : reject(new Error(data.message || `Upload failed (${xhr.status})`))
      }
      xhr.onerror   = () => reject(new Error('Network error.'))
      xhr.ontimeout = () => reject(new Error('Upload timed out.'))
      xhr.onabort   = () => reject(new Error('Upload cancelled.'))
      xhr.open('POST', url)
      xhr.timeout = 120000
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.send(formData)
    })
  },
}

// ── Auth ──────────────────────────────────────────────────────
function getUser() { try { return JSON.parse(localStorage.getItem('user')) } catch { return null } }
function requireAuth() {
  if (!localStorage.getItem('token')) { window.location.href = '/pages/login.html'; return null }
  return getUser()
}
function logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/pages/login.html' }
function fileUrl(p) { const t = localStorage.getItem('token'); return t ? `${p}${p.includes('?')?'&':'?'}token=${encodeURIComponent(t)}` : p }
function isAdmin() { return getUser()?.isAdmin === true }

// ── Dark mode ─────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme
  localStorage.setItem('theme', theme)
  updateThemeBtn()
}
function toggleDarkMode() {
  const current = localStorage.getItem('theme') || 'light'
  applyTheme(current === 'dark' ? 'light' : 'dark')
}
function updateThemeBtn() {
  const set = () => {
    const btn = document.getElementById('themeBtn')
    if (btn) btn.textContent = localStorage.getItem('theme') === 'dark' ? '☀️' : '🌙'
  }
  set()
  requestAnimationFrame(set)
}
// Apply saved theme BEFORE first paint to prevent flash
// Respect system preference if user hasn't manually chosen yet
const _systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
const _savedTheme = localStorage.getItem('theme') || (_systemDark ? 'dark' : 'light')
document.documentElement.setAttribute('data-theme', _savedTheme)
document.documentElement.style.colorScheme = _savedTheme
// Auto-switch with system if user hasn't overridden
if (!localStorage.getItem('theme')) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('theme')) applyTheme(e.matches ? 'dark' : 'light')
  })
}

// ── Toast ─────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const d = document.createElement('div')
  d.className = `toast toast-${type}`
  d.textContent = msg
  document.body.appendChild(d)
  setTimeout(() => d.remove(), 3500)
}

// ── Helpers ───────────────────────────────────────────────────
function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) } }
function stars(n, max=5) {
  return Array.from({length:max}, (_,i) =>
    `<span style="color:${i<n?'#f59e0b':'#d1d5db'};font-size:.9rem">★</span>`).join('')
}

// ── Universities ──────────────────────────────────────────────
const UNIS = {
  udsm:'UDSM', udom:'UDOM', ardhi:'Ardhi University', muhas:'MUHAS',
  out:'OUT', sua:'SUA', mzumbe:'Mzumbe University', ifm:'IFM',
  cbe:'CBE', jordan:'Jordan University', saut:'St. Augustine (SAUT)', other:'Other',
}
function uniOptions(placeholder = 'All universities') {
  return `<option value="">${esc(placeholder)}</option>` +
    Object.entries(UNIS).map(([v,l]) => `<option value="${v}">${esc(l)}</option>`).join('')
}

// ── Bookmarks ─────────────────────────────────────────────────
async function toggleBookmark(resourceType, resourceId, btn) {
  try {
    const d = await api.post('/api/bookmarks', { resourceType, resourceId })
    btn.style.opacity = d.bookmarked ? '1' : '0.4'
    btn.title = d.bookmarked ? 'Remove bookmark' : 'Bookmark'
    btn.dataset.bookmarked = d.bookmarked
    toast(d.bookmarked ? 'Bookmarked!' : 'Bookmark removed')
  } catch(e) { toast(e.message, 'error') }
}

// ── Report ────────────────────────────────────────────────────
function openReportModal(resourceType, resourceId) {
  let modal = document.getElementById('reportModal')
  if (!modal) {
    modal = document.createElement('div')
    modal.id = 'reportModal'
    modal.className = 'modal-overlay'
    modal.innerHTML = `
      <div class="modal" style="max-width:420px">
        <h2 class="modal-title">🚩 Report content</h2>
        <div id="reportErr" class="alert alert-error hidden" style="margin-bottom:1rem"></div>
        <div id="reportOk" class="alert alert-success hidden" style="margin-bottom:1rem"></div>
        <div id="reportForm">
          <div style="margin-bottom:1rem">
            <label style="display:block;font-size:.85rem;font-weight:500;margin-bottom:.4rem">Reason *</label>
            <select class="input" id="reportReason">
              <option value="wrong_content">Wrong or misleading content</option>
              <option value="copyright">Copyright violation</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="spam">Spam</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div style="margin-bottom:1.25rem">
            <label style="display:block;font-size:.85rem;font-weight:500;margin-bottom:.4rem">Details (optional)</label>
            <textarea class="input" id="reportDetails" rows="3" placeholder="Describe the issue..."></textarea>
          </div>
          <div style="display:flex;gap:.75rem">
            <button class="btn btn-primary" style="flex:1" id="reportSubmitBtn" onclick="submitReport()">Submit report</button>
            <button class="btn btn-secondary" style="flex:1" onclick="document.getElementById('reportModal').classList.add('hidden')">Cancel</button>
          </div>
        </div>
      </div>`
    document.body.appendChild(modal)
  }
  modal.dataset.resourceType = resourceType
  modal.dataset.resourceId   = resourceId
  modal.querySelector('#reportErr').classList.add('hidden')
  modal.querySelector('#reportOk').classList.add('hidden')
  modal.querySelector('#reportForm').classList.remove('hidden')
  modal.querySelector('#reportDetails').value = ''
  modal.classList.remove('hidden')
}
async function submitReport() {
  const modal  = document.getElementById('reportModal')
  const btn    = document.getElementById('reportSubmitBtn')
  const err    = document.getElementById('reportErr')
  const ok     = document.getElementById('reportOk')
  err.classList.add('hidden'); btn.disabled = true; btn.textContent = 'Submitting...'
  try {
    await api.post('/api/reports', {
      resourceType: modal.dataset.resourceType,
      resourceId:   modal.dataset.resourceId,
      reason:       document.getElementById('reportReason').value,
      details:      document.getElementById('reportDetails').value,
    })
    ok.textContent = '✅ Report submitted. Thank you!'
    ok.classList.remove('hidden')
    document.getElementById('reportForm').classList.add('hidden')
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden') }
  btn.disabled = false; btn.textContent = 'Submit report'
}

// ── Pagination ────────────────────────────────────────────────
function renderPagination(containerId, current, total, pages, onPage) {
  const el = document.getElementById(containerId)
  if (!el) return
  if (pages <= 1) { el.innerHTML = ''; return }
  const btn = (label, page, active, disabled) =>
    `<button class="pg-btn${active?' active':''}" ${disabled?'disabled':''} onclick="(${onPage})(${page})">${label}</button>`
  let html = btn('‹', current - 1, false, current === 1)
  const delta = 2
  let start = Math.max(1, current - delta), end = Math.min(pages, current + delta)
  if (start > 1) { html += btn(1, 1, false, false); if (start > 2) html += '<span class="pg-info">…</span>' }
  for (let p = start; p <= end; p++) html += btn(p, p, p === current, false)
  if (end < pages) { if (end < pages - 1) html += '<span class="pg-info">…</span>'; html += btn(pages, pages, false, false) }
  html += btn('›', current + 1, false, current === pages)
  html += `<span class="pg-info">${total} total</span>`
  el.innerHTML = html
}

// ── Global search ─────────────────────────────────────────────
function injectGlobalSearch() {
  if (document.getElementById('globalSearchBar')) return
  const bar = document.createElement('div')
  bar.id = 'globalSearchBar'
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:200;background:var(--ink);padding:.75rem 1.5rem;display:flex;align-items:center;gap:.75rem;transform:translateY(-100%);transition:transform .25s;box-shadow:0 4px 20px rgba(0,0,0,.3)'
  bar.innerHTML = `
    <span style="color:var(--gold);font-size:1rem;flex-shrink:0">🔍</span>
    <input id="gSearchInput" type="text" placeholder="Search exams, notes, internships..." autocomplete="off"
      style="flex:1;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:.55rem 1rem;color:white;font-size:.9rem;outline:none;font-family:inherit"/>
    <div style="display:flex;gap:.4rem;flex-shrink:0">
      <button onclick="setSearchType('all')"         id="gst-all"  style="font-size:.75rem;padding:.25rem .65rem;border-radius:20px;border:none;cursor:pointer;background:var(--gold);color:var(--ink);font-weight:500">All</button>
      <button onclick="setSearchType('exams')"       id="gst-exams" style="font-size:.75rem;padding:.25rem .65rem;border-radius:20px;border:none;cursor:pointer;background:rgba(255,255,255,.15);color:white">Exams</button>
      <button onclick="setSearchType('notes')"       id="gst-notes" style="font-size:.75rem;padding:.25rem .65rem;border-radius:20px;border:none;cursor:pointer;background:rgba(255,255,255,.15);color:white">Notes</button>
      <button onclick="setSearchType('internships')" id="gst-internships" style="font-size:.75rem;padding:.25rem .65rem;border-radius:20px;border:none;cursor:pointer;background:rgba(255,255,255,.15);color:white">Jobs</button>
    </div>
    <button onclick="closeGlobalSearch()" style="background:none;border:none;color:rgba(255,255,255,.6);font-size:1.3rem;cursor:pointer;border-radius:4px;padding:.1rem .4rem">✕</button>`
  document.body.appendChild(bar)
  const results = document.createElement('div')
  results.id = 'globalSearchResults'
  results.style.cssText = 'position:fixed;top:60px;left:0;right:0;z-index:199;background:var(--card-bg);max-height:70vh;overflow-y:auto;box-shadow:0 8px 30px rgba(0,0,0,.2);display:none'
  document.body.appendChild(results)
  let st
  document.getElementById('gSearchInput').addEventListener('input', () => { clearTimeout(st); st = setTimeout(runSearch,320) })
  document.getElementById('gSearchInput').addEventListener('keydown', e => {
    if (e.key === 'Escape') closeGlobalSearch()
    if (e.key === 'Enter') {
      const q = document.getElementById('gSearchInput')?.value?.trim()
      if (q && q.length >= 2) {
        closeGlobalSearch()
        window.location.href = `/pages/search.html?q=${encodeURIComponent(q)}&type=${_stype}`
      }
    }
  })
}

let _stype = 'all'
function setSearchType(t) {
  _stype = t
  ;['all','exams','notes','internships'].forEach(id => {
    const b = document.getElementById(`gst-${id}`)
    if (b) b.style.cssText = `font-size:.75rem;padding:.25rem .65rem;border-radius:20px;border:none;cursor:pointer;background:${id===t?'var(--gold)':'rgba(255,255,255,.15)'};color:${id===t?'var(--ink)':'white'};font-weight:${id===t?'500':'400'}`
  })
  runSearch()
}
async function runSearch() {
  const q = document.getElementById('gSearchInput')?.value?.trim()
  const box = document.getElementById('globalSearchResults')
  if (!box) return
  if (!q || q.length < 2) { box.style.display='none'; return }
  box.style.display='block'
  box.innerHTML='<div style="padding:1.5rem;text-align:center;color:var(--ink-muted)"><div class="spinner" style="width:24px;height:24px;margin:0 auto"></div></div>'
  try {
    const d = await api.get(`/api/search?q=${encodeURIComponent(q)}&type=${_stype}`)
    if (!d.total) { box.innerHTML=`<div style="padding:2rem;text-align:center;color:var(--ink-muted)">No results for "<strong>${esc(q)}</strong>"</div>`; return }
    let html = `<div style="padding:.6rem 1.25rem;font-size:.78rem;color:var(--ink-muted);border-bottom:1px solid var(--border);background:var(--surface)">${d.total} result${d.total!==1?'s':''} for "<strong>${esc(q)}</strong>"</div>`
    const row = (href, icon, title, sub) => `<a href="${href}" onclick="closeGlobalSearch()" style="display:flex;align-items:center;gap:.75rem;padding:.65rem 1.25rem;border-bottom:1px solid var(--border);text-decoration:none;color:var(--ink)" onmouseover="this.style.background='var(--gold-pale)'" onmouseout="this.style.background=''"><span style="font-size:1.1rem">${icon}</span><div><div style="font-size:.875rem;font-weight:500">${title}</div><div style="font-size:.75rem;color:var(--ink-muted)">${sub}</div></div></a>`
    if (d.exams?.length) {
      html += `<div style="padding:.5rem 1.25rem .25rem;font-size:.7rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--gold)">📄 Exams (${d.exams.length})</div>`
      html += d.exams.map(e => row(`/pages/exam-viewer.html?id=${e.id}`,'📄',esc(e.courseName),`${esc((UNIS[e.university]||e.university||'').toUpperCase())} · ${e.year}${e.courseCode?' · '+esc(e.courseCode):''}`)).join('')
    }
    if (d.notes?.length) {
      html += `<div style="padding:.5rem 1.25rem .25rem;font-size:.7rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--gold)">📝 Notes (${d.notes.length})</div>`
      html += d.notes.map(n => row(`/pages/note-viewer.html?id=${n.id}`,'📝',esc(n.title),`${esc((UNIS[n.university]||n.university||'').toUpperCase())}${n.courseCode?' · '+esc(n.courseCode):''}`)).join('')
    }
    if (d.internships?.length) {
      html += `<div style="padding:.5rem 1.25rem .25rem;font-size:.7rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--gold)">💼 Internships (${d.internships.length})</div>`
      html += d.internships.map(i => row(`/pages/internships.html`,'💼',esc(i.title),`${esc(i.company)} · ${esc(i.location)}`)).join('')
    }
    html += `<a href="/pages/search.html?q=${encodeURIComponent(q)}&type=${_stype}" onclick="closeGlobalSearch()"
      style="display:block;text-align:center;padding:.75rem;font-size:.8rem;font-weight:600;color:var(--gold);border-top:1px solid var(--border);background:var(--surface)">
      View all ${d.total} result${d.total!==1?'s':''} →</a>`
    box.innerHTML = html
  } catch(e) { box.innerHTML=`<div style="padding:1.5rem;text-align:center;color:var(--red)">${esc(e.message)}</div>` }
}
function openGlobalSearch() { const b=document.getElementById('globalSearchBar'); if(b){b.style.transform='translateY(0)';document.getElementById('gSearchInput')?.focus()} }
function closeGlobalSearch() { const b=document.getElementById('globalSearchBar'),r=document.getElementById('globalSearchResults'); if(b)b.style.transform='translateY(-100%)'; if(r)r.style.display='none' }

// ── Notifications bell ────────────────────────────────────────
async function loadNotifCount() {
  try {
    const d = await api.get('/api/notifications/unread-count')
    const badge = document.getElementById('notifBadge')
    if (badge) {
      badge.textContent = d.count > 0 ? (d.count > 9 ? '9+' : d.count) : ''
      badge.style.display = d.count > 0 ? 'flex' : 'none'
    }
  } catch {}
}

async function openNotifPanel() {
  let panel = document.getElementById('notifPanel')
  if (!panel) {
    panel = document.createElement('div')
    panel.id = 'notifPanel'
    panel.style.cssText = 'position:fixed;top:52px;right:1rem;width:340px;max-height:480px;background:var(--card-bg);border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,.15);z-index:150;display:flex;flex-direction:column;overflow:hidden'
    panel.innerHTML = `
      <div style="padding:.85rem 1rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <span style="font-size:.9rem;font-weight:600">Notifications</span>
        <div style="display:flex;gap:.5rem">
          <button onclick="markAllRead()" style="font-size:.75rem;background:none;border:none;cursor:pointer;color:var(--gold)">Mark all read</button>
          <button onclick="closeNotifPanel()" style="background:none;border:none;cursor:pointer;color:var(--ink-muted);font-size:1rem">✕</button>
        </div>
      </div>
      <div id="notifList" style="overflow-y:auto;flex:1"><div style="padding:2rem;text-align:center;color:var(--ink-muted);font-size:.875rem">Loading...</div></div>`
    document.body.appendChild(panel)
    setTimeout(() => document.addEventListener('click', outsideNotif), 10)
  } else {
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none'
    if (panel.style.display === 'none') return
  }
  renderNotifs()
}

function outsideNotif(e) {
  const panel = document.getElementById('notifPanel')
  const bell  = document.getElementById('notifBell')
  if (panel && !panel.contains(e.target) && !bell?.contains(e.target)) {
    closeNotifPanel()
    document.removeEventListener('click', outsideNotif)
  }
}
function closeNotifPanel() { const p=document.getElementById('notifPanel'); if(p) p.style.display='none' }

async function renderNotifs() {
  const list = document.getElementById('notifList')
  if (!list) return
  try {
    const d = await api.get('/api/notifications')
    if (!d.notifications.length) { list.innerHTML='<div style="padding:2rem;text-align:center;color:var(--ink-muted);font-size:.875rem">No notifications yet</div>'; return }
    list.innerHTML = d.notifications.map(n => `
      <a href="${n.link||'#'}" onclick="markRead('${n.id}')" style="display:block;padding:.75rem 1rem;border-bottom:1px solid var(--border);text-decoration:none;color:var(--ink);background:${n.isRead?'transparent':'var(--gold-pale)'}" onmouseover="this.style.background='var(--gold-pale)'" onmouseout="this.style.background='${n.isRead?'transparent':'var(--gold-pale)'}'">
        <div style="font-size:.83rem;font-weight:${n.isRead?'400':'500'}">${esc(n.title)}</div>
        ${n.body?`<div style="font-size:.75rem;color:var(--ink-muted);margin-top:.15rem">${esc(n.body)}</div>`:''}
        <div style="font-size:.7rem;color:var(--ink-muted);margin-top:.2rem">${timeAgo(n.createdAt||n.created_at)}</div>
      </a>`).join('')
    loadNotifCount()
  } catch(e) { list.innerHTML=`<div style="padding:1.5rem;text-align:center;color:var(--red);font-size:.85rem">${esc(e.message)}</div>` }
}

async function markRead(id) { try { await api.patch(`/api/notifications/${id}/read`); loadNotifCount() } catch {} }
async function markAllRead() {
  try { await api.patch('/api/notifications/read-all'); renderNotifs(); loadNotifCount() } catch(e) { toast(e.message,'error') }
}

// ── Sidebar + Layout ──────────────────────────────────────────
const NAVLINKS = [
  { page:'dashboard',   href:'/pages/dashboard.html',   label:'Dashboard',   icon:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' },
  { page:'exams',       href:'/pages/exams.html',       label:'Past Exams',  icon:'<path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>' },
  { page:'ai',          href:'/pages/ai-explain.html',  label:'AI Tutor',    icon:'<path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>' },
  { page:'notes',       href:'/pages/notes.html',       label:'Notes',       icon:'<path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>' },
  { page:'internships', href:'/pages/internships.html', label:'Internships', icon:'<path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>' },
  { page:'reviews',     href:'/pages/reviews.html',     label:'Course Reviews', icon:'<path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>' },
  { page:'bookmarks',   href:'/pages/bookmarks.html',   label:'Bookmarks',   icon:'<path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>' },
  { page:'marketplace', href:'/pages/marketplace.html', label:'Notes Marketplace', icon:'<path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>' },
  { page:'academics',   href:'/pages/academics.html',   label:'Academic Browser', icon:'<path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>' },
]

function renderLayout(active) {
  const tb = document.getElementById('topbarMount')
  const sb = document.getElementById('sidebarMount')
  const user = getUser()
  const adminLink = user?.isAdmin
    ? `<a href="/pages/admin.html" class="nav-link ${active==='admin'?'active':''}"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>Admin Panel</a>`
    : ''

  if (tb) tb.innerHTML = `
    <div class="topbar" id="topbar">
      <div style="font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:900">Uni<span style="color:var(--gold)">Hub</span></div>
      <button onclick="openGlobalSearch()" style="flex:1;max-width:320px;display:flex;align-items:center;gap:.6rem;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:6px;padding:.4rem .9rem;cursor:pointer;color:rgba(255,255,255,.6);font-size:.83rem;font-family:inherit" title="Search (/)">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        Search exams, notes, jobs...
        <span style="margin-left:auto;font-size:.7rem;background:rgba(255,255,255,.12);padding:.1rem .35rem;border-radius:3px">/</span>
      </button>
      <div style="display:flex;align-items:center;gap:.5rem;flex-shrink:0">
        <button id="themeBtn" onclick="toggleDarkMode()" style="background:none;border:none;cursor:pointer;font-size:1.1rem;padding:.3rem;border-radius:6px;color:white" title="Toggle dark mode">🌙</button>
        <div style="position:relative">
          <button id="notifBell" onclick="openNotifPanel()" style="background:none;border:none;cursor:pointer;font-size:1.1rem;padding:.3rem;border-radius:6px;color:white" title="Notifications">🔔</button>
          <span id="notifBadge" style="position:absolute;top:-2px;right:-2px;background:#ef4444;color:white;font-size:.6rem;font-weight:700;border-radius:10px;min-width:16px;height:16px;display:none;align-items:center;justify-content:center;padding:0 3px"></span>
        </div>
        <button class="menu-toggle" id="menuToggle">
          <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M3 7h18M3 12h18M3 17h18"/></svg>
        </button>
      </div>
    </div>
    <div class="hidden" id="sidebarOverlay" style="position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:99"></div>`

  if (sb) sb.innerHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo"><a href="/index.html">Uni<span>Hub</span></a></div>
      <nav class="sidebar-nav">
        ${NAVLINKS.map(l=>`<a href="${l.href}" class="nav-link ${active===l.page?'active':''}"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">${l.icon}</svg>${l.label}</a>`).join('')}
        ${adminLink}
      </nav>
      <div class="sidebar-user">
        <div class="user-info" style="cursor:pointer" onclick="window.location.href='/pages/profile.html?id=${user?.id}'">
          <div class="user-avatar" id="userAvatar">--</div>
          <div><div class="user-name" id="userName">Loading...</div><div class="user-uni" id="userUni"></div></div>
        </div>
        <button class="logout-btn" onclick="logout()">Sign out</button>
      </div>
    </aside>`

  injectGlobalSearch()
  setTimeout(() => { updateThemeBtn(); loadNotifCount() }, 0)

  document.addEventListener('keydown', e => {
    if (e.key==='/' && e.target.tagName!=='INPUT' && e.target.tagName!=='TEXTAREA') { e.preventDefault(); openGlobalSearch() }
  })
}

function initSidebar() {
  const u = getUser()
  if (!u) return
  const ini = ((u.firstName?.[0]||'')+(u.lastName?.[0]||'')).toUpperCase()
  const g = id => document.getElementById(id)
  if (g('userAvatar')) g('userAvatar').textContent = ini
  if (g('userName'))   g('userName').textContent   = `${u.firstName} ${u.lastName}`
  if (g('userUni'))    g('userUni').textContent     = UNIS[u.university] || u.university?.toUpperCase() || ''
  const toggle  = g('menuToggle')
  const sidebar = g('sidebar')
  const overlay = g('sidebarOverlay')
  toggle?.addEventListener('click', () => { sidebar?.classList.toggle('open'); overlay?.classList.toggle('hidden') })
  overlay?.addEventListener('click', () => { sidebar?.classList.remove('open'); overlay?.classList.add('hidden') })
}
