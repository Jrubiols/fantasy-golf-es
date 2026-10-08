/* global importScripts, firebase */
// Recibe los avisos (Firebase Cloud Messaging) con la app cerrada y los muestra.
// La web lo registra pasándole su configuración de Firebase en la URL (ver src/services/notifications.js).
// Los avisos llevan su propio título, texto y enlace, que el SDK muestra y abre al pulsar.
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js')

const config = JSON.parse(new URL(self.location.href).searchParams.get('config') || '{}')
if (config.apiKey) {
  firebase.initializeApp(config)
  firebase.messaging()
}
