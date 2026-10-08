import { sizedPhoto } from '../../utils/format'

// Foto recortada de un golfista (ESPN) dentro de un círculo de color
const SIZES = { sm: 'size-9', md: 'size-11', lg: 'size-12' }

export default function PlayerPhoto({ src, name, bg = '#0a4a24', size = 'md', className = '' }) {
  return (
    <span className={`${SIZES[size]} relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`} style={{ background: bg }} aria-hidden="true">
      {src ? (
        <img src={sizedPhoto(src, 140)} alt="" loading="lazy" className="absolute top-[6%] left-1/2 w-[138%] max-w-none -translate-x-1/2" />
      ) : (
        <span className="font-display text-lg font-extrabold text-white/80">{name?.[0] ?? '?'}</span>
      )}
    </span>
  )
}
