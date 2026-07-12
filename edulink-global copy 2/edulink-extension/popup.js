const EDULINK_BASE = 'https://musical-broccoli-7qg65vrqpxw2p4wx-3000.app.github.dev'

let savedFiles = []
let userProfile = null

document.addEventListener('DOMContentLoaded', async () => {
  loadProfile()
  loadSavedFiles()
  updateScannerStatus()
  setupTabs()
  setupButtons()
})

// ── TABS ─────────────────────────────────────────────────────────
function setupTabs () {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'))
      tab.classList.add('active')
      document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('active')
    })
  })
}

// ── SCANNER TAB ──────────────────────────────────────────────────
function updateScannerStatus () {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0]
    if (!tab) return
    const statusEl = document.getElementById('page-status')
    const url = tab.url || ''
    const hostname = (() => { try { return new URL(url).hostname } catch { return url } })()
    statusEl.innerHTML = `
      <div class="status-icon">📍</div>
      <div>
        <div class="status-text">${hostname}</div>
        <div class="status-sub">Click Rescan to check for downloadable files</div>
      </div>
    `
  })
}

// ── BUTTONS ───────────────────────────────────────────────────────
function setupButtons () {

// In setupButtons(), add after existing buttons:
document.getElementById('btn-full-crawl')?.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'FULL_CRAWL' })
      showToast('🌐 Full website scan started...')
    }
  })
})

document.getElementById('btn-view-library')?.addEventListener('click', () => {
  chrome.tabs.create({ url: EDULINK_BASE + '/library' })
})

  // Rescan
  document.getElementById('btn-rescan')?.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'RESCAN' })
        showToast('🔍 Rescanning page...')
      }
    })
  })

  // Download relevant
  document.getElementById('btn-download-relevant')?.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'DOWNLOAD_RELEVANT' })
        showToast('⬇ Downloading relevant files...')
      }
    })
  })

  // Download all
  document.getElementById('btn-download-all')?.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'DOWNLOAD_ALL' })
        showToast('⬇ Downloading all files...')
      }
    })
  })

  // Open Study AI
  document.getElementById('btn-open-studyai')?.addEventListener('click', () => {
    chrome.tabs.create({ url: EDULINK_BASE + '/study-ai' })
  })

  // Clear saved
  document.getElementById('btn-clear-saved')?.addEventListener('click', () => {
    chrome.storage.local.set({ pendingFiles: [] })
    savedFiles = []
    renderSavedFiles()
    showToast('🗑 Cleared')
  })

  // Save profile
  document.getElementById('btn-save-profile')?.addEventListener('click', saveProfile)

  // Sync from EduLink
  document.getElementById('btn-sync-edulink')?.addEventListener('click', () => {
    chrome.tabs.create({ url: EDULINK_BASE + '/settings?source=extension' })
    showToast('Opening EduLink to sync...')
  })
}

// ── PROFILE ───────────────────────────────────────────────────────
function loadProfile () {
  chrome.storage.local.get(['edulinkUser'], (result) => {
    userProfile = result.edulinkUser
    if (userProfile) {
      document.getElementById('profile-name').value = userProfile.name || ''
      document.getElementById('profile-field').value = userProfile.field || ''
      document.getElementById('profile-modules').value = (userProfile.modules || []).join('\n')
      document.getElementById('profile-courses').value = userProfile.courses || ''
      document.getElementById('profile-institution').value = userProfile.institution || ''
    }
  })
}

function saveProfile () {
  const profile = {
    name: document.getElementById('profile-name').value.trim(),
    field: document.getElementById('profile-field').value.trim(),
    modules: document.getElementById('profile-modules').value.split('\n').map(s => s.trim()).filter(Boolean),
    courses: document.getElementById('profile-courses').value.trim(),
    institution: document.getElementById('profile-institution').value.trim(),
    updatedAt: new Date().toISOString(),
  }
  chrome.storage.local.set({ edulinkUser: profile })
  userProfile = profile

  // Broadcast to all tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { type: 'PROFILE_UPDATED', profile }).catch(() => {})
    })
  })

  const statusEl = document.getElementById('profile-status')
  statusEl.textContent = '✅ Profile saved! EduLink will now match files to your modules.'
  setTimeout(() => { statusEl.textContent = '' }, 3000)
}

// ── SAVED FILES ───────────────────────────────────────────────────
function loadSavedFiles () {
  chrome.storage.local.get(['pendingFiles'], (result) => {
    savedFiles = result.pendingFiles || []
    renderSavedFiles()
  })
}

function renderSavedFiles () {
  const container = document.getElementById('saved-files-list')
  if (!savedFiles.length) {
    container.innerHTML = `<div style="text-align:center;color:#374151;padding:24px 0;font-size:12px;">No saved files yet.<br>Browse websites and save files to see them here.</div>`
    return
  }

  container.innerHTML = savedFiles.slice(-20).reverse().map((f, i) => `
    <div class="file-item">
      <span style="font-size:16px">${getFileIcon(f.ext)}</span>
      <div class="file-name">${escapeHtml(f.text || f.name || 'File')}</div>
      <span class="file-ext">.${(f.ext || '?').toUpperCase()}</span>
      ${f.isRelevant ? '<span class="badge badge-green">📚</span>' : ''}
      <button onclick="downloadSaved('${escapeHtml(f.url)}')" style="background:none;border:none;cursor:pointer;color:#60a5fa;font-size:14px;flex-shrink:0;" title="Download">⬇</button>
    </div>
  `).join('')
}

window.downloadSaved = function (url) {
  chrome.downloads.download({ url, saveAs: false })
  showToast('⬇ Downloading...')
}

// ── HELPERS ───────────────────────────────────────────────────────
function getFileIcon (ext) {
  const icons = { pdf: '📄', doc: '📝', docx: '📝', ppt: '📊', pptx: '📊', xls: '📈', xlsx: '📈', zip: '🗜️', mp4: '🎬', mp3: '🎵', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', epub: '📚', txt: '📋', default: '📁' }
  return icons[ext] || icons.default
}

function escapeHtml (text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function showToast (msg) {
  let toast = document.querySelector('.toast')
  if (toast) toast.remove()
  toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = msg
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 2500)
}