// Puesto con el ordinal pequeño arriba, como en los marcadores: 1º
export default function Ordinal({ value, className = '' }) {
  if (value == null) return <span className={className}>–</span>
  return (
    <span className={`inline-flex items-start ${className}`}>
      <span>{value}</span>
      <span className="mt-[0.12em] text-[0.48em]">º</span>
    </span>
  )
}
