import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth'
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '../services/firebase'
import { AuthContext } from './auth-context'

// Errores del popup que se resuelven reintentando con redirección (móvil, PWA instalada, bloqueadores)
const REDIRECT_FALLBACK_ERRORS = ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment']

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubProfile = null

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubProfile) unsubProfile()
      unsubProfile = null

      if (!firebaseUser) {
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }

      setUser(firebaseUser)
      const ref = doc(db, 'users', firebaseUser.uid)

      unsubProfile = onSnapshot(
        ref,
        async (snap) => {
          if (snap.exists()) {
            setProfile(snap.data())
          } else {
            const newProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              isAdmin: false,
              createdAt: serverTimestamp(),
            }
            await setDoc(ref, newProfile)
            setProfile(newProfile)
          }
          setLoading(false)
        },
        (err) => {
          console.error('Error cargando el perfil:', err)
          setLoading(false)
        },
      )
    })

    return () => {
      unsubAuth()
      if (unsubProfile) unsubProfile()
    }
  }, [])

  async function loginWithGoogle() {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      if (REDIRECT_FALLBACK_ERRORS.includes(err.code)) return signInWithRedirect(auth, googleProvider)
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return
      throw err
    }
  }

  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
