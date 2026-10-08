import { useLocked } from '../../hooks/useTournament'
import { formatCountdown, formatDateRange, formatDateTime } from '../../utils/format'
import TournamentStatus from './TournamentStatus'

// Cabecera del torneo de la semana: estado, nombre en grande y cierre de equipos
export default function TournamentCard({ tournament, title, children }) {
  const { locked, lockAt, now } = useLocked(tournament)
  const round = tournament.status === 'in_progress' && tournament.round ? `Ronda ${tournament.round} de ${tournament.rounds}` : null

  return (
    <section className="animate-fade-up">
      <div className="flex flex-wrap items-center gap-2.5">
        <TournamentStatus status={tournament.status} />
        {tournament.major && <span className="inline-flex h-6 items-center rounded-full bg-gold/20 px-2.5 text-[0.66rem] font-bold tracking-[0.08em] text-[#7a5b10] uppercase">Major</span>}
        {round && <span className="label">{round}</span>}
      </div>
      <h1 className="headline mt-2 text-[3.1rem] sm:text-6xl">{title ?? tournament.name}</h1>
      <p className="mt-1.5 text-sm text-muted">
        {title ? `${tournament.name} · ` : ''}{tournament.venue}{tournament.venue ? ' · ' : ''}{formatDateRange(tournament.startDate, tournament.endDate)}
      </p>
      {lockAt && !locked && (
        <p className="mt-1 text-sm text-muted">
          Se cierra en <strong className="text-pine">{formatCountdown(lockAt - now)}</strong> · {formatDateTime(lockAt)}
        </p>
      )}
      {children}
    </section>
  )
}
