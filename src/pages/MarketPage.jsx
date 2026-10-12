import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { arrayUnion, collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from '../hooks/useAuth'
import { useCurrentTournament, useLocked, usePlayers } from '../hooks/useTournament'
import { subscribeLeague } from '../services/firestoreService'
import { BUDGET, TEAM_SIZE } from '../lib/scoring'
import { clubColor } from '../lib/clubs'
import { formatCountdown, formatPrice } from '../utils/format'
import EmptyState from '../components/ui/EmptyState'
import Icon from '../components/ui/Icon'
import PlayerPhoto from '../components/ui/PlayerPhoto'
import Skeleton from '../components/ui/Skeleton'
import TeamList from '../components/ui/TeamList'
import TournamentCard from '../components/ui/TournamentCard'

const half = (n) => Math.round(n * 2) / 2

/** Pujas a ciegas: importe por golfista (mínimo, su precio). Nadie ve las pujas de los demás. */
function Auction({ league, tournament, players, auctionAt, now }) {
  const { user } = useAuth()
  const [saved, setSaved] = useState(undefined)
  const [bids, setBids] = useState({})
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(null)
  const ref = doc(db, 'leagues', league.id, 'bids', `${tournament.id}_${user.uid}`)

  useEffect(() => onSnapshot(ref, (s) => {
    const data = s.exists() ? s.data().bids : {}
    setSaved(data)
    setBids(data)
  }, () => setSaved({})), [league.id, tournament.id, user.uid]) // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (players ?? []).filter((p) => p.price != null && (!term || p.name.toLowerCase().includes(term))).sort((a, b) => b.price - a.price)
  }, [players, search])

  const entries = Object.entries(bids).filter(([, v]) => v > 0)
  const total = entries.reduce((s, [, v]) => s + v, 0)
  const dirty = JSON.stringify(Object.fromEntries(entries)) !== JSON.stringify(saved ?? {})
  const byId = Object.fromEntries((players ?? []).map((p) => [p.id, p]))

  function setBid(p, value) {
    setStatus(null)
    setBids((prev) => {
      const next = { ...prev }
      if (value == null) delete next[p.id]
      else next[p.id] = Math.min(BUDGET, Math.max(p.price, half(value)))
      return next
    })
  }

  async function save() {
    if (entries.length > 20) { setStatus({ ok: false, text: 'Como mucho 20 pujas.' }); return }
    try {
      await setDoc(ref, { uid: user.uid, tournamentId: tournament.id, bids: Object.fromEntries(entries), updatedAt: serverTimestamp() })
      setStatus({ ok: true, text: 'Pujas guardadas. Nadie más puede verlas.' })
    } catch (err) {
      console.error(err)
      setStatus({ ok: false, text: 'No se pudieron guardar: puede que ya haya cerrado la subasta.' })
    }
  }

  if (saved === undefined) return <Skeleton className="h-16" count={5} />

  return (
    <>
      <section className="relative mt-5 overflow-hidden rounded-[1.6rem] bg-pine p-5 text-white md:sticky md:top-20 md:z-10">
        <div className="halftone absolute inset-0" />
        <div className="relative flex items-end justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-mint uppercase">Pujas a ciegas · cierran en {formatCountdown(auctionAt - now)}</p>
            <p className="score mt-1 text-[2.4rem]">{entries.length} <span className="text-xl text-white/60">pujas · {String(total).replace('.', ',')}M</span></p>
          </div>
        </div>
        <p className="relative mt-2 text-xs text-white/70">
          Puja lo que quieras por cada golfista (como mínimo su precio). Al cierre, cada uno va al que más pague si le cabe en sus {BUDGET}M y tiene hueco ({TEAM_SIZE} golfistas). Puedes pujar por más de lo que cabe: si pierdes alguna, entran las siguientes.
        </p>
        <button className="relative mt-4 h-12 w-full rounded-full bg-white font-display text-lg font-extrabold text-pine uppercase disabled:opacity-60" disabled={!dirty} onClick={save}>
          {dirty ? 'Guardar pujas' : 'Pujas guardadas'}
        </button>
        {status && <p className={`relative mt-2 text-sm ${status.ok ? 'text-mint' : 'text-[#ffb4ab]'}`}>{status.text}</p>}
      </section>

      {entries.length > 0 && (
        <section className="card mt-4 px-4 py-2">
          <p className="label pt-1">Tus pujas</p>
          {entries.sort((a, b) => b[1] - a[1]).map(([pid, amount]) => (
            <div key={pid} className="row">
              <PlayerPhoto src={byId[pid]?.photoURL} name={byId[pid]?.name} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{byId[pid]?.name}</span>
              <span className="score text-xl text-pine">{String(amount).replace('.', ',')}M</span>
            </div>
          ))}
        </section>
      )}

      <input className="input-field mt-4" placeholder="Buscar jugador" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar jugador" />
      <ul className="card mt-3 px-4">
        {visible.map((p) => {
          const bid = bids[p.id]
          return (
            <li key={p.id} className="row">
              <PlayerPhoto src={p.photoURL} name={p.name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{p.name}</span>
                <span className="text-xs text-muted">Precio {formatPrice(p.price)}{p.owgr ? ` · OWGR #${p.owgr}` : ''}</span>
              </span>
              {bid ? (
                <span className="flex items-center gap-1">
                  <button className="size-8 rounded-full bg-track font-bold text-pine" onClick={() => setBid(p, bid - 0.5 < p.price ? null : bid - 0.5)} aria-label={`Bajar puja por ${p.name}`}>−</button>
                  <span className="score w-14 text-center text-xl text-pine">{String(bid).replace('.', ',')}M</span>
                  <button className="size-8 rounded-full bg-pine font-bold text-white" onClick={() => setBid(p, bid + 0.5)} aria-label={`Subir puja por ${p.name}`}>+</button>
                </span>
              ) : (
                <button className="btn-ghost btn-sm" onClick={() => setBid(p, p.price)}>Pujar</button>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

/** Mercado libre tras la subasta: fichar golfistas sin dueño a su precio, el primero que llega. */
function FreeMarket({ league, tournament, players, byId }) {
  const { user, profile } = useAuth()
  const [team, setTeam] = useState(undefined)
  const [owners, setOwners] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const club = clubColor(profile?.color, user.uid)
  const teamRef = doc(db, 'leagues', league.id, 'teams', `${tournament.id}_${user.uid}`)

  useEffect(() => onSnapshot(teamRef, (s) => setTeam(s.exists() ? s.data() : null), () => setTeam(null)), [league.id, tournament.id, user.uid]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => onSnapshot(query(collection(db, 'leagues', league.id, 'owners'), where('tournamentId', '==', tournament.id)),
    (snap) => setOwners(new Map(snap.docs.map((d) => [d.data().playerId, d.data().uid]))), () => setOwners(new Map())), [league.id, tournament.id])

  const free = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (players ?? []).filter((p) => p.price != null && !owners?.has(p.id) && (!term || p.name.toLowerCase().includes(term))).sort((a, b) => b.price - a.price)
  }, [players, owners, search])

  if (team === undefined || owners === null) return <Skeleton className="mt-5 h-16" count={5} />
  const mine = team ?? { playerIds: [], spent: 0, captainId: null }
  const left = BUDGET - (mine.spent ?? 0)

  async function sign(p) {
    setError('')
    try {
      if (!team) {
        await setDoc(teamRef, { uid: user.uid, tournamentId: tournament.id, playerIds: [], captainId: null, spent: 0, displayName: profile?.displayName ?? user.displayName ?? 'Jugador', updatedAt: serverTimestamp() })
      }
      const batch = writeBatch(db)
      batch.update(teamRef, { playerIds: arrayUnion(p.id), spent: half((mine.spent ?? 0) + p.price), captainId: mine.captainId ?? p.id, updatedAt: serverTimestamp() })
      batch.set(doc(db, 'leagues', league.id, 'owners', `${tournament.id}_${p.id}`), { uid: user.uid, tournamentId: tournament.id, playerId: p.id })
      await batch.commit()
    } catch (err) {
      console.error(err)
      setError(`No se pudo fichar a ${p.name}: puede que otro se te haya adelantado.`)
    }
  }

  return (
    <>
      <section className="card mt-5 px-4 pt-3 pb-2">
        <div className="mb-1 flex items-baseline justify-between">
          <p className="label">Tu equipo en {league.name}</p>
          <p className="text-xs text-muted">{mine.playerIds.length}/{TEAM_SIZE} · quedan {formatPrice(left)}</p>
        </div>
        {mine.playerIds.length ? (
          <>
            <TeamList playerIds={mine.playerIds} captainId={mine.captainId} playersById={byId} showPoints={false} clubBg={club.bg} />
            {mine.playerIds.length > 1 && (
              <div className="mt-2 flex flex-wrap gap-1.5 pb-1">
                <span className="text-xs text-muted">Capitán:</span>
                {mine.playerIds.map((pid) => (
                  <button key={pid} onClick={() => updateDoc(teamRef, { captainId: pid, updatedAt: serverTimestamp() })}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pid === mine.captainId ? 'bg-pine text-white' : 'bg-track text-pine'}`}>
                    {byId[pid]?.shortName}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : <EmptyState title="Aún no tienes golfistas en esta liga. Ficha abajo a los que quedan libres." />}
      </section>

      {error && <p className="mt-3 text-sm text-over">{error}</p>}
      <input className="input-field mt-4" placeholder="Buscar golfista libre" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar golfista libre" />
      <ul className="card mt-3 px-4">
        {free.map((p) => {
          const disabled = mine.playerIds.length >= TEAM_SIZE || p.price > left
          return (
            <li key={p.id} className={`row ${disabled ? 'opacity-45' : ''}`}>
              <PlayerPhoto src={p.photoURL} name={p.name} />
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{p.name}</span><span className="text-xs text-muted">{p.owgr ? `OWGR #${p.owgr}` : p.country}</span></span>
              <button className="btn-primary btn-sm" disabled={disabled} onClick={() => sign(p)}>Fichar · {formatPrice(p.price)}</button>
            </li>
          )
        })}
        {!free.length && <li><EmptyState title="No quedan golfistas libres con ese nombre." /></li>}
      </ul>
    </>
  )
}

export default function MarketPage() {
  const { leagueId } = useParams()
  const [league, setLeague] = useState(undefined)
  const tournament = useCurrentTournament()
  const { players, byId } = usePlayers(tournament?.id)
  const { locked, now } = useLocked(tournament)

  useEffect(() => subscribeLeague(leagueId, setLeague, () => setLeague(null)), [leagueId])

  if (league === undefined || tournament === undefined) return <div className="mx-auto max-w-3xl px-4 pt-4"><Skeleton className="h-28" /><Skeleton className="mt-4 h-16" count={4} /></div>
  if (!league || league.mode !== 'market' || !tournament) {
    return <div className="mx-auto max-w-3xl px-4 pt-6"><div className="card"><EmptyState title="Esta liga no tiene mercado." action={<Link to={`/league/${leagueId}`} className="btn-secondary">Volver a la liga</Link>} /></div></div>
  }

  const auctionAt = tournament.auctionAt?.toMillis?.() ?? 0
  const resolved = league.market?.[tournament.id]?.resolved

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4">
      <Link to={`/league/${league.id}`} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-pine"><Icon name="back" className="size-4" />{league.name}</Link>
      <TournamentCard tournament={tournament} title="Mercado" />
      {!players?.length ? (
        <div className="card mt-5"><EmptyState title="La lista de inscritos se publica unos días antes del torneo. Entonces se abre la subasta." /></div>
      ) : locked ? (
        <div className="card mt-5"><EmptyState title="El torneo ha empezado: el mercado está cerrado. Mira cómo puntúa tu equipo en la liga." action={<Link to={`/league/${league.id}`} className="btn-primary">Ver la liga</Link>} /></div>
      ) : !resolved && now < auctionAt ? (
        <Auction league={league} tournament={tournament} players={players} auctionAt={auctionAt} now={now} />
      ) : !resolved ? (
        <div className="card mt-5"><EmptyState title="La subasta ha cerrado y se está resolviendo. En unos minutos tendrás tu equipo y se abrirá el mercado libre." /></div>
      ) : (
        <FreeMarket league={league} tournament={tournament} players={players} byId={byId} />
      )}
    </div>
  )
}
