// Avisos al móvil (Firebase Cloud Messaging) que envía el motor.
// Cada usuario guarda los tokens de sus dispositivos en users/{uid}/tokens/{token}.

export const APP_URL = process.env.APP_URL ?? 'https://fantasygolf-f6016.web.app'
export const DEADLINE_WARNING_MS = 3 * 60 * 60 * 1000

const MULTICAST_LIMIT = 500
// Tokens que ya no sirven (app desinstalada, permiso retirado): se borran
const DEAD_TOKEN_ERRORS = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument'])

const madrid = new Intl.DateTimeFormat('es-ES', { weekday: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })
export const formatMadrid = (date) => madrid.format(date)

/** Tokens por usuario. Sin `uids`, los de todos los usuarios. */
async function tokensByUser(db, uids) {
  const snaps = uids
    ? await Promise.all(uids.map((uid) => db.collection('users').doc(uid).collection('tokens').get()))
    : [await db.collectionGroup('tokens').get()]
  const byUser = new Map()
  for (const snap of snaps) {
    for (const doc of snap.docs) {
      const uid = doc.ref.parent.parent.id
      byUser.set(uid, [...(byUser.get(uid) ?? []), doc])
    }
  }
  return byUser
}

/**
 * Envía un aviso. `messages` es una función uid → { title, body, path } (o null para no avisar a ese usuario).
 * Devuelve cuántos dispositivos lo recibieron.
 */
export async function notify(db, messenger, { uids, exclude = new Set(), messages }) {
  if (!messenger) return 0
  const byUser = await tokensByUser(db, uids)
  let delivered = 0
  for (const [uid, docs] of byUser) {
    if (exclude.has(uid)) continue
    const message = messages(uid)
    if (!message) continue
    for (let i = 0; i < docs.length; i += MULTICAST_LIMIT) {
      const chunk = docs.slice(i, i + MULTICAST_LIMIT)
      const res = await messenger.sendEachForMulticast({
        tokens: chunk.map((d) => d.id),
        notification: { title: message.title, body: message.body },
        webpush: { fcmOptions: { link: `${APP_URL}${message.path ?? '/'}` }, notification: { icon: `${APP_URL}/pwa-192x192.png` } },
      })
      delivered += res.successCount
      await Promise.all(res.responses.map((r, j) => (!r.success && DEAD_TOKEN_ERRORS.has(r.error?.code) ? chunk[j].ref.delete() : null)))
    }
  }
  return delivered
}
