import { useState } from 'react'
import Avatar from './Avatar'
import Points from './Points'
import RankBadge from './RankBadge'
import { firstName } from '../../utils/format'

/**
 * Clasificación compartida por ligas y ranking. Cada fila: { uid, displayName, photoURL, points, rank, detail? }.
 * Si se pasa renderDetail, al pulsar una fila se despliega (por ejemplo, el equipo de ese jugador).
 */
export default function StandingsList({ rows, currentUid, shortNames = false, renderDetail, meta }) {
  const [open, setOpen] = useState(null)

  return (
    <ol className="flex flex-col gap-1.5">
      {rows.map((s) => {
        const isMe = s.uid === currentUid
        const expandable = Boolean(renderDetail && s.rank != null)
        const content = (
          <>
            {s.rank != null ? <RankBadge rank={s.rank} /> : <span className="size-7 shrink-0 text-center text-muted">–</span>}
            <Avatar src={s.photoURL} name={s.displayName} />
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium">
                {shortNames ? firstName(s.displayName) : s.displayName}
                {isMe && <span className="ml-1.5 text-xs text-gold-500">tú</span>}
              </p>
              {meta && <p className="truncate text-xs text-muted">{meta(s)}</p>}
            </div>
            {s.points != null ? <Points value={s.points} /> : <span className="text-xs text-muted">sin equipo</span>}
          </>
        )
        return (
          <li key={s.uid}>
            {expandable ? (
              <button
                className={`list-row w-full ${isMe ? 'list-row-highlight' : ''} hover:bg-white/7`}
                onClick={() => setOpen(open === s.uid ? null : s.uid)}
                aria-expanded={open === s.uid}
              >
                {content}
              </button>
            ) : (
              <div className={`list-row ${isMe ? 'list-row-highlight' : ''}`}>{content}</div>
            )}
            {expandable && open === s.uid && <div className="mt-1.5 mb-2 pl-4">{renderDetail(s)}</div>}
          </li>
        )
      })}
    </ol>
  )
}
