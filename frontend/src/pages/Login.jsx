import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp
} from 'firebase/firestore'
import { auth, firestore } from '../firebase'

const ROLE_ROUTES = { pm: '/pm', employee: '/employee', manager: '/manager' }

const ROLES = [
  { value: 'pm',       label: 'PM / Admin', color: 'bg-purple-600' },
  { value: 'employee', label: 'Employee',   color: 'bg-blue-600'   },
  { value: 'manager',  label: 'Manager',    color: 'bg-green-600'  },
]

function friendlyError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':  return 'Invalid email or password.'
    case 'auth/email-already-in-use': return 'Email already registered. Sign in instead.'
    case 'auth/weak-password':        return 'Password must be at least 6 characters.'
    case 'auth/invalid-email':        return 'Invalid email address.'
    case 'auth/too-many-requests':    return 'Too many attempts. Try again later.'
    default:                          return 'Something went wrong. Try again.'
  }
}

function genInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// ─── Verify Email Screen ──────────────────────────────────────────────────────
function VerifyEmailScreen({ email, onBack }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">📬</div>
        <h2 className="text-2xl font-bold text-white mb-3">Verify your email</h2>
        <p className="text-gray-400 mb-1">We sent a verification link to:</p>
        <p className="text-purple-400 font-semibold text-lg mb-6">{email}</p>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          Click the link in the email to activate your account, then come back and sign in.
          Check your spam folder if you don't see it.
        </p>
        <button
          onClick={onBack}
          className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl font-semibold transition"
        >
          Back to Sign In
        </button>
      </div>
    </div>
  )
}

