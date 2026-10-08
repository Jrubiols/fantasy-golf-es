import { formatSigned } from '../../utils/format'

// Puntos de fantasy en número de marcador: verdes si suman, rojos si restan
export default function Points({ value, suffix = '', className = '' }) {
  return (
    <span className={`score ${value < 0 ? 'text-over' : 'text-pine'} ${className}`}>
      {formatSigned(value).replace('+', '')}{suffix}
    </span>
  )
}
