const EDULINK_BASE = 'https://musical-broccoli-7qg65vrqpxw2p4wx-3000.app.github.dev'

let savedFiles = []
let userProfile = null

document.addEventListener('DOMContentLoaded', async () => {
  await loadProfile()
  loadSavedFiles()
  updateScannerStatus()
  setupTabs()
  setupButtons()
})

// ── TABS ──────────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'))
      tab.classList.add('active')
      document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('active')
    })
  })
}

// ── SCANNER STATUS ────────────────────────────────────────────────
function updateScannerStatus() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0]
    if (!tab) return
    const statusEl = document.getElementById('page-status')
    if (!statusEl) return
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
function setupButtons() {
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

  document.getElementById('btn-rescan')?.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'RESCAN' })
        showToast('🔍 Rescanning page...')
      }
    })
  })

  document.getElementById('btn-download-relevant')?.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'DOWNLOAD_RELEVANT' })
        showToast('⬇ Downloading relevant files...')
      }
    })
  })

  document.getElementById('btn-download-all')?.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'DOWNLOAD_ALL' })
        showToast('⬇ Downloading all files...')
      }
    })
  })

  document.getElementById('btn-open-studyai')?.addEventListener('click', () => {
    chrome.tabs.create({ url: EDULINK_BASE + '/study-ai' })
  })

  document.getElementById('btn-clear-saved')?.addEventListener('click', () => {
    chrome.storage.local.set({ pendingFiles: [] })
    savedFiles = []
    renderSavedFiles()
    showToast('🗑 Cleared')
  })

  document.getElementById('btn-save-profile')?.addEventListener('click', saveProfile)

  document.getElementById('btn-sync-edulink')?.addEventListener('click', () => {
    // Open EduLink and read credentials from it
    chrome.tabs.create({ url: EDULINK_BASE + '/settings' }, (tab) => {
      // After tab loads, try to read credentials
      setTimeout(() => readCredentialsFromEduLink(), 3000)
    })
    showToast('Opening EduLink to sync...')
  })

  document.getElementById('btn-refresh-auth')?.addEventListener('click', async () => {
    showToast('🔄 Reading credentials from EduLink...')
    const success = await readCredentialsFromEduLink()
    if (success) {
      showToast('✅ Logged in successfully!')
    } else {
      showToast('⚠️ Please open EduLink and log in first')
    }
  })
}

// ── READ CREDENTIALS FROM EDULINK PAGE ───────────────────────────
async function readCredentialsFromEduLink() {
  return new Promise((resolve) => {
    // Find any open EduLink tab
    chrome.tabs.query({ url: EDULINK_BASE + '/*' }, async (tabs) => {
      if (tabs.length === 0) {
        // No EduLink tab open
        resolve(false)
        return
      }

      try {
        // Inject script to read localStorage from EduLink page
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            return {
              token: localStorage.getItem('edulinkToken'),
              userId: localStorage.getItem('edulinkUserId'),
            }
          },
        })

        const creds = results?.[0]?.result
        if (creds?.token && creds?.userId) {
          // Save to extension storage so background.js can use them
          await chrome.storage.local.set({
            edulinkToken: creds.token,
            edulinkUserId: creds.userId,
          })

          // Update UI
          const statusEl = document.getElementById('auth-status')
          if (statusEl) {
            statusEl.textContent = `✅ Logged in (${creds.userId.slice(0, 8)}...)`
            statusEl.style.color = '#10b981'
          }
          const profileStatus = document.getElementById('profile-status')
          if (profileStatus) {
            profileStatus.textContent = `✅ Logged in to EduLink`
          }

          resolve(true)
        } else {
          // Token not found — user may need to log in
          const statusEl = document.getElementById('auth-status')
          if (statusEl) {
            statusEl.textContent = '⚠️ Not logged in — open EduLink and log in'
            statusEl.style.color = '#f59e0b'
          }
          resolve(false)
        }
      } catch (err) {
        console.error('Script injection failed:', err)
        resolve(false)
      }
    })
  })
}

