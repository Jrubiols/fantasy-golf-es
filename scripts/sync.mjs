// Ejecuta una sincronización: node scripts/sync.mjs
// Credenciales: la variable FIREBASE_SERVICE_ACCOUNT con el JSON de la cuenta de servicio
// (secreto de GitHub). Con --emulator (o FIRESTORE_EMULATOR_HOST) se usa el emulador local y no hacen falta.
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { sync } from './engine.mjs'

if (process.argv.includes('--emulator')) process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'

function credentials() {
  if (process.env.FIRESTORE_EMULATOR_HOST) return { projectId: process.env.GCLOUD_PROJECT ?? 'demo-fantasy-golf' }
  const json = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!json) throw new Error('Falta FIREBASE_SERVICE_ACCOUNT (o FIRESTORE_EMULATOR_HOST para el emulador)')
  const account = JSON.parse(json)
  return { credential: cert(account), projectId: account.project_id }
}

const db = getFirestore(initializeApp(credentials()))
db.settings({ ignoreUndefinedProperties: true })

try {
  await sync(db)
} catch (err) {
  console.error('La sincronización ha fallado:', err)
  process.exitCode = 1
}
