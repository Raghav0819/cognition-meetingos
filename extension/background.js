// Receives the Firebase ID token relayed by bridge.js (running on the web
// app) and stores it so popup.js can read it when the user opens the
// extension. This is the only role of the service worker.

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.action === 'AUTH_BRIDGE') {
    chrome.storage.local.set({
      authToken: msg.token,
      authUid:   msg.uid,
      authEmail: msg.email,
      authTs:    msg.ts,
    })
  }
})