// ─── Google Role Picker ───────────────────────────────────────────────────────
function GoogleRolePickerScreen({ googleUser, onSelect, loading, error }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          {googleUser.photoURL
            ? <img src={googleUser.photoURL} className="w-16 h-16 rounded-full mx-auto mb-4" alt="" />
            : <div className="text-4xl mb-4">👋</div>}
          <h2 className="text-2xl font-bold text-white">
            Welcome, {googleUser.displayName || 'there'}!
          </h2>
          <p className="text-gray-400 mt-2 text-sm">Select your role to continue</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 flex flex-col gap-3">
          {ROLES.map(r => (
            <button
              key={r.value} onClick={() => onSelect(r.value)} disabled={loading}
              className="w-full py-4 px-5 rounded-xl text-white font-medium flex items-center justify-between hover:opacity-90 transition bg-gray-800 border border-gray-700 hover:border-gray-500 disabled:opacity-50"
            >
              <span>{r.label}</span>
              <span className={`text-xs px-3 py-1 rounded-full text-white ${r.color}`}>{r.value}</span>
            </button>
          ))}
          {error && <p className="text-red-400 text-xs text-center mt-2">{error}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Company Setup Screen ─────────────────────────────────────────────────────
function CompanySetupScreen({ uid, role, onDone }) {
  const [companyName, setCompanyName] = useState('')
  const [inviteCode,  setInviteCode]  = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [createdCode, setCreatedCode] = useState('')  // shown after PM creates company

  const isPM = role === 'pm'

  async function createCompany(e) {
    e.preventDefault()
    if (!companyName.trim()) return setError('Enter your company name.')
    setLoading(true)
    setError('')
    try {
      const code      = genInviteCode()
      const companyId = `co_${Math.random().toString(36).substring(2, 10)}`
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      await setDoc(doc(firestore, 'companies', companyId), {
        name:      companyName.trim(),
        inviteCode: code,
        createdBy: uid,
        createdAt: new Date(),
        expiresAt: expiresAt,
      })
      await updateDoc(doc(firestore, 'users', uid), { companyId, updatedAt: serverTimestamp() })
      const profile = JSON.parse(localStorage.getItem('user') || '{}')
      localStorage.setItem('user', JSON.stringify({ ...profile, companyId }))
      setCreatedCode(code)
      setTimeout(() => onDone(), 3000)
    } catch {
      setError('Failed to create company. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function joinCompany(e) {
    e.preventDefault()
    const code = inviteCode.trim().toUpperCase()
    if (!code) return setError('Enter an invite code.')
    setLoading(true)
    setError('')
    try {
      // Invite code lookup is handled by the backend (Admin SDK) for security.
      // Firestore rules cannot restrict query where() clauses, so client-side
      // querying of the companies collection would expose all company documents.
      const apiUrl = import.meta.env.VITE_API_URL || 'https://cognition-meetingos.onrender.com'
      const token = await auth.currentUser.getIdToken()
      const res = await fetch(`${apiUrl}/companies/lookup?invite_code=${encodeURIComponent(code)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) {
        setError('Invalid invite code. Ask your PM for the correct code.')
        setLoading(false)
        return
      }
      const { companyId } = await res.json()
      await updateDoc(doc(firestore, 'users', uid), { companyId, updatedAt: serverTimestamp() })
      const profile = JSON.parse(localStorage.getItem('user') || '{}')
      localStorage.setItem('user', JSON.stringify({ ...profile, companyId }))
      onDone()
    } catch (err) {
      console.error('Join company failed:', err)
      setError(`Failed to join company: ${err.message || 'Try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  if (createdCode) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-6">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-3">Company created!</h2>
          <p className="text-gray-400 mb-4">Share this invite code with your team:</p>
          <div className="bg-gray-900 border border-purple-700 rounded-2xl px-8 py-6 mb-6 inline-block">
            <p className="text-4xl font-mono font-bold tracking-widest text-purple-300">{createdCode}</p>
          </div>
          <p className="text-gray-500 text-sm">Redirecting you to the dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">{isPM ? '🏢' : '👥'}</div>
          <h2 className="text-2xl font-bold text-white">
            {isPM ? 'Set up your company' : 'Join your company'}
          </h2>
          <p className="text-gray-400 mt-2 text-sm">
            {isPM
              ? 'Create a workspace for your team. You\'ll get an invite code to share.'
              : 'Ask your PM for the invite code to join your team\'s workspace.'}
          </p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <form onSubmit={isPM ? createCompany : joinCompany} className="flex flex-col gap-4">
            {isPM ? (
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Company Name</label>
                <input
                  type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp" required
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm"
                />
              </div>
            ) : (
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Invite Code</label>
                <input
                  type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                  placeholder="e.g. A3B9XZ" maxLength={6} required
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm font-mono tracking-widest uppercase"
                />
              </div>
            )}

            {error && (
              <p className="text-red-400 text-xs bg-red-900/30 border border-red-800 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-sm"
            >
              {loading ? 'Please wait...' : isPM ? 'Create Company' : 'Join Company'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Main Login ───────────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate()

  const [mode,        setMode]        = useState('signin')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [name,        setName]        = useState('')
  const [role,        setRole]        = useState('employee')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)

  const [verifyEmail,     setVerifyEmail]     = useState('')
  const [googleUser,      setGoogleUser]      = useState(null)
  const [companySetupFor, setCompanySetupFor] = useState(null)  // { uid, role }

  function redirectOrSetupCompany(profile, uid) {
    if (!profile.companyId) {
      setCompanySetupFor({ uid, role: profile.role })
    } else {
      navigate(ROLE_ROUTES[profile.role] || '/pm', { replace: true })
    }
  }

  // Redirect already-authenticated users
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return
      const snap = await getDoc(doc(firestore, 'users', u.uid))
      if (snap.exists()) {
        const profile = snap.data()
        localStorage.setItem('user', JSON.stringify(profile))
        redirectOrSetupCompany(profile, u.uid)
      }
    })
    return () => unsub()
  }, [])

  // ── Email Sign Up ────────────────────────────────────────────────────────────
  async function handleSignUp(e) {
    e.preventDefault()
    setError('')
    if (!name.trim())             return setError('Please enter your full name.')
    if (password !== confirmPass) return setError('Passwords do not match.')
    if (password.length < 6)      return setError('Password must be at least 6 characters.')
    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await sendEmailVerification(cred.user)
      await setDoc(doc(firestore, 'users', cred.user.uid), { name: name.trim(), role, email, createdAt: serverTimestamp() })
      await signOut(auth)
      setVerifyEmail(email)
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  // ── Email Sign In ────────────────────────────────────────────────────────────
  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      if (!cred.user.emailVerified) {
        await signOut(auth)
        setError('Email not verified. Check your inbox and click the verification link.')
        return
      }
      const snap = await getDoc(doc(firestore, 'users', cred.user.uid))
      if (!snap.exists()) {
        await signOut(auth)
        setError('Account not found. Please sign up again.')
        return
      }
      const profile = snap.data()
      localStorage.setItem('user', JSON.stringify(profile))
      redirectOrSetupCompany(profile, cred.user.uid)
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  // ── Google Sign In ───────────────────────────────────────────────────────────
  async function handleGoogle() {
    setError('')
    setLoading(true)
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider())
      const snap = await getDoc(doc(firestore, 'users', cred.user.uid))
      if (snap.exists()) {
        const profile = snap.data()
        localStorage.setItem('user', JSON.stringify(profile))
        redirectOrSetupCompany(profile, cred.user.uid)
      } else {
        setGoogleUser(cred.user)
      }
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  // ── Google: save role, then check company ────────────────────────────────────
  async function handleGoogleRoleSelect(selectedRole) {
    setLoading(true)
    try {
      const profile = {
        name:  googleUser.displayName || googleUser.email.split('@')[0],
        role:  selectedRole,
        email: googleUser.email,
        createdAt: serverTimestamp(),
      }
      await setDoc(doc(firestore, 'users', googleUser.uid), profile)
      localStorage.setItem('user', JSON.stringify(profile))
      setGoogleUser(null)
      redirectOrSetupCompany(profile, googleUser.uid)
    } catch {
      setError('Failed to save profile. Try again.')
      setLoading(false)
    }
  }

  // ── Sub-screens ──────────────────────────────────────────────────────────────
  if (verifyEmail) {
    return (
      <VerifyEmailScreen
        email={verifyEmail}
        onBack={() => { setVerifyEmail(''); setMode('signin'); setPassword(''); setConfirmPass('') }}
      />
    )
  }

  if (googleUser) {
    return (
      <GoogleRolePickerScreen
        googleUser={googleUser}
        onSelect={handleGoogleRoleSelect}
        loading={loading}
        error={error}
      />
    )
  }

  if (companySetupFor) {
    return (
      <CompanySetupScreen
        uid={companySetupFor.uid}
        role={companySetupFor.role}
        onDone={() => {
          const profile = JSON.parse(localStorage.getItem('user') || '{}')
          navigate(ROLE_ROUTES[profile.role] || '/pm', { replace: true })
        }}
      />
    )
  }

  // ── Main form ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">Cognition</h1>
          <p className="text-gray-400 text-lg">MeetingOS — AI Execution Platform</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <div className="flex mb-6 bg-gray-800 rounded-xl p-1">
            {[['signin', 'Sign In'], ['signup', 'Sign Up']].map(([m, label]) => (
              <button
                key={m} onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === m ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="flex flex-col gap-4">
            {mode === 'signup' && (
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Full Name</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma" required
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm"
                />
              </div>
            )}

            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm"
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters" required
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm"
              />
            </div>

            {mode === 'signup' && (
              <>
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">Confirm Password</label>
                  <input
                    type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                    placeholder="Re-enter your password" required
                    className={`w-full bg-gray-800 border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none text-sm transition ${
                      confirmPass && password !== confirmPass ? 'border-red-600' :
                      confirmPass && password === confirmPass ? 'border-green-600' :
                      'border-gray-700 focus:border-purple-500'
                    }`}
                  />
                  {confirmPass && password !== confirmPass && (
                    <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                  )}
                </div>

                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">Your Role</label>
                  <div className="flex gap-2">
                    {ROLES.map(r => (
                      <button
                        key={r.value} type="button" onClick={() => setRole(r.value)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold text-white transition border ${
                          role === r.value ? `${r.color} border-transparent` : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="text-red-400 text-xs bg-red-900/30 border border-red-800 rounded-xl px-4 py-3">
                {error}
                {error.includes('not verified') && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const cred = await signInWithEmailAndPassword(auth, email, password)
                        await sendEmailVerification(cred.user)
                        await signOut(auth)
                        setError('')
                        setVerifyEmail(email)
                      } catch { setError('Could not resend. Check your credentials.') }
                    }}
                    className="block mt-2 text-purple-400 underline hover:text-purple-300"
                  >
                    Resend verification email
                  </button>
                )}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-sm"
            >
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-gray-600 text-xs">or</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <button
            onClick={handleGoogle} disabled={loading}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 disabled:opacity-50 text-white rounded-xl transition text-sm font-medium flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  )
}
