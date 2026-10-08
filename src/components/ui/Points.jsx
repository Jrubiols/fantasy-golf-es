import { formatSigned, pointsClass } from '../../utils/format'

export default function Points({ value, suffix = '', className = '' }) {
  return (
    <span className={`font-mono font-bold tabular-nums ${pointsClass(value)} ${className}`}>
      {formatSigned(value)}{suffix}
    </span>
  )
}
