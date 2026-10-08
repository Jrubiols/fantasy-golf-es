// Imagen del resumen semanal de una liga (1080x1350) para compartir por WhatsApp o redes.
// Se dibuja en un canvas con las tipografías de la app; las fotos de ESPN permiten CORS.
import { clubColor } from './clubs.js'
import { sizedPhoto } from '../utils/format.js'

const W = 1080
const H = 1350
const PINE = '#0a4a24'
const MINT = '#8efc92'
const DISPLAY = '"Big Shoulders Display", "Arial Narrow", sans-serif'
const SANS = 'Geist, system-ui, sans-serif'

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Texto que se encoge hasta caber en `maxWidth`. */
function fitText(ctx, text, maxWidth, size, weight, family) {
  let s = size
  do {
    ctx.font = `${weight} ${s}px ${family}`
    s -= 2
  } while (ctx.measureText(text).width > maxWidth && s > 12)
}

function halftone(ctx, cx, cy, radius) {
  for (let x = 0; x < W; x += 22) {
    for (let y = 0; y < H; y += 22) {
      const d = Math.hypot(x - cx, y - cy) / radius
      if (d >= 1) continue
      ctx.fillStyle = `rgba(255,255,255,${0.14 * (1 - d)})`
      ctx.beginPath()
      ctx.arc(x, y, 3.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/**
 * league: { name, code } · tournament: { name, status, round } · rows: clasificación [{ displayName, color, uid, points, rank }]
 * mvp: { name, points, photoURL } (el golfista que más ha sumado en la liga) · url: enlace de invitación
 */
export async function drawLeagueSummary({ league, tournament, rows, mvp, url }) {
  await Promise.all([
    document.fonts.load(`900 120px ${DISPLAY}`),
    document.fonts.load(`800 60px ${DISPLAY}`),
    document.fonts.load(`600 40px ${SANS}`),
  ]).catch(() => {})
  const photo = await loadImage(mvp?.photoURL ? sizedPhoto(mvp.photoURL, 700) : null)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Fondo verde con trama de puntos y círculos de green
  ctx.fillStyle = PINE
  ctx.fillRect(0, 0, W, H)
  halftone(ctx, W * 0.9, 120, 760)
  ctx.fillStyle = '#0f5c2f'
  ctx.beginPath(); ctx.arc(980, 1260, 380, 0, Math.PI * 2); ctx.fill()

  // Cabecera
  ctx.fillStyle = '#ffffff'
  ctx.font = `900 46px ${DISPLAY}`
  ctx.fillText('FANTASY GOLF', 72, 110)
  const markWidth = ctx.measureText('FANTASY GOLF').width
  roundRect(ctx, 72 + markWidth + 14, 74, 62, 44, 22)
  ctx.fillStyle = MINT; ctx.fill()
  ctx.fillStyle = PINE; ctx.font = `800 26px ${DISPLAY}`
  ctx.fillText('ES', 72 + markWidth + 29, 106)

  const state = tournament.status === 'final' ? 'RESULTADO FINAL' : `EN DIRECTO · RONDA ${tournament.round ?? 1}`
  ctx.fillStyle = MINT
  ctx.font = `600 28px ${SANS}`
  ctx.fillText(`${tournament.name.toUpperCase()} · ${state}`.slice(0, 60), 72, 178)

  ctx.fillStyle = '#ffffff'
  fitText(ctx, league.name.toUpperCase(), W - 144, 150, 900, DISPLAY)
  ctx.fillText(league.name.toUpperCase(), 68, 345)

  // Clasificación: tarjetas de club (hasta 5)
  const top = rows.filter((r) => r.points != null).slice(0, 5)
  let y = 400
  top.forEach((r, i) => {
    const c = clubColor(r.color, r.uid)
    const h = i === 0 ? 150 : 104
    roundRect(ctx, 56, y, W - 112, h, 34)
    ctx.fillStyle = c.bg; ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.stroke()

    // Puesto en círculo blanco
    const rr = i === 0 ? 52 : 38
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.arc(56 + 26 + rr, y + h / 2, rr, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = c.bg
    ctx.font = `900 ${i === 0 ? 64 : 48}px ${DISPLAY}`
    ctx.textAlign = 'center'
    ctx.fillText(String(r.rank), 56 + 26 + rr - 6, y + h / 2 + (i === 0 ? 22 : 17))
    ctx.font = `900 ${i === 0 ? 28 : 22}px ${DISPLAY}`
    ctx.fillText('º', 56 + 26 + rr + (i === 0 ? 20 : 15), y + h / 2 - (i === 0 ? 8 : 6))
    ctx.textAlign = 'left'

    ctx.fillStyle = '#ffffff'
    fitText(ctx, r.displayName, 520, i === 0 ? 50 : 38, 600, SANS)
    ctx.fillText(r.displayName, 56 + 52 + rr * 2, y + h / 2 + (r.clubName ? -2 : 14))
    if (r.clubName) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.font = `500 ${i === 0 ? 28 : 24}px ${SANS}`
      ctx.fillText(r.clubName, 56 + 52 + rr * 2, y + h / 2 + (i === 0 ? 40 : 32))
    }

    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'right'
    ctx.font = `900 ${i === 0 ? 92 : 66}px ${DISPLAY}`
    ctx.fillText(String(r.points), W - 92, y + h / 2 + (i === 0 ? 32 : 23))
    ctx.textAlign = 'left'
    y += h + 18
  })

  // MVP: el golfista que más ha sumado en la liga, recortado abajo a la derecha
  if (mvp) {
    if (photo) {
      const pw = 560
      const ph = (photo.height / photo.width) * pw
      ctx.drawImage(photo, W - pw + 40, H - ph, pw, ph)
    }
    ctx.fillStyle = MINT
    ctx.font = `600 26px ${SANS}`
    ctx.fillText('MVP DE LA LIGA', 72, H - 275)
    ctx.fillStyle = '#ffffff'
    fitText(ctx, mvp.name.toUpperCase(), 520, 78, 900, DISPLAY)
    ctx.fillText(mvp.name.toUpperCase(), 70, H - 200)
    ctx.font = `800 44px ${DISPLAY}`
    ctx.fillText(`${mvp.points} PUNTOS`, 72, H - 145)
  }

  // Pie: invitación
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = `600 26px ${SANS}`
  ctx.fillText(`Únete con el código ${league.code}`, 72, H - 70)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = `500 22px ${SANS}`
  fitText(ctx, url.replace(/^https?:\/\//, ''), 500, 22, 500, SANS)
  ctx.fillText(url.replace(/^https?:\/\//, ''), 72, H - 38)

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

/** Comparte la imagen (móvil) o la descarga (ordenador). */
export async function shareImage(blob, { filename, text }) {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text })
      return 'shared'
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled'
    }
  }
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 5000)
  return 'downloaded'
}
