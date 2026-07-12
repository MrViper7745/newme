const EDULINK_BASE = 'https://musical-broccoli-7qg65vrqpxw2p4wx-3000.app.github.dev'

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // ── FILES FOUND ───────────────────────────────────────────────
  if (msg.type === 'FILES_FOUND') {
    chrome.action.setBadgeText({ text: String(msg.count), tabId: sender.tab?.id })
    chrome.action.setBadgeBackgroundColor({ color: '#2563eb', tabId: sender.tab?.id })
    const relevant = (msg.files || []).filter(f => f.isRelevant || f.isAcademic)
    if (relevant.length > 0) {
      chrome.notifications.create('files_' + Date.now(), {
        type: 'basic', iconUrl: 'icons/icon48.png',
        title: 'EduLink — Course Materials Found!',
        message: `${relevant.length} relevant files found on ${tryGetHostname(msg.url)}`,
        buttons: [{ title: '⬇ Download' }, { title: '📚 Open Library' }],
        priority: 2,
      })
    }
    sendResponse({ received: true })
    return true
  }

  // ── SAVE TO EDULINK ───────────────────────────────────────────
  if (msg.type === 'SEND_TO_EDULINK') {
  const files = msg.files || []

  if (!files.length) {
    chrome.notifications.create('empty_' + Date.now(), {
      type: 'basic', iconUrl: 'icons/icon48.png',
      title: 'EduLink — Nothing Selected',
      message: 'No files were selected. Use the checkboxes to select files first.',
    })
    sendResponse({ saved: 0 })
    return true
  }

  // Always try to get a FRESH token from an open EduLink tab first
  refreshTokenFromOpenTab(async () => {
    chrome.storage.local.get(['edulinkToken', 'edulinkUserId'], async (result) => {
      const token = result.edulinkToken
      const userId = result.edulinkUserId

      if (!userId) {
        chrome.notifications.create('noauth_' + Date.now(), {
          type: 'basic', iconUrl: 'icons/icon48.png',
          title: 'EduLink — Please Log In',
          message: 'Open EduLink and log in first, then try saving again.',
        })
        chrome.tabs.create({ url: EDULINK_BASE + '/login' })
        sendResponse({ error: 'not_authenticated' })
        return
      }

      try {
        const res = await fetch(`${EDULINK_BASE}/api/library-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files, userId, token }),
        })

        const data = await res.json()

        if (res.status === 401) {
          chrome.notifications.create('auth_err_' + Date.now(), {
            type: 'basic', iconUrl: 'icons/icon48.png',
            title: 'EduLink — Login Expired',
            message: 'Please open EduLink, refresh the page, then try saving again.',
          })
          chrome.tabs.create({ url: EDULINK_BASE + '/library' })
          sendResponse({ error: 'expired' })
          return
        }

        if (data.saved > 0) {
          chrome.notifications.create('saved_' + Date.now(), {
            type: 'basic', iconUrl: 'icons/icon48.png',
            title: `EduLink — ${data.saved} Files Saved! ✅`,
            message: `${data.saved} files saved. Opening EduLink now...`,
          })
          setTimeout(() => chrome.tabs.create({ url: EDULINK_BASE + '/library' }), 800)
        } else {
          chrome.notifications.create('exists_' + Date.now(), {
            type: 'basic', iconUrl: 'icons/icon48.png',
            title: 'EduLink — Already Saved',
            message: data.message || 'These files are already in your library.',
          })
          chrome.tabs.create({ url: EDULINK_BASE + '/library' })
        }

        sendResponse({ saved: data.saved })
      } catch (e) {
        console.error('EduLink sync failed:', e)
        chrome.notifications.create('err_' + Date.now(), {
          type: 'basic', iconUrl: 'icons/icon48.png',
          title: 'EduLink — Sync Failed',
          message: 'Could not reach EduLink. Make sure it is running.',
        })
        sendResponse({ error: e.message })
      }
    })
  })

  return true
}

// ── NEW HELPER: refresh token from any open EduLink tab ─────────
function refreshTokenFromOpenTab(callback) {
  chrome.tabs.query({ url: EDULINK_BASE + '/*' }, (tabs) => {
    if (tabs.length === 0) {
      callback() // No open tab, proceed with whatever is cached
      return
    }
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => ({
        token: localStorage.getItem('edulinkToken'),
        userId: localStorage.getItem('edulinkUserId'),
      }),
    }).then(results => {
      const creds = results?.[0]?.result
      if (creds?.token && creds?.userId) {
        chrome.storage.local.set({ edulinkToken: creds.token, edulinkUserId: creds.userId }, callback)
      } else {
        callback()
      }
    }).catch(() => callback())
  })
}

  // ── CRAWL COMPLETE ────────────────────────────────────────────
  if (msg.type === 'CRAWL_COMPLETE') {
    const highPriority = (msg.files || []).filter(f => f.isRelevant || f.isAcademic)
    const highCount = (msg.files || []).filter(f => f.priority === 'high').length

    chrome.notifications.create('crawl_' + Date.now(), {
      type: 'basic', iconUrl: 'icons/icon48.png',
      title: 'EduLink — Website Scan Complete!',
      message: `Found ${(msg.files || []).length} files (${highCount} high priority) across ${msg.pageCount} pages. Select files and click Save to EduLink.`,
    })
    sendResponse({ received: true })
    return true
  }

  // ── DOWNLOAD FILES ────────────────────────────────────────────
  if (msg.type === 'DOWNLOAD_FILES') {
    const files = msg.files || []
    files.forEach((f, i) => {
      setTimeout(() => {
        chrome.downloads.download({
          url: f.url,
          filename: `EduLink Downloads/${sanitize(f.name || 'file')}`,
          saveAs: false,
        }).catch(() => {})
      }, i * 600)
    })
    sendResponse({ success: true, count: files.length })
    return true
  }

  return true
})

// ── NOTIFICATION BUTTON CLICKS ────────────────────────────────
chrome.notifications.onButtonClicked.addListener((notifId, btnIndex) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      if (btnIndex === 0) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'DOWNLOAD_RELEVANT' }).catch(() => {})
      } else {
        chrome.tabs.create({ url: EDULINK_BASE + '/library' })
      }
    }
  })
})

// ── CLEAR BADGE ON TAB CHANGE ─────────────────────────────────
chrome.tabs.onActivated.addListener((info) => {
  chrome.action.setBadgeText({ text: '', tabId: info.tabId })
})

// ── HELPERS ───────────────────────────────────────────────────
function sanitize(n) {
  return String(n || 'file').replace(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 120)
}

function tryGetHostname(url) {
  try { return new URL(url || 'https://unknown.com').hostname } catch { return 'this page' }
}