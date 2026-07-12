(function () {
  if (window.__edulinkInjected) return
  window.__edulinkInjected = true

  const EDULINK_URL = 'https://musical-broccoli-7qg65vrqpxw2p4wx-3000.app.github.dev'

  const DOWNLOADABLE_EXTENSIONS = [
    'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx',
    'zip', 'rar', '7z', 'mp4', 'mp3', 'wav',
    'txt', 'csv', 'epub', 'mobi',
  ]

  const ACADEMIC_KEYWORDS = [
    'question paper', 'past paper', 'exam paper', 'test paper', 'memo',
    'memorandum', 'past exam', 'previous exam', 'specimen', 'marking scheme',
    'mark scheme', 'model answer', 'lecture', 'notes', 'slides', 'tutorial',
    'assignment', 'worksheet', 'handout', 'syllabus', 'textbook', 'chapter',
    'study guide', 'course material', 'november', 'june', 'supplementary',
    'special exam', 'nov ', 'jun ', 'engineering', 'mathematics', 'physics',
    'chemistry', 'biology', 'economics', 'management', 'computer science',
  ]

  let userProfile = null
  let foundFiles = []
  let crawledPages = new Set()
  let crawlQueue = []
  let isCrawling = false
  let popup = null
  let previewPanel = null

  // ── LOAD PROFILE ─────────────────────────────────────────────
  chrome.storage.local.get(['edulinkUser', 'cachedFiles'], (result) => {
    userProfile = result.edulinkUser || null
    const domain = getDomain(window.location.href)
    const cached = result.cachedFiles || {}
    if (cached[domain]) {
      foundFiles = cached[domain]
      if (foundFiles.length > 0) {
        chrome.runtime.sendMessage({ type: 'FILES_FOUND', count: foundFiles.length, files: foundFiles, url: window.location.href })
      }
    }
    setTimeout(scanCurrentPage, 1500)
  })

  // ── SCAN CURRENT PAGE ─────────────────────────────────────────
  function scanCurrentPage () {
    const newFiles = extractFilesFromDOM(document)
    newFiles.forEach(f => { if (!foundFiles.find(x => x.url === f.url)) foundFiles.push(f) })
    if (foundFiles.length > 0) {
      chrome.runtime.sendMessage({ type: 'FILES_FOUND', count: foundFiles.length, files: foundFiles, url: window.location.href })
      showPopup()
    }
  }

  // ── EXTRACT FILES ─────────────────────────────────────────────
  function extractFilesFromDOM (doc) {
    const files = []
    const seen = new Set()

    doc.querySelectorAll('a[href]').forEach(link => {
      const href = resolveUrl(link.getAttribute('href') || '', window.location.href)
      if (!href || seen.has(href)) return
      const text = getFullLinkText(link)
      const ext = getExtension(href)

      if (ext && DOWNLOADABLE_EXTENSIONS.includes(ext)) {
        seen.add(href)
        files.push(buildFileObj(href, text, ext))
      } else if (
        href.includes('/ld.php') ||
        href.includes('content_id') ||
        href.includes('download') ||
        href.includes('file=') ||
        href.includes('attachment') ||
        href.includes('getfile') ||
        href.includes('serve')
      ) {
        const combined = (text + ' ' + href).toLowerCase()
        const isAcademic = ACADEMIC_KEYWORDS.some(kw => combined.includes(kw))
        const looksLikePaper = combined.match(/\b(nov|jun|dec|jan|feb|mar|apr|may|aug|sep|oct)\s*(20\d\d)/i)
        if (isAcademic || looksLikePaper) {
          seen.add(href)
          files.push(buildFileObj(href, text, 'pdf'))
        }
      }
    })

    return files
  }

  // ── BUILD FILE OBJECT ─────────────────────────────────────────
  function buildFileObj (href, text, ext) {
    const isRelevant = userProfile ? isRelevantToUser(href, text, userProfile) : false
    const isAcademic = ACADEMIC_KEYWORDS.some(kw => (text + ' ' + href).toLowerCase().includes(kw))
    const priority = getPriority(href, text, ext, isRelevant, isAcademic)

    return {
      url: href,
      name: getFileName(href, text),
      ext,
      text: text || getFileName(href, text),
      isAcademic,
      isRelevant,
      priority,
      relevanceReason: isRelevant ? getRelevanceReason(href, text, userProfile) : null,
      label: generateLabel(text, href),
      detectedAt: new Date().toISOString(),
      domain: getDomain(window.location.href),
    }
  }

  function getPriority (href, text, ext, isRelevant, isAcademic) {
    const combined = (text + ' ' + href).toLowerCase()
    if (isRelevant && combined.match(/\b(nov|jun|dec|jan|feb|mar|apr|may|aug|sep|oct)\s*(20\d\d)/i)) return 'high'
    if (isRelevant) return 'high'
    if (isAcademic && ext === 'pdf') return 'medium'
    if (isAcademic) return 'medium'
    return 'low'
  }

  function generateLabel (text, href) {
    const t = text.toLowerCase()
    if (t.includes('question paper') || t.includes('exam paper') || t.match(/(nov|jun|dec)\s+20\d\d/)) return 'Past Exam Paper'
    if (t.includes('memo') || t.includes('memorandum') || t.includes('mark scheme')) return 'Memo / Marking Guide'
    if (t.includes('lecture') || t.includes('slides') || t.includes('ppt')) return 'Lecture Slides'
    if (t.includes('notes')) return 'Study Notes'
    if (t.includes('textbook') || t.includes('chapter')) return 'Textbook / Chapter'
    if (t.includes('syllabus') || t.includes('curriculum')) return 'Syllabus'
    if (t.includes('tutorial') || t.includes('worksheet')) return 'Tutorial / Worksheet'
    if (t.includes('assignment')) return 'Assignment'
    if (t.includes('supplementary')) return 'Supplementary Exam'
    return 'Academic Document'
  }

  function isRelevantToUser (href, text, profile) {
    if (!profile) return false
    const combined = (href + ' ' + text).toLowerCase()
    const modules = profile.modules || []
    for (const mod of modules) { if (combined.includes(mod.toLowerCase())) return true }
    const field = (profile.field || '').toLowerCase()
    if (field && combined.includes(field)) return true
    return ACADEMIC_KEYWORDS.some(kw => combined.includes(kw))
  }

  function getRelevanceReason (href, text, profile) {
    const combined = (href + ' ' + text).toLowerCase()
    const modules = profile?.modules || []
    for (const mod of modules) { if (combined.includes(mod.toLowerCase())) return `Matches: ${mod}` }
    return 'Academic content'
  }

  // ── FULL WEBSITE CRAWL ────────────────────────────────────────
  async function startFullCrawl () {
    if (isCrawling) return
    isCrawling = true
    crawledPages = new Set()
    crawlQueue = [window.location.href]
    const baseDomain = getDomain(window.location.href)

    updateCrawlStatus('🔍 Starting full website scan...')

    while (crawlQueue.length > 0 && crawledPages.size < 200) {
      const url = crawlQueue.shift()
      if (crawledPages.has(url) || getDomain(url) !== baseDomain) continue
      crawledPages.add(url)

      updateCrawlStatus(`🔍 Page ${crawledPages.size}/${Math.max(50, crawledPages.size + crawlQueue.length)} · ${foundFiles.length} files found`)

      try {
        const res = await fetch(url, { method: 'GET', credentials: 'include', headers: { 'Accept': 'text/html,*/*' } })
        if (res.status === 401 || res.status === 403) {
          updateCrawlStatus(`🔒 Access restricted on ${url.split('/').pop()} — you may need to log in`)
          continue
        }
        if (!res.ok) continue
        const html = await res.text()
        const lower = html.toLowerCase()
        if (lower.includes('login') && lower.includes('password') && lower.includes('<form') && html.length < 15000) continue

        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const newFiles = extractFilesFromDOM(doc)
        let added = 0
        newFiles.forEach(f => { if (!foundFiles.find(x => x.url === f.url)) { foundFiles.push(f); added++ } })

        doc.querySelectorAll('a[href]').forEach(link => {
          const href = resolveUrl(link.getAttribute('href') || '', url)
          if (!href || getDomain(href) !== baseDomain || crawledPages.has(href) || crawlQueue.includes(href)) return
          const ext = getExtension(href)
          if (!ext || !DOWNLOADABLE_EXTENSIONS.includes(ext)) crawlQueue.push(href)
        })

        if (added > 0) {
          chrome.runtime.sendMessage({ type: 'FILES_FOUND', count: foundFiles.length, files: foundFiles, url: window.location.href })
          updateFileList()
        }
      } catch {}

      await sleep(250)
    }

    isCrawling = false

    const domain = getDomain(window.location.href)
    chrome.storage.local.get(['cachedFiles'], (res) => {
      const cached = res.cachedFiles || {}
      cached[domain] = foundFiles
      chrome.storage.local.set({ cachedFiles: cached })
    })

    const relevant = foundFiles.filter(f => f.priority === 'high').length
    updateCrawlStatus(`✅ Done! ${foundFiles.length} files found (${relevant} high priority) across ${crawledPages.size} pages`)
    updateFileList()

    chrome.runtime.sendMessage({
      type: 'CRAWL_COMPLETE',
      files: foundFiles,
      pageTitle: document.title,
      domain,
      pageCount: crawledPages.size,
    })
  }

  // ── POPUP UI ──────────────────────────────────────────────────
  function showPopup () {
    if (popup) { updateFileList(); return }
    popup = document.createElement('div')
    popup.id = 'edulink-popup'
    document.body.appendChild(popup)
    injectStyles()
    renderPopup()
  }

  function renderPopup () {
    if (!popup) return
    const relevant = foundFiles.filter(f => f.isRelevant || f.isAcademic)

    popup.innerHTML = `
      <div id="el-header">
        <div id="el-logo">
          <div id="el-logo-icon">E</div>
          <div>
            <div id="el-title">EduLink Smart Downloader</div>
            <div id="el-subtitle" id="el-sub">${foundFiles.length} files · ${relevant.length} match courses</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <button id="el-minimise" title="Minimise" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:14px">—</button>
          <button id="el-close">×</button>
        </div>
      </div>

      ${relevant.length > 0 ? `<div id="el-relevant-banner">📚 ${relevant.length} files match your modules</div>` : ''}

      <div id="el-crawl-bar">
        <div id="el-crawl-status">📄 Page scanned — click Scan Website for all files</div>
        <div style="display:flex;gap:5px;margin-top:7px;flex-wrap:wrap">
          <button id="el-btn-crawl" style="flex:1;padding:6px 8px;border-radius:7px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;border:none;font-size:10px;font-weight:700;cursor:pointer">🌐 Scan Whole Website</button>
          <button id="el-btn-stop" style="padding:6px 8px;border-radius:7px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#ef4444;font-size:10px;font-weight:700;cursor:pointer;display:none">⏹ Stop</button>
        </div>
      </div>

      <!-- SELECTION TOOLBAR -->
      <div id="el-select-bar">
        <button class="el-sel-btn" id="el-sel-all">☑ Select All</button>
        <button class="el-sel-btn" id="el-sel-relevant">📚 Select Relevant</button>
        <button class="el-sel-btn" id="el-sel-none">☐ None</button>
        <span id="el-sel-count" style="font-size:10px;color:#64748b;margin-left:auto;padding-right:4px">0 selected</span>
      </div>

      <div id="el-tabs">
        <button class="el-tab el-tab-active" data-tab="relevant">📚 Relevant (${relevant.length})</button>
        <button class="el-tab" data-tab="all">📁 All (${foundFiles.length})</button>
        <button class="el-tab" data-tab="high">🔴 Priority</button>
      </div>

      <div id="el-file-list">${renderFileList(relevant.length > 0 ? relevant : foundFiles)}</div>

      <div id="el-actions">
        <button id="el-dl-selected">⬇ Download Selected</button>
        <button id="el-dl-relevant" ${relevant.length === 0 ? 'disabled' : ''}>⬇ Relevant</button>
        <button id="el-save-edulink">📚 Save to EduLink</button>
      </div>
      <div id="el-status"></div>
    `
    attachEvents()
  }

  function renderFileList (files) {
    if (!files.length) return `<div class="el-empty">No files in this category yet</div>`
    return files.slice(0, 150).map((f, i) => `
      <div class="el-file-item" data-url="${escapeAttr(f.url)}">
        <input type="checkbox" class="el-checkbox" data-url="${escapeAttr(f.url)}" ${f.isRelevant || f.isAcademic ? 'checked' : ''}>
        <div class="el-file-icon">${getFileIcon(f.ext)}</div>
        <div class="el-file-info">
          <div class="el-file-name">${escapeHtml((f.text || f.name).slice(0, 72))}${(f.text || '').length > 72 ? '...' : ''}</div>
          <div class="el-file-meta">
            <span class="el-ext">.${(f.ext || '?').toUpperCase()}</span>
            ${f.priority === 'high' ? `<span class="el-badge-high">🔴 High Priority</span>` : ''}
            ${f.isRelevant ? `<span class="el-badge-relevant">📚 Course match</span>` : ''}
            ${f.label ? `<span class="el-label">${escapeHtml(f.label)}</span>` : ''}
          </div>
        </div>
        <div class="el-file-actions">
          <button class="el-preview-btn" data-url="${escapeAttr(f.url)}" data-name="${escapeAttr(f.text || f.name)}" title="Preview">👁</button>
          <button class="el-single-dl" data-url="${escapeAttr(f.url)}" data-name="${escapeAttr(f.name || 'file')}" title="Download">⬇</button>
        </div>
      </div>
    `).join('') + (files.length > 150 ? `<div class="el-empty">+${files.length - 150} more — save all to EduLink Library</div>` : '')
  }

  function updateFileList () {
    if (!popup) return
    const activeTab = popup.querySelector('.el-tab-active')?.dataset?.tab || 'relevant'
    let files
    if (activeTab === 'all') files = foundFiles
    else if (activeTab === 'high') files = foundFiles.filter(f => f.priority === 'high')
    else files = foundFiles.filter(f => f.isRelevant || f.isAcademic)

    const listEl = popup.querySelector('#el-file-list')
    if (listEl) { listEl.innerHTML = renderFileList(files); attachFileEvents() }
    const sub = popup.querySelector('#el-sub') || popup.querySelector('#el-subtitle')
    if (sub) sub.textContent = `${foundFiles.length} files · ${foundFiles.filter(f => f.isRelevant).length} match courses`
    const dlRel = popup.querySelector('#el-dl-relevant')
    if (dlRel) dlRel.disabled = foundFiles.filter(f => f.isRelevant || f.isAcademic).length === 0
  }

  function updateCrawlStatus (msg) {
    const el = popup?.querySelector('#el-crawl-status')
    if (el) el.textContent = msg
    const stopBtn = popup?.querySelector('#el-btn-stop')
    const crawlBtn = popup?.querySelector('#el-btn-crawl')
    if (stopBtn) stopBtn.style.display = isCrawling ? 'block' : 'none'
    if (crawlBtn) crawlBtn.textContent = isCrawling ? '🔍 Scanning...' : '🌐 Scan Whole Website'
  }

  function updateSelectionCount () {
    const checked = popup?.querySelectorAll('.el-checkbox:checked') || []
    const el = popup?.querySelector('#el-sel-count')
    if (el) el.textContent = `${checked.length} selected`
    const dlSel = popup?.querySelector('#el-dl-selected')
    if (dlSel) dlSel.textContent = `⬇ Download Selected (${checked.length})`
  }

  // ── PREVIEW PANEL ─────────────────────────────────────────────
  function openPreview (url, name) {
    if (previewPanel) previewPanel.remove()
    previewPanel = document.createElement('div')
    previewPanel.id = 'el-preview-panel'

    const isImage = /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(url)
    const isPdf = /\.(pdf)$/i.test(url) || url.includes('/ld.php') || url.includes('content_id')

    previewPanel.innerHTML = `
      <div id="el-preview-header">
        <div style="font-size:12px;font-weight:700;color:#f1f5f9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:280px">${escapeHtml(name)}</div>
        <div style="display:flex;gap:6px;align-items:center">
          <a href="${escapeAttr(url)}" download="${escapeAttr(name)}" style="padding:5px 10px;border-radius:6px;background:rgba(37,99,235,0.15);border:1px solid rgba(37,99,235,0.3);color:#60a5fa;font-size:10px;font-weight:700;text-decoration:none">⬇ Download</a>
          <a href="${escapeAttr(url)}" target="_blank" rel="noreferrer" style="padding:5px 10px;border-radius:6px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;font-size:10px;text-decoration:none">🔗 Open</a>
          <button id="el-preview-close" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:18px">×</button>
        </div>
      </div>
      <div id="el-preview-body">
        ${isPdf
          ? `<iframe src="${escapeAttr(url)}" style="width:100%;height:100%;border:none;background:#fff" sandbox="allow-same-origin allow-scripts allow-forms" allowfullscreen></iframe>`
          : isImage
          ? `<img src="${escapeAttr(url)}" style="max-width:100%;max-height:100%;object-fit:contain;display:block;margin:auto" onerror="this.src='';this.parentElement.innerHTML='<div style=padding:20px;color:#64748b;text-align:center>Preview not available<br><a href=${escapeAttr(url)} target=_blank style=color:#60a5fa>Open directly →</a></div>'">`
          : `<div style="padding:20px;text-align:center;color:#64748b">
              <div style="font-size:36px;margin-bottom:12px">${getFileIcon(getExtension(url) || 'pdf')}</div>
              <div style="font-size:13px;margin-bottom:12px">${escapeHtml(name)}</div>
              <a href="${escapeAttr(url)}" target="_blank" rel="noreferrer" style="padding:9px 20px;border-radius:9px;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;font-size:12px;font-weight:700;text-decoration:none">Open File →</a>
              <br><a href="${escapeAttr(url)}" download="${escapeAttr(name)}" style="display:inline-block;margin-top:10px;color:#60a5fa;font-size:12px">⬇ Download</a>
            </div>`
        }
      </div>
    `

    document.body.appendChild(previewPanel)
    previewPanel.querySelector('#el-preview-close')?.addEventListener('click', () => previewPanel?.remove())
    injectPreviewStyles()
  }

  // ── EVENTS ────────────────────────────────────────────────────
  function attachEvents () {
    popup.querySelector('#el-close')?.addEventListener('click', () => { popup?.remove(); popup = null })
    popup.querySelector('#el-minimise')?.addEventListener('click', () => {
      const list = popup.querySelector('#el-file-list')
      const actions = popup.querySelector('#el-actions')
      const bar = popup.querySelector('#el-select-bar')
      if (list) list.style.display = list.style.display === 'none' ? '' : 'none'
      if (actions) actions.style.display = actions.style.display === 'none' ? '' : 'none'
      if (bar) bar.style.display = bar.style.display === 'none' ? '' : 'none'
    })

    popup.querySelectorAll('.el-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        popup.querySelectorAll('.el-tab').forEach(t => t.classList.remove('el-tab-active'))
        tab.classList.add('el-tab-active')
        const name = tab.dataset.tab
        let files
        if (name === 'all') files = foundFiles
        else if (name === 'high') files = foundFiles.filter(f => f.priority === 'high')
        else files = foundFiles.filter(f => f.isRelevant || f.isAcademic)
        popup.querySelector('#el-file-list').innerHTML = renderFileList(files)
        attachFileEvents()
        updateSelectionCount()
      })
    })

    // Select all
    popup.querySelector('#el-sel-all')?.addEventListener('click', () => {
      popup.querySelectorAll('.el-checkbox').forEach(cb => cb.checked = true)
      updateSelectionCount()
    })
    // Select relevant
    popup.querySelector('#el-sel-relevant')?.addEventListener('click', () => {
      popup.querySelectorAll('.el-checkbox').forEach(cb => {
        const url = cb.dataset.url
        const file = foundFiles.find(f => f.url === url)
        cb.checked = !!(file?.isRelevant || file?.isAcademic)
      })
      updateSelectionCount()
    })
    // Select none
    popup.querySelector('#el-sel-none')?.addEventListener('click', () => {
      popup.querySelectorAll('.el-checkbox').forEach(cb => cb.checked = false)
      updateSelectionCount()
    })

    popup.querySelector('#el-btn-crawl')?.addEventListener('click', () => { if (!isCrawling) startFullCrawl() })
    popup.querySelector('#el-btn-stop')?.addEventListener('click', () => { isCrawling = false; updateCrawlStatus(`⏹ Stopped. ${foundFiles.length} files found.`) })

    // Download selected
    popup.querySelector('#el-dl-selected')?.addEventListener('click', () => {
      const selected = getCheckedFiles()
      if (!selected.length) { showStatus('No files selected'); return }
      chrome.runtime.sendMessage({ type: 'DOWNLOAD_FILES', files: selected })
      showStatus(`⬇ Downloading ${selected.length} selected files...`)
    })

    // Download relevant
    popup.querySelector('#el-dl-relevant')?.addEventListener('click', () => {
      const files = foundFiles.filter(f => f.isRelevant || f.isAcademic)
      chrome.runtime.sendMessage({ type: 'DOWNLOAD_FILES', files })
      showStatus(`⬇ Downloading ${files.length} relevant files...`)
    })

    // Save to EduLink — ONLY save selected/relevant files, not all
    popup.querySelector('#el-save-edulink')?.addEventListener('click', () => {
      const selected = getCheckedFiles()
      const toSave = selected.length > 0 ? selected : foundFiles.filter(f => f.isRelevant || f.isAcademic || f.priority === 'high')
      if (!toSave.length) { showStatus('Select files first or scan for relevant files'); return }
      chrome.runtime.sendMessage({
        type: 'SEND_TO_EDULINK',
        files: toSave,
        pageUrl: window.location.href,
        pageTitle: document.title,
        domain: getDomain(window.location.href),
      })
      showStatus(`📚 Saving ${toSave.length} files to EduLink...`)
    })

    attachFileEvents()
  }

  function attachFileEvents () {
    // Individual file preview buttons
    popup?.querySelectorAll('.el-preview-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        openPreview(btn.dataset.url, btn.dataset.name)
      })
    })
    // Individual file download buttons
    popup?.querySelectorAll('.el-single-dl').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        chrome.runtime.sendMessage({ type: 'DOWNLOAD_FILES', files: [{ url: btn.dataset.url, name: btn.dataset.name, ext: 'pdf' }] })
        showStatus(`⬇ Downloading ${btn.dataset.name}`)
      })
    })
    // Checkbox change
    popup?.querySelectorAll('.el-checkbox').forEach(cb => {
      cb.addEventListener('change', updateSelectionCount)
    })
    updateSelectionCount()
  }

  function getCheckedFiles () {
    const checked = []
    popup?.querySelectorAll('.el-checkbox:checked').forEach(cb => {
      const file = foundFiles.find(f => f.url === cb.dataset.url)
      if (file) checked.push(file)
    })
    return checked
  }

  function showStatus (msg) {
    const el = popup?.querySelector('#el-status')
    if (el) { el.textContent = msg; setTimeout(() => { if (el) el.textContent = '' }, 3000) }
  }

  // ── LISTENERS ─────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'PROFILE_UPDATED') { userProfile = msg.profile; chrome.storage.local.set({ edulinkUser: msg.profile }) }
    if (msg.type === 'RESCAN') { foundFiles = []; popup?.remove(); popup = null; scanCurrentPage() }
    if (msg.type === 'FULL_CRAWL') startFullCrawl()
    if (msg.type === 'DOWNLOAD_RELEVANT') { chrome.runtime.sendMessage({ type: 'DOWNLOAD_FILES', files: foundFiles.filter(f => f.isRelevant || f.isAcademic) }) }
    if (msg.type === 'DOWNLOAD_ALL') { chrome.runtime.sendMessage({ type: 'DOWNLOAD_FILES', files: foundFiles }) }
  })

  // ── HELPERS ───────────────────────────────────────────────────
  function getExtension (url) {
    try { const c = (url || '').split('?')[0].split('#')[0]; const e = c.split('.').pop().toLowerCase(); return e.length <= 5 && /^[a-z0-9]+$/.test(e) ? e : null } catch { return null }
  }
  function getFileName (url, text) {
    try { const c = url.split('?')[0].split('#')[0]; const p = c.split('/'); return p[p.length - 1] || text || 'file' } catch { return text || 'file' }
  }
  function getFullLinkText (link) {
    return ((link.textContent || '').trim() || link.getAttribute('title') || link.getAttribute('aria-label') || link.querySelector('img')?.getAttribute('alt') || '').trim().slice(0, 200)
  }
  function getDomain (url) { try { return new URL(url).hostname } catch { return '' } }
  function resolveUrl (href, base) { try { if (!href || href.startsWith('javascript:') || href.startsWith('mailto:')) return null; return new URL(href, base).href } catch { return null } }
  function escapeHtml (t) { return String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
  function escapeAttr (t) { return String(t || '').replace(/"/g, '&quot;') }
  function getFileIcon (ext) { return { pdf: '📄', doc: '📝', docx: '📝', ppt: '📊', pptx: '📊', xls: '📈', zip: '🗜️', mp4: '🎬', mp3: '🎵', epub: '📚', txt: '📋' }[ext] || '📁' }
  function sleep (ms) { return new Promise(r => setTimeout(r, ms)) }

  // ── INJECT STYLES ─────────────────────────────────────────────
  function injectStyles () {
    if (document.getElementById('edulink-styles')) return
    const style = document.createElement('style')
    style.id = 'edulink-styles'
    style.textContent = `
      #edulink-popup{position:fixed;bottom:24px;right:24px;width:420px;max-height:600px;background:#0f172a;border:1px solid rgba(37,99,235,0.45);border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,0.7);font-family:'Inter',system-ui,sans-serif;z-index:2147483647;overflow:hidden;display:flex;flex-direction:column;animation:el-slide 0.3s cubic-bezier(0.34,1.56,0.64,1)}
      @keyframes el-slide{from{transform:translateY(120px);opacity:0}to{transform:translateY(0);opacity:1}}
      #el-header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:linear-gradient(135deg,rgba(37,99,235,0.18),rgba(124,58,237,0.12));border-bottom:1px solid rgba(255,255,255,0.07)}
      #el-logo{display:flex;align-items:center;gap:9px}
      #el-logo-icon{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#2563eb,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#fff}
      #el-title{font-size:12px;font-weight:700;color:#f1f5f9}
      #el-subtitle{font-size:10px;color:#64748b;margin-top:1px}
      #el-close{background:none;border:none;color:#64748b;font-size:20px;cursor:pointer}
      #el-relevant-banner{padding:6px 14px;background:rgba(16,185,129,0.1);border-bottom:1px solid rgba(16,185,129,0.2);font-size:10px;color:#10b981;font-weight:600}
      #el-crawl-bar{padding:9px 11px;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(124,58,237,0.05)}
      #el-crawl-status{font-size:10px;color:#94a3b8;line-height:1.5}
      #el-select-bar{display:flex;align-items:center;gap:5px;padding:7px 11px;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02)}
      .el-sel-btn{padding:4px 9px;border-radius:6px;border:1px solid var(--border,rgba(255,255,255,0.1));background:rgba(255,255,255,0.04);color:#94a3b8;font-size:10px;font-weight:600;cursor:pointer}
      .el-sel-btn:hover{background:rgba(37,99,235,0.12);color:#60a5fa;border-color:rgba(37,99,235,0.3)}
      #el-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,0.07)}
      .el-tab{flex:1;padding:8px;background:none;border:none;color:#64748b;font-size:11px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;transition:all 0.15s}
      .el-tab-active{color:#60a5fa;font-weight:700;border-bottom-color:#2563eb;background:rgba(37,99,235,0.06)}
      #el-file-list{flex:1;overflow-y:auto;padding:6px;max-height:260px}
      .el-file-item{display:flex;align-items:flex-start;gap:7px;padding:7px 8px;border-radius:8px;margin-bottom:3px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05)}
      .el-file-item:hover{background:rgba(255,255,255,0.06)}
      .el-checkbox{margin-top:2px;flex-shrink:0;accent-color:#2563eb;width:13px;height:13px;cursor:pointer}
      .el-file-icon{font-size:15px;flex-shrink:0;margin-top:1px}
      .el-file-info{flex:1;min-width:0}
      .el-file-name{font-size:11px;font-weight:600;color:#e2e8f0;line-height:1.4;word-break:break-word}
      .el-file-meta{font-size:9px;color:#64748b;margin-top:2px;display:flex;flex-wrap:wrap;gap:3px;align-items:center}
      .el-ext{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:3px;padding:1px 4px;font-weight:700}
      .el-badge-high{background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.25);border-radius:3px;padding:1px 5px;font-size:9px;font-weight:700}
      .el-badge-relevant{background:rgba(16,185,129,0.12);color:#10b981;border:1px solid rgba(16,185,129,0.25);border-radius:3px;padding:1px 5px;font-size:9px;font-weight:700}
      .el-label{color:#a78bfa;font-size:9px}
      .el-file-actions{display:flex;gap:3px;flex-shrink:0;margin-top:1px}
      .el-preview-btn,.el-single-dl{background:none;border:1px solid rgba(255,255,255,0.08);border-radius:5px;color:#94a3b8;cursor:pointer;font-size:11px;padding:3px 6px}
      .el-preview-btn:hover{background:rgba(124,58,237,0.15);color:#a78bfa;border-color:rgba(124,58,237,0.3)}
      .el-single-dl:hover{background:rgba(37,99,235,0.15);color:#60a5fa;border-color:rgba(37,99,235,0.3)}
      .el-empty{text-align:center;color:#374151;padding:16px;font-size:11px}
      #el-actions{padding:9px 10px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:5px;flex-wrap:wrap}
      #el-actions button{flex:1;padding:7px 6px;border-radius:7px;font-size:10px;font-weight:700;cursor:pointer;border:none;min-width:60px;white-space:nowrap}
      #el-dl-selected{background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff}
      #el-dl-relevant{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
      #el-dl-relevant:disabled{background:rgba(255,255,255,0.05);color:#374151;cursor:not-allowed}
      #el-save-edulink{background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff}
      #el-status{padding:4px 12px;font-size:10px;color:#10b981;text-align:center;min-height:18px}
    `
    document.head.appendChild(style)
  }

  function injectPreviewStyles () {
    if (document.getElementById('el-preview-styles')) return
    const s = document.createElement('style')
    s.id = 'el-preview-styles'
    s.textContent = `
      #el-preview-panel{position:fixed;top:0;right:440px;width:580px;height:100vh;background:#0f172a;border-left:1px solid rgba(37,99,235,0.3);border-right:1px solid rgba(37,99,235,0.3);z-index:2147483646;display:flex;flex-direction:column;box-shadow:-8px 0 32px rgba(0,0,0,0.6);animation:el-preview-slide 0.2s ease-out;font-family:'Inter',system-ui,sans-serif}
      @keyframes el-preview-slide{from{transform:translateX(50px);opacity:0}to{transform:translateX(0);opacity:1}}
      #el-preview-header{padding:12px 16px;background:linear-gradient(135deg,rgba(37,99,235,0.15),rgba(124,58,237,0.1));border-bottom:1px solid rgba(255,255,255,0.07);display:flex;justify-content:space-between;align-items:center;gap:10px;flex-shrink:0}
      #el-preview-body{flex:1;overflow:hidden;background:#f8f9fa}
    `
    document.head.appendChild(s)
  }

})()