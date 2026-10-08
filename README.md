# Fantasy Golf ES

Juego de fantasy golf para ligas privadas entre amigos: cada semana eliges 6 golfistas del torneo
del PGA Tour con 100M de presupuesto, nombras a un capitán y sumas puntos en directo con cada birdie.

**Web:** https://fantasygolf-f6016.web.app (se puede instalar en el móvil como app)

## Cómo funciona

- **Web** (React + Vite + Tailwind, en Firebase Hosting): login con Google, equipos, ligas y clasificaciones.
- **Base de datos** (Firestore): las reglas de [firestore.rules](firestore.rules) validan en el servidor el
  presupuesto, el cierre de equipos en la primera salida y la privacidad de los equipos hasta entonces.
- **Motor** ([scripts/engine.mjs](scripts/engine.mjs)): GitHub Actions lo ejecuta cada 15 minutos. Lee ESPN,
  pone precio a los inscritos según el ranking mundial (OWGR), calcula los puntos, publica los equipos al
  empezar el torneo y actualiza la clasificación de la temporada al terminar.
- **Código compartido** ([src/lib/](src/lib/)): lector de ESPN, precios y reglas de puntuación, usado por la web y el motor.

## Puntuación

| | Puntos |
|---|---|
| Albatros / Eagle / Birdie / Par | +8 / +5 / +3 / +1 |
| Bogey / Doble bogey o peor | −1 / −2 |
| Pasa el corte / No lo pasa o se retira | +5 / −10 |
| Posición (1º … top 30) | +30 … +3 |
| Capitán | ×1,5 |

## Desarrollo

```bash
npm install
npm run dev          # web contra el proyecto real (necesita .env, ver .env.example)
npm run emulators    # emuladores locales de Firebase (necesita Java 21)
npm run dev:emu      # web contra los emuladores
npm run sync:emu     # ejecutar el motor contra los emuladores
npm test             # pruebas de reglas y del motor (emulador)
npm run lint
```

## Publicación

- Web y reglas: `npm run build && npx firebase deploy --only hosting,firestore`
- Motor: necesita el secreto `FIREBASE_SERVICE_ACCOUNT` en GitHub (Settings → Secrets and variables → Actions)
  con el JSON de la cuenta de servicio de Firebase. Se puede lanzar a mano en Actions → Sincronizar ESPN.
