import { useLocked } from '../../hooks/useTournament'
import { formatCountdown, formatDateRange, formatDateTime } from '../../utils/format'
import TournamentStatus from './TournamentStatus'

// Cabecera del torneo de la semana con el estado del cierre de equipos
export default function TournamentCard({ tournament, children }) {
  const { locked, lockAt, now } = useLocked(tournament)
  const round = tournament.status === 'in_progress' && tournament.round ? `Ronda ${tournament.round} de ${tournament.rounds}` : null

  return (
    <section className="card animate-fade-up border-gold-500/30 px-5 py-5 [animation-delay:50ms] sm:px-6">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <TournamentStatus status={tournament.status} />
        {tournament.major && <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-[0.7rem] font-semibold text-gold-500 uppercase">Major</span>}
        {round && <span className="text-xs text-muted">{round}</span>}
      </div>
      <h2 className="font-display text-xl font-bold text-cream sm:text-2xl">{tournament.name}</h2>
      <p className="mt-0.5 text-sm text-muted">
        {tournament.venue}{tournament.venue ? ' · ' : ''}{formatDateRange(tournament.startDate, tournament.endDate)}
      </p>
      {lockAt && (
        <p className={`mt-3 text-sm ${locked ? 'text-muted' : 'text-gold-300'}`}>
          {locked
            ? 'Equipos cerrados: ya cuentan los puntos'
            : <>Los equipos se cierran en <strong>{formatCountdown(lockAt - now)}</strong> <span className="text-muted">({formatDateTime(lockAt)})</span></>}
        </p>
      )}
      {children}
    </section>
  )
}
