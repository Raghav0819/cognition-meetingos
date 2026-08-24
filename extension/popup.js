const BACKEND = 'https://cognition-meetingos.onrender.com'
const WEB_APP = 'https://cognition-meetingos.vercel.app'

// Firebase ID tokens expire after ~1 hour. The web app refreshes it
// continuously while open, so a token older than this means the web app
// tab probably isn't open/logged in anymore.
const TOKEN_STALE_MS = 55 * 60 * 1000

let isRecording = false
let authToken   = null

const dot           = document.getElementById('dot')
const statusText    = document.getElementById('statusText')
const lineCount     = document.getElementById('lineCount')
const partCount     = document.getElementById('partCount')
const btnRecord     = document.getElementById('btnRecord')
const btnStop       = document.getElementById('btnStop')
const btnSend       = document.getElementById('btnSend')
const msgBox        = document.getElementById('message')
const partList      = document.getElementById('participantList')
const titleInput    = document.getElementById('meetingTitle')
const deptInput     = document.getElementById('department')
const authLabel     = document.getElementById('authLabel')

function refreshAuthStatus() {
  chrome.storage.local.get(['authToken', 'authEmail', 'authTs'], result => {
    const fresh = result.authTs && (Date.now() - result.authTs) < TOKEN_STALE_MS
    if (result.authToken && fresh) {
      authToken = result.authToken
      authLabel.textContent = `✓ Signed in as ${result.authEmail}`
      authLabel.style.color = '#4ade80'
    } else {
      authToken = null
      authLabel.textContent = result.authToken
        ? '⚠ Session expired — reopen the web app tab to refresh'
        : '⚠ Not signed in — open the web app and log in'
      authLabel.style.color = '#f87171'
    }
  })
}

refreshAuthStatus()
// The web app's bridge script relays a fresh token every ~15s while open;
// poll storage so the popup picks it up without needing to be reopened.
setInterval(refreshAuthStatus, 5000)

function showMessage(text, type = '') {
  msgBox.textContent = text
  msgBox.className   = `message show ${type}`
}

function updateStats() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) return
    chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_STATUS' }, res => {
      if (!res) return
      lineCount.textContent = res.lineCount || 0
      partCount.textContent = (res.participants || []).length

      if (res.participants?.length > 0) {
        partList.innerHTML = res.participants
          .map(p => `<span>${p}</span>`)
          .join('')
      }
    })
  })
}

// Poll stats every 3 seconds while recording
let pollInterval = null

btnRecord.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) return showMessage('No active tab found', 'error')

    chrome.tabs.sendMessage(tabs[0].id, { action: 'START_RECORDING' }, () => {
      if (chrome.runtime.lastError) {
        return showMessage('Make sure you are on Google Meet', 'error')
      }
      isRecording = true
      dot.classList.add('active')
      statusText.textContent = 'Recording...'
      btnRecord.style.display = 'none'
      btnStop.style.display   = 'block'
      btnSend.disabled        = true
      showMessage('Recording started — speak naturally in the meeting')
      pollInterval = setInterval(updateStats, 3000)
    })
  })
})

btnStop.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) return

    chrome.tabs.sendMessage(tabs[0].id, { action: 'STOP_RECORDING' }, () => {
      isRecording = false
      clearInterval(pollInterval)
      dot.classList.remove('active')
      statusText.textContent  = 'Recording stopped'
      btnStop.style.display   = 'none'
      btnRecord.style.display = 'block'
      btnSend.disabled        = false
      updateStats()
      showMessage('Recording stopped. Review and send to AI agents.')
    })
  })
})



btnSend.addEventListener('click', () => {
  const title = titleInput.value.trim() || 'Google Meet Recording'
  const dept  = deptInput.value.trim()  || 'General'

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) return

    chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_DATA' }, async res => {
      if (!res || !res.transcript) {
        return showMessage('No transcript captured yet', 'error')
      }

      // Build participants list for API
      const participants = (res.participants || []).map(name => ({
        name,
        role: 'employee'
      }))

      // Always ensure at least one participant
      if (participants.length === 0) {
        participants.push({ name: 'Unknown', role: 'employee' })
      }

      if (!authToken) {
        return showMessage(`⚠ Not signed in. Open ${WEB_APP} and log in, then try again.`, 'error')
      }

      showMessage('Sending to CrewAI agents...')
      btnSend.disabled = true

      try {
        const response = await fetch(`${BACKEND}/meetings/upload-transcript`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            title,
            department: dept,
            participants,
            transcript: res.transcript
          })
        })

        const data = await response.json()

        if (response.ok) {
          showMessage(
            `Sent! Meeting ID: ${data.meeting_id}. AI agents are now processing your meeting.`,
            'success'
          )
        } else {
          showMessage(`Error: ${JSON.stringify(data)}`, 'error')
        }
      } catch (err) {
        showMessage(`Cannot reach backend. Check if Render is awake. Error: ${err.message}`, 'error')
      } finally {
        btnSend.disabled = false
      }
    })
  })
})

// Manual transcript toggle
const btnToggleManual  = document.getElementById('btnToggleManual')
const manualSection    = document.getElementById('manualSection')
const btnInject        = document.getElementById('btnInject')
const manualTranscript = document.getElementById('manualTranscript')

btnToggleManual.addEventListener('click', () => {
  const isVisible = manualSection.style.display !== 'none'
  manualSection.style.display = isVisible ? 'none' : 'block'
  btnToggleManual.textContent = isVisible
    ? "Can't capture automatically? Paste manually"
    : 'Hide manual input'
})

btnInject.addEventListener('click', () => {
  const text = manualTranscript.value.trim()
  if (!text) return showMessage('Please paste a transcript first', 'error')

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) return
    chrome.tabs.sendMessage(tabs[0].id, { action: 'INJECT_TRANSCRIPT', text }, res => {
      if (chrome.runtime.lastError) {
        showMessage('Error: refresh the page and try again', 'error')
        return
      }
      updateStats()
      showMessage(`Loaded ${res?.lineCount || 0} lines. Now click Send to AI Agents.`, 'success')
      btnSend.disabled = false
    })
  })
})

// Load initial status
updateStats()