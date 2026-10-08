import { clubColor } from '../../lib/clubs'

const SIZES = { sm: 'size-8 text-base', md: 'size-10 text-xl', lg: 'size-12 text-2xl', xl: 'size-16 text-3xl' }

/** Avatar de un jugador de la liga: su inicial sobre su color de club. */
export default function Avatar({ name, color, uid, size = 'md', className = '' }) {
  return (
    <span
      className={`${SIZES[size]} inline-flex shrink-0 items-center justify-center rounded-full font-display font-extrabold text-white ${className}`}
      style={{ background: clubColor(color, uid).bg }}
      aria-hidden="true"
    >
      {name?.[0]?.toUpperCase() ?? '?'}
    </span>
  )
}
