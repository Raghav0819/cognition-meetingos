const BACKEND = 'https://cognition-meetingos.onrender.com'

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
const companyInput  = document.getElementById('companyId')
const companyLabel  = document.getElementById('companyLabel')

// Load saved company ID from chrome storage
chrome.storage.local.get(['companyId'], result => {
  if (result.companyId) {
    companyInput.value = result.companyId
    companyLabel.textContent = '✓ Company ID'
    companyLabel.style.color = '#4ade80'
  }
})

// Save company ID whenever it changes
companyInput.addEventListener('change', () => {
  const val = companyInput.value.trim()
  chrome.storage.local.set({ companyId: val })
  if (val) {
    companyLabel.textContent = '✓ Company ID saved'
    companyLabel.style.color = '#4ade80'
  } else {
    companyLabel.textContent = '⚠ Company ID (paste from PM Dashboard)'
    companyLabel.style.color = '#f87171'
  }
})

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

      const companyId = companyInput.value.trim()
      if (!companyId) {
        return showMessage('⚠ Please enter your Company ID first (copy from PM Dashboard)', 'error')
      }

      showMessage('Sending to CrewAI agents...')
      btnSend.disabled = true

      try {
        const response = await fetch(`${BACKEND}/meetings/upload-transcript`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Company-ID': companyId,
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