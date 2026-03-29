let isRecording  = false
let transcript   = []
let participants = new Set()
let observer     = null

// Try multiple selector strategies for captions
const CAPTION_SELECTORS = [
  '[jsname="tgaKEf"]',           // caption text
  '[class*="CNusmb"]',           // caption block
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

function startCapturing() {
  observer = new MutationObserver(() => {
    // Capture captions
    const captions = findCaptions()
    captions.forEach(el => {
      const text = el.innerText?.trim()
      if (!text || text.length < 3) return

      const last = transcript[transcript.length - 1]
      if (!last || last.text !== text) {
        transcript.push({
          speaker: 'Participant',
          text,
          time: new Date().toLocaleTimeString()
        })
      }
    })

    // Capture participants
    const names = findNames()
    names.forEach(n => participants.add(n))
  })

  observer.observe(document.body, {
    childList:     true,
    subtree:       true,
    characterData: true,
    attributes:    true
  })

  console.log('[MeetingOS] Recording started')
}

function stopCapturing() {
  if (observer) { observer.disconnect(); observer = null }
  console.log('[MeetingOS] Stopped. Lines:', transcript.length)
}

// Manual transcript injection from popup
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
    // Manual fallback — user pastes transcript directly
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