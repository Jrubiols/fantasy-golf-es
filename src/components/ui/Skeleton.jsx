export default function Skeleton({ className = 'h-11', count = 1 }) {
  if (count === 1) return <div className={`skeleton ${className}`} />
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }, (_, i) => <div key={i} className={`skeleton ${className}`} />)}
    </div>
  )
}
