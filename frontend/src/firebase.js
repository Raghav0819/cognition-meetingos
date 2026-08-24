import { initializeApp } from 'firebase/app'
import { getAuth, onIdTokenChanged } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth      = getAuth(app)
export const firestore = getFirestore(app)

// ─── Chrome extension auth bridge ──────────────────────────────────────────
// The Cognition MeetingOS extension has no login of its own — it reads the
// current Firebase ID token out of localStorage (via a content script) so it
// can call the backend as the same signed-in user. Kept fresh automatically
// since onIdTokenChanged also fires on token refresh, not just sign-in/out.
const EXT_BRIDGE_KEY = 'cognition_ext_bridge'

onIdTokenChanged(auth, async (user) => {
  if (!user) {
    localStorage.removeItem(EXT_BRIDGE_KEY)
    return
  }
  try {
    const token = await user.getIdToken()
    localStorage.setItem(EXT_BRIDGE_KEY, JSON.stringify({
      token,
      uid: user.uid,
      email: user.email,
      ts: Date.now(),
    }))
  } catch {
    // Non-fatal — the extension will just show as signed out.
  }
})
