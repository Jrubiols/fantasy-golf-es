const MEDALS = ['bg-gold-500 text-pine-950', 'bg-silver text-pine-950', 'bg-bronze text-white']

export default function RankBadge({ rank }) {
  const color = MEDALS[rank - 1] ?? 'bg-white/10 text-cream'
  return (
    <div className={`flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ${color}`}>
      {rank}
    </div>
  )
}