// ── PROFILE ───────────────────────────────────────────────────────
async function loadProfile() {
  // First try to read from chrome storage (previously saved)
  chrome.storage.local.get(['edulinkUser', 'edulinkToken', 'edulinkUserId'], async (result) => {
    const authStatus = document.getElementById('auth-status')

    if (result.edulinkUserId) {
      if (authStatus) {
        authStatus.textContent = `✅ Logged in (${result.edulinkUserId.slice(0, 8)}...)`
        authStatus.style.color = '#10b981'
      }
    } else {
      if (authStatus) {
        authStatus.textContent = '⚠️ Not logged in — click "Read from EduLink"'
        authStatus.style.color = '#f59e0b'
      }
    }

    // Load profile form fields
    const user = result.edulinkUser
    if (user) {
      const nameEl = document.getElementById('profile-name')
      const fieldEl = document.getElementById('profile-field')
      const modulesEl = document.getElementById('profile-modules')
      const coursesEl = document.getElementById('profile-courses')
      const institutionEl = document.getElementById('profile-institution')
      if (nameEl) nameEl.value = user.name || ''
      if (fieldEl) fieldEl.value = user.field || ''
      if (modulesEl) modulesEl.value = (user.modules || []).join('\n')
      if (coursesEl) coursesEl.value = user.courses || ''
      if (institutionEl) institutionEl.value = user.institution || ''
    }
  })

  // Then try to refresh from open EduLink tab
  await readCredentialsFromEduLink()
}

function saveProfile() {
  const profile = {
    name: document.getElementById('profile-name')?.value.trim() || '',
    field: document.getElementById('profile-field')?.value.trim() || '',
    modules: (document.getElementById('profile-modules')?.value || '').split('\n').map(s => s.trim()).filter(Boolean),
    courses: document.getElementById('profile-courses')?.value.trim() || '',
    institution: document.getElementById('profile-institution')?.value.trim() || '',
    updatedAt: new Date().toISOString(),
  }
  chrome.storage.local.set({ edulinkUser: profile })
  userProfile = profile

  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { type: 'PROFILE_UPDATED', profile }).catch(() => {})
    })
  })

  const statusEl = document.getElementById('profile-status')
  if (statusEl) {
    statusEl.textContent = '✅ Profile saved!'
    setTimeout(() => { statusEl.textContent = '' }, 3000)
  }
}

// ── SAVED FILES ───────────────────────────────────────────────────
function loadSavedFiles() {
  chrome.storage.local.get(['pendingFiles'], (result) => {
    savedFiles = result.pendingFiles || []
    renderSavedFiles()
  })
}

function renderSavedFiles() {
  const container = document.getElementById('saved-files-list')
  if (!container) return
  if (!savedFiles.length) {
    container.innerHTML = `<div style="text-align:center;color:#374151;padding:24px 0;font-size:12px;">No saved files yet.</div>`
    return
  }
  container.innerHTML = savedFiles.slice(-20).reverse().map(f => `
    <div class="file-item">
      <span style="font-size:16px">${getFileIcon(f.ext)}</span>
      <div class="file-name">${escapeHtml(f.text || f.name || 'File')}</div>
      <span class="file-ext">.${(f.ext || '?').toUpperCase()}</span>
      ${f.isRelevant ? '<span class="badge badge-green">📚</span>' : ''}
      <button onclick="downloadSaved('${escapeHtml(f.url)}')" style="background:none;border:none;cursor:pointer;color:#60a5fa;font-size:14px" title="Download">⬇</button>
    </div>
  `).join('')
}

window.downloadSaved = function(url) {
  chrome.downloads.download({ url, saveAs: false })
  showToast('⬇ Downloading...')
}

// ── HELPERS ───────────────────────────────────────────────────────
function getFileIcon(ext) {
  const icons = { pdf: '📄', doc: '📝', docx: '📝', ppt: '📊', pptx: '📊', xls: '📈', xlsx: '📈', zip: '🗜️', mp4: '🎬', mp3: '🎵', jpg: '🖼️', png: '🖼️', epub: '📚', txt: '📋' }
  return icons[ext] || '📁'
}

function escapeHtml(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function showToast(msg) {
  let toast = document.querySelector('.toast')
  if (toast) toast.remove()
  toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = msg
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 2500)
}