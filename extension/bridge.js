// Runs on the Cognition MeetingOS web app. Relays the Firebase ID token that
// the web app writes to localStorage (see frontend/src/firebase.js) into the
// extension's own storage, so the popup can authenticate backend requests as
// the same signed-in user without needing its own login flow.

const BRIDGE_KEY = 'cognition_ext_bridge'

function relay() {
  let raw
  try {
    raw = localStorage.getItem(BRIDGE_KEY)
  } catch {
    return // localStorage inaccessible (e.g. private mode edge cases)
  }
  if (!raw) return

  let data
  try {
    data = JSON.parse(raw)
  } catch {
    return
  }

  chrome.runtime.sendMessage({ action: 'AUTH_BRIDGE', ...data }).catch(() => {
    // Extension context can be briefly unavailable during reloads — ignore.
  })
}

relay()
setInterval(relay, 15000)
window.addEventListener('storage', relay)
