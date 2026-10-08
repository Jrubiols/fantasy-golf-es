import { useState } from 'react'
import { clubColor } from '../../lib/clubs'
import Avatar from './Avatar'
import ClubCard from './ClubCard'
import Ordinal from './Ordinal'
import Points from './Points'

/**
 * Clasificación: los primeros como tarjetas de club y el resto como filas.
 * Cada fila: { uid, displayName, color, clubName, points, rank, photo? }.
 * Si se pasa renderDetail, al pulsar se despliega (por ejemplo, el equipo de ese jugador).
 */
export default function StandingsList({ rows, currentUid, renderDetail, meta, cards = 3 }) {
  const [open, setOpen] = useState(null)
  const toggle = (uid) => setOpen(open === uid ? null : uid)

  return (
    <ol className="flex flex-col gap-3">
      {rows.map((s, i) => {
        const isMe = s.uid === currentUid
        const expandable = Boolean(renderDetail && s.points != null)
        const subtitle = [isMe ? 'Tú' : null, s.clubName, meta?.(s)].filter(Boolean).join(' · ')
        const asCard = i < cards && s.points != null

        const body = asCard ? (
          <ClubCard color={s.color} uid={s.uid} rank={s.rank} title={s.displayName} subtitle={subtitle} photo={s.photo} points={s.points} size="md" />
        ) : (
          <div className={`card flex items-center gap-3 px-4 py-3 ${isMe ? 'ring-2 ring-pine/25' : ''}`}>
            <span className="score w-9 text-[1.6rem] text-pine"><Ordinal value={s.rank} /></span>
            <Avatar name={s.displayName} color={s.color} uid={s.uid} />
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate font-medium">{s.displayName}</span>
              {subtitle && <span className="block truncate text-xs text-muted">{subtitle}</span>}
            </span>
            {s.points != null ? <Points value={s.points} className="text-[1.7rem]" /> : <span className="text-xs text-muted">sin equipo</span>}
          </div>
        )

        return (
          <li key={s.uid} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
            {expandable ? (
              <button className="block w-full text-left transition-transform active:scale-[0.99]" onClick={() => toggle(s.uid)} aria-expanded={open === s.uid}>
                {body}
              </button>
            ) : body}
            {expandable && open === s.uid && (
              <div className="card mt-2 animate-fade-in px-4 pt-3 pb-1" style={{ borderTop: `4px solid ${clubColor(s.color, s.uid).bg}` }}>
                {renderDetail(s)}
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
