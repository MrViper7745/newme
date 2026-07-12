const EDULINK_BASE = 'https://musical-broccoli-7qg65vrqpxw2p4wx-3000.app.github.dev'

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === 'FILES_FOUND') {
    chrome.action.setBadgeText({ text: String(msg.count), tabId: sender.tab?.id })
    chrome.action.setBadgeBackgroundColor({ color: '#2563eb', tabId: sender.tab?.id })
    const relevant = (msg.files || []).filter(f => f.priority === 'high')
    if (relevant.length > 0) {
      chrome.notifications.create('files_' + Date.now(), {
        type: 'basic', iconUrl: 'icons/icon48.png',
        title: 'EduLink — Course Materials Found!',
        message: `${relevant.length} high-priority files found on ${new URL(msg.url || 'https://x.com').hostname}`,
        buttons: [{ title: '⬇ Download' }, { title: '📚 EduLink' }],
        priority: 2,
      })
    }
    sendResponse({ received: true })
  }

  if (msg.type === 'SEND_TO_EDULINK') {
    const files = msg.files || []
    // Only save relevant/academic/high priority files
    const toSave = files.filter(f => f.isRelevant || f.isAcademic || f.priority === 'high')

    if (!toSave.length) {
      chrome.notifications.create('save_empty_' + Date.now(), {
        type: 'basic', iconUrl: 'icons/icon48.png',
        title: 'EduLink — Nothing to Save',
        message: 'No course-relevant files were selected. Use "Select Relevant" to pick the right files first.',
      })
      sendResponse({ saved: 0 })
      return
    }

    // Get auth token from storage
    chrome.storage.local.get(['edulinkToken', 'edulinkUserId'], async (result) => {
      try {
        const res = await fetch(`${EDULINK_BASE}/api/library-save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${result.edulinkToken || ''}` },
          body: JSON.stringify({
            action: 'save',
            files: toSave,
            domain: msg.domain,
            pageTitle: msg.pageTitle,
            userId: result.edulinkUserId,
          }),
        })
        const data = await res.json()

        chrome.notifications.create('saved_' + Date.now(), {
          type: 'basic', iconUrl: 'icons/icon48.png',
          title: `EduLink — ${data.saved || 0} Files Saved!`,
          message: data.saved > 0
            ? `${data.saved} course-relevant files saved to your EduLink Library.`
            : 'Files already saved or no relevant files found.',
        })

        if (data.saved > 0) {
          setTimeout(() => chrome.tabs.create({ url: EDULINK_BASE + '/library' }), 1000)
        }
      } catch (e) {
        // Fallback: save to local storage and open library
        chrome.storage.local.get(['edulinkFiles'], (res) => {
          const existing = res.edulinkFiles || []
          const merged = [...existing]
          toSave.forEach(f => { if (!merged.find(x => x.url === f.url)) merged.push({ ...f, savedAt: new Date().toISOString() }) })
          chrome.storage.local.set({ edulinkFiles: merged })
        })
        chrome.notifications.create('saved_local_' + Date.now(), {
          type: 'basic', iconUrl: 'icons/icon48.png',
          title: 'EduLink — Saved Locally',
          message: `${toSave.length} files saved. Log in to EduLink to sync them.`,
        })
        setTimeout(() => chrome.tabs.create({ url: EDULINK_BASE + '/library' }), 1000)
      }
    })
    sendResponse({ received: true })
    return true
  }

  if (msg.type === 'CRAWL_COMPLETE') {
    chrome.storage.local.get(['edulinkFiles'], (res) => {
      const existing = res.edulinkFiles || []
      const highPriority = (msg.files || []).filter(f => f.priority === 'high' || f.isRelevant)
      const merged = [...existing]
      highPriority.forEach(f => { if (!merged.find(x => x.url === f.url)) merged.push({ ...f, crawledAt: new Date().toISOString() }) })
      chrome.storage.local.set({ edulinkFiles: merged })
    })

    const highCount = (msg.files || []).filter(f => f.priority === 'high').length
    chrome.notifications.create('crawl_' + Date.now(), {
      type: 'basic', iconUrl: 'icons/icon48.png',
      title: 'EduLink — Website Scan Complete!',
      message: `Found ${(msg.files || []).length} files (${highCount} high priority) across ${msg.pageCount} pages.`,
    })
    sendResponse({ received: true })
  }

  if (msg.type === 'DOWNLOAD_FILES') {
    const files = msg.files || []
    files.forEach((f, i) => {
      setTimeout(() => {
        chrome.downloads.download({ url: f.url, filename: `EduLink Downloads/${sanitize(f.name || 'file')}`, saveAs: false }).catch(() => {})
      }, i * 600)
    })
    sendResponse({ success: true, count: files.length })
  }

  return true
})

chrome.notifications.onButtonClicked.addListener((notifId, btnIndex) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      if (btnIndex === 0) chrome.tabs.sendMessage(tabs[0].id, { type: 'DOWNLOAD_RELEVANT' }).catch(() => {})
      else chrome.tabs.create({ url: EDULINK_BASE + '/library' })
    }
  })
})

chrome.tabs.onActivated.addListener((info) => chrome.action.setBadgeText({ text: '', tabId: info.tabId }))
function sanitize (n) { return String(n || 'file').replace(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 120) }