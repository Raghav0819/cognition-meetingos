// content.js — full rewrite of the capturing logic

let isRecording  = false
let transcript   = []
let participants = new Set()
let observer     = null
let debounceTimer = null
let lastCapturedText = ''   // track truly last saved text

const CAPTION_SELECTORS = [
  '[jsname="tgaKEf"]',
  '[class*="CNusmb"]',
  '[data-message-text]',
  '.iOzk7',
  '[jsname="YSxPC"]',
  '[class*="caption-text"]',
  '[class*="transcript"]',
]

const NAME_SELECTORS = [
  '[data-self-name]',
  '[jsname="oxlgce"]',
  '[class*="zWGUib"]',
  '[data-participant-id] [class*="name"]',
  '[class*="participant-name"]',
]

function findCaptions() {
  for (const sel of CAPTION_SELECTORS) {
    const els = document.querySelectorAll(sel)
    if (els.length > 0) return els
  }
  return []
}

function findNames() {
  const names = new Set()
  for (const sel of NAME_SELECTORS) {
    document.querySelectorAll(sel).forEach(el => {
      const name = el.innerText?.trim()
      if (name && name.length > 1 && name.length < 50) names.add(name)
    })
  }
  return names
}

function captureStableText() {
  const captions = findCaptions()
  captions.forEach(el => {
    const text = el.innerText?.trim()
    if (!text || text.length < 3) return

    // Only save if this is different from the last saved line
    // AND it's been stable for 1.5 seconds (debounce handles this)
    if (text !== lastCapturedText) {
      // Remove the previous entry if it's a prefix of current text
      // (handles the word-by-word buildup case)
      const last = transcript[transcript.length - 1]
      if (last && text.startsWith(last.text)) {
        transcript.pop()   // replace incomplete line with complete one
      }

      transcript.push({
        speaker: 'Participant',
        text,
        time: new Date().toLocaleTimeString()
      })
      lastCapturedText = text
    }
  })

  // Capture participants
  const names = findNames()
  names.forEach(n => participants.add(n))
}

function startCapturing() {
  lastCapturedText = ''

  observer = new MutationObserver(() => {
    // Debounce: wait 1500ms of silence before saving
    // This lets the caption finish building before we capture it
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(captureStableText, 1500)
  })

  observer.observe(document.body, {
    childList:     true,
    subtree:       true,
    characterData: true,
    attributes:    false   // don't watch attributes — reduces noise
  })

  console.log('[MeetingOS] Recording started')
}

function stopCapturing() {
  clearTimeout(debounceTimer)
  // Capture any final in-flight text before stopping
  captureStableText()
  if (observer) { observer.disconnect(); observer = null }
  console.log('[MeetingOS] Stopped. Lines:', transcript.length)
}

// Rest of message listener stays the same
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'START_RECORDING') {
    isRecording  = true
    transcript   = []
    participants = new Set()
    startCapturing()
    sendResponse({ status: 'recording' })
  }

  if (msg.action === 'STOP_RECORDING') {
    isRecording = false
    stopCapturing()
    sendResponse({ status: 'stopped' })
  }

  if (msg.action === 'INJECT_TRANSCRIPT') {
    const lines = msg.text.split('\n').filter(l => l.trim())
    lines.forEach(line => {
      const colonIdx = line.indexOf(':')
      if (colonIdx > -1) {
        transcript.push({
          speaker: line.substring(0, colonIdx).trim(),
          text:    line.substring(colonIdx + 1).trim(),
          time:    new Date().toLocaleTimeString()
        })
        participants.add(line.substring(0, colonIdx).trim())
      } else {
        transcript.push({ speaker: 'Participant', text: line.trim(), time: '' })
      }
    })
    sendResponse({ lineCount: transcript.length })
  }

  if (msg.action === 'GET_DATA') {
    const transcriptText = transcript
      .map(t => `${t.speaker}: ${t.text}`)
      .join('\n')
    sendResponse({
      transcript:   transcriptText,
      participants: [...participants],
      lineCount:    transcript.length
    })
  }

  if (msg.action === 'GET_STATUS') {
    sendResponse({
      isRecording,
      lineCount:    transcript.length,
      participants: [...participants]
    })
  }

  return true
})