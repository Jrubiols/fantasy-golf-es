import { useMemo } from 'react'
import { achievementsFor } from '../../lib/achievements'
import Icon from './Icon'

// Insignias: las conseguidas en verde (con el torneo en que se lograron), las pendientes en gris
export default function Achievements({ entries }) {
  const list = useMemo(() => achievementsFor(entries ?? []), [entries])
  const earned = list.filter((a) => a.earned).length

  return (
    <section className="card animate-fade-up p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="headline text-[1.6rem]">Logros</h2>
        <span className="score text-xl text-pine">{earned}<span className="text-base text-muted"> / {list.length}</span></span>
      </div>
      <ul className="grid grid-cols-2 gap-2.5">
        {list.map((a) => (
          <li key={a.id} className={`relative overflow-hidden rounded-2xl p-3 ${a.earned ? 'bg-pine text-white' : 'bg-bg text-muted'}`}>
            {a.earned && <div className="halftone absolute inset-0" />}
            <span className={`relative flex size-9 items-center justify-center rounded-full ${a.earned ? 'bg-mint text-pine-dark' : 'bg-track text-faint'}`}>
              <Icon name={a.icon} className="size-4.5" strokeWidth={2.4} />
            </span>
            <p className={`relative mt-2 font-display text-[1.15rem] leading-tight font-extrabold uppercase ${a.earned ? '' : 'text-ink/60'}`}>{a.name}</p>
            <p className={`relative mt-0.5 text-[0.72rem] leading-snug ${a.earned ? 'text-white/75' : ''}`}>
              {a.earned ? `Conseguido en ${a.entry.tournamentName}` : a.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
