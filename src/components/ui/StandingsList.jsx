import Avatar from './Avatar'
import Points from './Points'
import RankBadge from './RankBadge'
import { firstName } from '../../utils/format'

// Lista de clasificación compartida por la liga y el ranking global
export default function StandingsList({ scores, currentUid, shortNames = false }) {
  return (
    <ol className="flex flex-col gap-1.5">
      {scores.map((s, i) => {
        const isMe = s.uid === currentUid
        return (
          <li key={s.uid} className={`list-row ${isMe ? 'list-row-highlight' : ''}`}>
            <RankBadge rank={i + 1} />
            <Avatar src={s.photoURL} name={s.displayName} />
            <p className="flex-1 text-sm font-medium">
              {shortNames ? firstName(s.displayName) : s.displayName}
              {isMe && <span className="ml-1.5 text-xs text-gold-500">tú</span>}
            </p>
            <Points value={s.totalPoints} />
          </li>
        )
      })}
    </ol>
  )
}
