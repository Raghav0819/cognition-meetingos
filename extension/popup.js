const BACKEND = 'http://localhost:8000'

let isRecording = false

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

    chrome.tabs.sendMessage(tabs[0].id, { action: 'START_RECORDING' }, res => {
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

    chrome.tabs.sendMessage(tabs[0].id, { action: 'STOP_RECORDING' }, res => {
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

      showMessage('Sending to CrewAI agents...')
      btnSend.disabled = true

      // ===== DEBUG: See exact JSON being sent =====
     const debugPayload = {
       title,
       department: dept,
       participants,
       transcript: res.transcript
     }
     console.log('=== PAYLOAD SENT TO CREWAI ===')
     console.log(JSON.stringify(debugPayload, null, 2))
     console.log('Participant count:', participants.length)
     console.log('Transcript lines:', res.transcript.split('\n').length)
     console.log('==============================')
// ============================================

      try {
        const response = await fetch(`${BACKEND}/meetings/upload-transcript`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        showMessage(`Cannot reach backend. Is it running on port 8000? Error: ${err.message}`, 'error')
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