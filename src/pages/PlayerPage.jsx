import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'
import { fetchPlayerOverview, parsePlayerOverview } from '../lib/espn'
import { HOLE_POINTS } from '../lib/scoring'
import { formatDateRange, formatPrice, formatToPar, sizedPhoto } from '../utils/format'
import EmptyState from '../components/ui/EmptyState'
import Icon from '../components/ui/Icon'
import Points from '../components/ui/Points'
import Skeleton from '../components/ui/Skeleton'

const HOLE_STATS = [
  ['eagles', 'Eagles'], ['birdies', 'Birdies'], ['pars', 'Pares'], ['bogeys', 'Bogeys'], ['doubles', 'Dobles+'],
]

// Golpes de un hoyo con la notación de las tarjetas: círculo birdie, doble círculo eagle, cuadrado bogey
function Strokes({ value, par }) {
  if (value == null) return <span className="text-faint">·</span>
  const diff = par ? value - par : 0
  const base = 'inline-flex size-[1.65rem] items-center justify-center text-sm font-semibold'
  if (diff <= -2) return <span className={`${base} rounded-full bg-pine text-white outline-[1.5px] outline-offset-[1.5px] outline-pine outline`}>{value}</span>
  if (diff === -1) return <span className={`${base} rounded-full border-[1.5px] border-pine text-pine`}>{value}</span>
  if (diff === 1) return <span className={`${base} border-[1.5px] border-over text-over`}>{value}</span>
  if (diff >= 2) return <span className={`${base} bg-over text-white`}>{value}</span>
  return <span className={`${base} text-ink`}>{value}</span>
}

function NineHoles({ label, start, strokes, holePars }) {
  const holes = Array.from({ length: 9 }, (_, i) => start + i)
  const total = holes.reduce((s, h) => s + (strokes[h - 1] ?? 0), 0)
  const played = holes.some((h) => strokes[h - 1] != null)
  return (
    <div className="grid grid-cols-[3.4rem_repeat(9,minmax(0,1fr))_2.4rem] items-center text-center">
      <span className="label text-left">{label}</span>
      {holes.map((h) => <span key={h} className="text-[0.68rem] text-faint">{h}</span>)}
      <span />
      <span className="text-left text-[0.68rem] text-muted">Par</span>
      {holes.map((h) => <span key={h} className="text-xs text-muted">{holePars?.[h] ?? ''}</span>)}
      <span className="text-xs text-muted">{holes.reduce((s, h) => s + (holePars?.[h] ?? 0), 0) || ''}</span>
      <span />
      {holes.map((h) => <span key={h} className="py-1"><Strokes value={strokes[h - 1]} par={holePars?.[h]} /></span>)}
      <span className="score text-lg text-pine">{played ? total : ''}</span>
    </div>
  )
}

