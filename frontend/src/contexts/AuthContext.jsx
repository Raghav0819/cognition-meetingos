import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, firestore } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        const snap = await getDoc(doc(firestore, 'users', firebaseUser.uid))
        if (snap.exists()) {
          const profile = snap.data()
          setUserProfile(profile)
          localStorage.setItem('user', JSON.stringify(profile))
        }
      } else {
        setUser(null)
        setUserProfile(null)
        localStorage.removeItem('user')
      }
      setLoading(false)
    })
  }, [])

  const logout = async () => {
    await signOut(auth)
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
