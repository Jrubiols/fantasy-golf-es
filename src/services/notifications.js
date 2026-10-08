// Avisos en el móvil con Firebase Cloud Messaging.
// Cada dispositivo que activa los avisos guarda su token en users/{uid}/tokens/{token};
// el motor (scripts/engine.mjs) los usa para avisar del cierre y del resultado de cada torneo.
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { app, db, firebaseConfig } from './firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY
const TOKEN_KEY = 'fg-push-token'
const SCOPE = '/firebase-cloud-messaging-push-scope'

/** ¿Puede este navegador recibir avisos? En iPhone solo con la app añadida a la pantalla de inicio. */
export async function pushAvailable() {
  if (!VAPID_KEY || import.meta.env.VITE_USE_EMULATORS === 'true') return false
  try {
    return (await isSupported()) && 'Notification' in window && 'serviceWorker' in navigator
  } catch {
    return false
  }
}

export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

function storedToken() {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

/** Avisos activos en este dispositivo: permiso concedido y token guardado. */
export function pushEnabled() {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted' && Boolean(storedToken())
}

async function registration() {
  const url = `/firebase-messaging-sw.js?config=${encodeURIComponent(JSON.stringify(firebaseConfig))}`
  return navigator.serviceWorker.register(url, { scope: SCOPE })
}

/** Pide permiso, obtiene el token de este dispositivo y lo guarda. Devuelve true si quedó activado. */
export async function enablePush(uid) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false
  const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: await registration() })
  if (!token) return false
  await setDoc(doc(db, 'users', uid, 'tokens', token), { createdAt: serverTimestamp(), userAgent: navigator.userAgent.slice(0, 200) })
  try { localStorage.setItem(TOKEN_KEY, token) } catch { /* sin almacenamiento: se pedirá de nuevo */ }
  return true
}

export async function disablePush(uid) {
  const token = storedToken()
  if (token) await deleteDoc(doc(db, 'users', uid, 'tokens', token)).catch(() => {})
  try { localStorage.removeItem(TOKEN_KEY) } catch { /* nada que borrar */ }
}

/** Con la app abierta, el aviso no sale solo: se muestra igualmente como notificación. */
export async function listenForeground() {
  if (!(await pushAvailable()) || !pushEnabled()) return () => {}
  return onMessage(getMessaging(app), async (payload) => {
    const reg = await navigator.serviceWorker.getRegistration(SCOPE)
    const { title, body } = payload.notification ?? {}
    if (reg && title) reg.showNotification(title, { body, icon: '/pwa-192x192.png', data: { link: payload.fcmOptions?.link } })
  })
}
