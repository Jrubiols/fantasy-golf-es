import { useMemo } from 'react'
import { useCurrentTournament, usePlayers } from '../../hooks/useTournament'
import { useEntries } from '../../hooks/useLeagueData'
import { formatDateTime } from '../../utils/format'
import PageHeader from '../../components/ui/PageHeader'
import Skeleton from '../../components/ui/Skeleton'
import TournamentStatus from '../../components/ui/TournamentStatus'

// Si el motor lleva más de 40 minutos sin escribir, algo va mal (se ejecuta cada 15)
const STALE_AFTER_MS = 40 * 60_000

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2.5 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}

export default function AdminPage() {
  const tournament = useCurrentTournament()
  const { players } = usePlayers(tournament?.id)
  const entries = useEntries(tournament?.id)

  const stats = useMemo(() => {
    if (!players) return null
    const count = (status) => players.filter((p) => p.status === status).length
    return { total: players.length, unpriced: players.filter((p) => p.price == null).length, noOwgr: players.filter((p) => !p.owgr).length, cut: count('cut'), wd: count('wd') + count('dq') }
  }, [players])

  const updatedAt = tournament?.updatedAt?.toMillis?.()
  const stale = updatedAt != null && Date.now() - updatedAt > STALE_AFTER_MS

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PageHeader title="Panel de admin" subtitle="Estado del motor que sincroniza ESPN" />

      {tournament === undefined ? (
        <Skeleton className="h-40" />
      ) : !tournament ? (
        <section className="card p-5 ring-2 ring-over/30 text-sm">
          <p className="font-semibold text-over">El motor todavía no ha guardado ningún torneo.</p>
          <p className="mt-2 text-muted">Comprueba en GitHub → Actions → «Sincronizar ESPN» que el flujo está activo y que el secreto FIREBASE_SERVICE_ACCOUNT existe.</p>
        </section>
      ) : (
        <>
          <section className={`card mb-5 p-5 ${stale ? 'ring-2 ring-over/40' : ''}`}>
            <div className="mb-3 flex items-center gap-2">
              <TournamentStatus status={tournament.status} />
              <h2 className="font-semibold">{tournament.name}</h2>
            </div>
            <Row label="Última sincronización">
              <span className={stale ? 'font-semibold text-over' : ''}>{updatedAt ? formatDateTime(updatedAt) : '–'}{stale ? ' · ¡retrasada!' : ''}</span>
            </Row>
            <Row label="Estado de ESPN">{tournament.statusDetail || '–'}</Row>
            <Row label="Cierre de equipos">{tournament.firstTeeTime ? formatDateTime(tournament.firstTeeTime.toMillis()) : '–'}</Row>
            <Row label="Corte">{tournament.cutRound ? `tras la ronda ${tournament.cutRound} (${tournament.cutCount} jugadores)` : 'sin corte'}</Row>
            <Row label="ID de ESPN"><span className="font-semibold">{tournament.id}</span></Row>
          </section>

          <section className="card mb-5 p-5">
            <h2 className="headline mb-2 text-[1.5rem]">Datos</h2>
            {stats ? (
              <>
                <Row label="Jugadores inscritos">{stats.total}</Row>
                <Row label="Sin precio">{stats.unpriced}</Row>
                <Row label="Fuera del top 1000 OWGR (precio mínimo)">{stats.noOwgr}</Row>
                <Row label="Corte / retirados">{stats.cut} / {stats.wd}</Row>
                <Row label="Equipos publicados">{entries?.length ?? '–'}</Row>
              </>
            ) : <Skeleton count={3} />}
          </section>
        </>
      )}

      <section className="card p-5 text-sm text-muted">
        <h2 className="mb-2 headline text-[1.5rem]">¿Cómo forzar una actualización?</h2>
        <p>En GitHub, abre el repositorio → pestaña <strong>Actions</strong> → <strong>Sincronizar ESPN</strong> → <strong>Run workflow</strong>. Tarda un minuto.</p>
        <p className="mt-2">Para hacer admin a otra persona: en la consola de Firebase → Firestore → <code>users</code> → su documento → pon <code>isAdmin</code> a <code>true</code>.</p>
      </section>
    </div>
  )
}
