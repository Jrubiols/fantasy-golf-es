import { clubColor } from '../../lib/clubs'
import { formatSigned, sizedPhoto } from '../../utils/format'
import Ordinal from './Ordinal'

/**
 * Tarjeta de club: el color del jugador, su puesto en un círculo blanco, la foto recortada
 * de su capitán y los puntos en una caja de cristal.
 */
export default function ClubCard({ color, uid, rank, title, subtitle, photo, points, pointsLabel = 'Puntos', size = 'lg', className = '', children }) {
  const c = clubColor(color, uid)
  const lg = size === 'lg'
  return (
    <div className={`relative overflow-hidden rounded-[1.6rem] text-white ${lg ? 'h-56' : 'h-44'} ${className}`} style={{ background: c.bg }}>
      <div className="halftone absolute inset-0" />
      <div
        className={`absolute rounded-full ${lg ? '-top-4 -right-12 size-64 border-[34px]' : '-top-5 -right-10 size-56 border-[30px]'}`}
        style={{ borderColor: c.ring }}
      />
      {photo && <img src={sizedPhoto(photo, 520)} alt="" className={`absolute bottom-0 max-w-none ${lg ? '-right-7 w-64' : '-right-6 w-52'}`} />}

      {rank != null && (
        <div className={`absolute top-4 left-4 flex items-center justify-center rounded-full bg-white score ${lg ? 'size-16 text-[2.4rem]' : 'size-14 text-[2rem]'}`} style={{ color: c.bg }}>
          <Ordinal value={rank} />
        </div>
      )}

      {/* Sin puesto (aún no hay clasificación), el nombre sube arriba y deja sitio abajo para una acción */}
      <div className={`absolute left-5 max-w-[52%] ${rank != null || points != null ? 'bottom-4' : 'top-5 max-w-[80%]'}`}>
        <p className={`truncate font-semibold ${lg ? 'text-2xl' : 'text-xl'}`}>{title}</p>
        {subtitle && <p className="mt-0.5 truncate text-[0.8rem] text-white/75">{subtitle}</p>}
      </div>

      {points != null && (
        <div className={`glass absolute right-3 bottom-3 px-3.5 py-2 ${lg ? 'w-36' : 'w-31'}`}>
          <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-white/85 uppercase">{pointsLabel}</p>
          <p className={`score text-right ${lg ? 'text-[2.5rem]' : 'text-[2rem]'}`}>{formatSigned(points).replace('+', '')}</p>
        </div>
      )}
      {children}
    </div>
  )
}
