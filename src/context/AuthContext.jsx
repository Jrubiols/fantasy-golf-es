import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '../services/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubProfile = null

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubProfile) unsubProfile()

      if (firebaseUser) {
        setUser(firebaseUser)
        const ref = doc(db, 'users', firebaseUser.uid)

        unsubProfile = onSnapshot(ref, async (snap) => {
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
        })
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      unsubAuth()
      if (unsubProfile) unsubProfile()
    }
  }, [])

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider)
  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
