import { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore'
import { db } from '../services/firebase'
import { subscribeToActiveTournament } from '../services/firestoreService'
import { useAuth } from '../hooks/useAuth'
import { firstName, formatSigned } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Avatar from '../components/ui/Avatar'
import StandingsList from '../components/ui/StandingsList'

// Orden visual del podio: 2º, 1º, 3º
const PODIUM = [
  { index: 1, medal: '🥈', height: 'h-20' },
  { index: 0, medal: '🥇', height: 'h-28', winner: true },
  { index: 2, medal: '🥉', height: 'h-14' },
]

function Podium({ scores }) {
  return (
    <div className="mb-6 flex animate-fade-up items-end justify-center gap-2 px-4 pt-6 [animation-delay:80ms]">
      {PODIUM.map(({ index, medal, height, winner }) => {
        const s = scores[index]
        return (
          <div key={s.uid} className={`flex flex-col items-center gap-1.5 ${winner ? 'flex-[1.2]' : 'flex-1'}`}>
            <Avatar src={s.photoURL} name={s.displayName} size={winner ? 'xl' : 'lg'} className={`border-2 ${winner ? 'border-gold-500' : 'border-white/20'}`} />
            <span className={winner ? 'text-xl' : 'text-base'}>{medal}</span>
            <p className="max-w-20 truncate text-center text-xs font-semibold">{firstName(s.displayName)}</p>
            <div className={`flex w-full items-center justify-center rounded-t-md ${height} ${winner ? 'bg-linear-135 from-gold-500 to-gold-300 text-pine-950' : 'bg-white/8'}`}>
              <span className="font-mono text-sm font-bold">{formatSigned(s.totalPoints)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [scores, setScores] = useState([])
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribeToActiveTournament((t) => {
      setTournament(t)
      if (!t) setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!tournament) return
    const q = query(collection(db, 'scores'), where('tournamentId', '==', tournament.id), orderBy('totalPoints', 'desc'), limit(50))
    getDocs(q)
      .then((snap) => setScores(snap.docs.map((d) => d.data())))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [tournament])

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <PageHeader title="Ranking Global" subtitle={tournament ? tournament.name : 'Todos los usuarios de la plataforma'} />

      {scores.length >= 3 && <Podium scores={scores} />}

      <section className="card animate-fade-up p-5 [animation-delay:150ms]">
        {loading ? (
          <Skeleton className="h-13" count={5} />
        ) : scores.length === 0 ? (
          <EmptyState title="Aún no hay puntuaciones para este torneo." />
        ) : (
          <StandingsList scores={scores} currentUid={user?.uid} />
        )}
      </section>
    </div>
  )
}