export default function PlayerPage() {
  const { tournamentId, playerId } = useParams()
  const navigate = useNavigate()
  const [player, setPlayer] = useState(undefined)
  const [tournament, setTournament] = useState(null)
  const [form, setForm] = useState(null)

  useEffect(() => onSnapshot(doc(db, 'tournaments', tournamentId, 'players', playerId), (s) => setPlayer(s.exists() ? s.data() : null), () => setPlayer(null)), [tournamentId, playerId])
  useEffect(() => { getDoc(doc(db, 'tournaments', tournamentId)).then((s) => setTournament(s.data() ?? null)).catch(() => {}) }, [tournamentId])
  useEffect(() => {
    if (!tournament) return
    fetchPlayerOverview(playerId, tournament.tour).then((o) => setForm(parsePlayerOverview(o))).catch(() => setForm({ recent: [], season: null }))
  }, [playerId, tournament])

  if (player === undefined) return <div className="mx-auto max-w-2xl px-4 pt-4"><Skeleton className="h-80 rounded-[1.8rem]" /><Skeleton className="mt-4 h-40" /></div>
  if (!player) return <div className="mx-auto max-w-2xl px-4 pt-6"><div className="card"><EmptyState title="No encontramos a este jugador en el torneo." /></div></div>

  const started = tournament && tournament.status !== 'scheduled'
  const breakdown = player.pointsBreakdown ?? {}
  const recent = form?.recent.filter((r) => r.id !== tournamentId && r.finished).slice(0, 5) ?? []
  const s = form?.season

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4">
      <button onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-pine"><Icon name="back" className="size-4" />Volver</button>

      {/* Cabecera: foto recortada, posición y resultado */}
      <section className="relative h-80 animate-fade-up overflow-hidden rounded-[1.8rem] bg-pine text-white">
        <div className="halftone absolute inset-0" />
        <div className="absolute -right-14 -bottom-24 size-80 rounded-full bg-pine-light" />
        {player.photoURL && <img src={sizedPhoto(player.photoURL, 700)} alt={player.name} className="absolute right-[-12%] bottom-0 w-[78%] max-w-sm" />}
        <div className="relative px-6 pt-6">
          <p className="text-xs font-semibold tracking-[0.16em] text-mint uppercase">{player.country}{player.owgr ? ` · OWGR #${player.owgr}` : ''}</p>
          <h1 className="mt-2 max-w-[60%] font-display text-[3.2rem] leading-[0.86] font-black uppercase">{player.name}</h1>
          <p className="mt-3 inline-flex h-8 items-center rounded-full bg-white/12 px-3 font-display text-lg font-extrabold">{formatPrice(player.price)}</p>
        </div>
        {started && (
          <div className="glass absolute bottom-4 left-4 flex gap-5 px-4 py-2.5">
            <div>
              <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-white/80 uppercase">Puesto</p>
              <p className="score text-[2.2rem]">{player.positionDisplay}</p>
            </div>
            <div>
              <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-white/80 uppercase">Total</p>
              <p className="score text-[2.2rem]">{formatToPar(player.toPar)}</p>
            </div>
            {player.status === 'active' && player.thru > 0 && player.thru < 18 && (
              <div>
                <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-white/80 uppercase">Hoyo</p>
                <p className="score text-[2.2rem]">{player.thru}</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Puntos de fantasy y su desglose */}
      {started && (
        <section className="card mt-4 animate-fade-up p-5 [animation-delay:80ms]">
          <div className="flex items-end justify-between">
            <div>
              <p className="label">Puntos en {tournament.shortName ?? tournament.name}</p>
              <Points value={player.points ?? 0} className="mt-1 block text-[3.2rem]" />
            </div>
            <div className="flex gap-3 text-right text-xs text-muted">
              <span>Hoyos<br /><strong className="score text-xl text-pine">{breakdown.holes ?? 0}</strong></span>
              <span>Posición<br /><strong className="score text-xl text-pine">{breakdown.position ?? 0}</strong></span>
              <span>Corte<br /><strong className={`score text-xl ${breakdown.cut < 0 ? 'text-over' : 'text-pine'}`}>{breakdown.cut ?? 0}</strong></span>
              <span>Bonus<br /><strong className="score text-xl text-pine">{breakdown.bonus ?? 0}</strong></span>
            </div>
          </div>
          {breakdown.bonus > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {breakdown.bonusDetail.streaks > 0 && <span className="rounded-full bg-mint/40 px-2.5 py-1 text-xs font-semibold text-pine-dark">🔥 Racha de birdies ×{breakdown.bonusDetail.streaks}</span>}
              {breakdown.bonusDetail.bogeyFree > 0 && <span className="rounded-full bg-mint/40 px-2.5 py-1 text-xs font-semibold text-pine-dark">✨ Ronda sin bogeys ×{breakdown.bonusDetail.bogeyFree}</span>}
              {breakdown.bonusDetail.holesInOne > 0 && <span className="rounded-full bg-gold/30 px-2.5 py-1 text-xs font-semibold text-[#5c4508]">⛳ Hoyo en uno ×{breakdown.bonusDetail.holesInOne}</span>}
              {breakdown.bonusDetail.allUnderPar && <span className="rounded-full bg-mint/40 px-2.5 py-1 text-xs font-semibold text-pine-dark">📉 Todas bajo par</span>}
            </div>
          )}
          {player.holes && (
            <div className="mt-4 grid grid-cols-5 gap-2">
              {HOLE_STATS.map(([key, label]) => (
                <div key={key} className="rounded-2xl bg-bg py-2.5 text-center">
                  <p className="score text-2xl text-pine">{player.holes[key] ?? 0}</p>
                  <p className="mt-0.5 text-[0.62rem] text-muted">{label}</p>
                  <p className={`text-[0.62rem] font-semibold ${HOLE_POINTS[key] < 0 ? 'text-over' : 'text-under'}`}>{HOLE_POINTS[key] > 0 ? '+' : ''}{HOLE_POINTS[key]} c/u</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tarjeta hoyo a hoyo */}
      {player.scorecard?.length > 0 && (
        <section className="card mt-4 animate-fade-up p-5 [animation-delay:140ms]">
          <h2 className="headline text-[1.6rem]">Tarjeta</h2>
          <p className="mb-3 text-xs text-muted">○ birdie · ◎ eagle · □ bogey · ■ doble o peor</p>
          <div className="flex flex-col gap-5">
            {player.scorecard.map((r) => (
              <div key={r.round}>
                <p className="mb-1.5 font-display text-lg font-extrabold text-pine uppercase">Ronda {r.round} · {r.strokes.reduce((a, b) => a + (b ?? 0), 0)} golpes</p>
                <div className="flex flex-col gap-2">
                  <NineHoles label="Ida" start={1} strokes={r.strokes} holePars={tournament?.holePars} />
                  <NineHoles label="Vuelta" start={10} strokes={r.strokes} holePars={tournament?.holePars} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Forma reciente y temporada (ESPN) */}
      <section className="card mt-4 animate-fade-up p-5 [animation-delay:200ms]">
        <h2 className="headline text-[1.6rem]">Forma reciente</h2>
        {!form ? (
          <Skeleton className="mt-3 h-12" count={3} />
        ) : !recent.length ? (
          <p className="mt-2 text-sm text-muted">Sin torneos recientes en el circuito.</p>
        ) : (
          <>
            <div className="mt-3 flex gap-2">
              {recent.map((r) => {
                const pos = parseInt(String(r.position).replace('T', ''), 10)
                const tone = pos <= 10 ? 'bg-pine text-white' : pos <= 30 ? 'bg-pine-light/15 text-pine' : Number.isNaN(pos) ? 'bg-over/10 text-over' : 'bg-track text-muted'
                return <span key={r.id} className={`flex h-12 flex-1 items-center justify-center rounded-2xl score text-xl ${tone}`} title={r.name}>{r.position}</span>
              })}
            </div>
            <ul className="mt-3">
              {recent.map((r) => (
                <li key={r.id} className="row py-2.5 text-sm">
                  <span className="w-12 score text-lg text-pine">{r.position}</span>
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  <span className="text-xs text-muted">{formatDateRange(r.date)}</span>
                  <span className="w-10 text-right text-muted">{r.score}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {s && (
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[['Torneos', s.events], ['Cortes', s.cuts], ['Top 10', s.top10], ['Victorias', s.wins]].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-bg py-2.5 text-center">
                <p className="score text-2xl text-pine">{value ?? '–'}</p>
                <p className="mt-0.5 text-[0.62rem] text-muted">{label}</p>
              </div>
            ))}
          </div>
        )}
        {s?.average && <p className="mt-3 text-xs text-muted">Media de golpes por vuelta esta temporada: <strong className="text-pine">{s.average}</strong>{s.earnings && s.earnings !== '--' ? ` · ganancias ${s.earnings}` : ''}</p>}
      </section>
    </div>
  )
}
