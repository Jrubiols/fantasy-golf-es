const STATUS = {
  in_progress: { label: 'En juego', className: 'bg-pine-600 text-pine-200', live: true },
  scheduled: { label: 'Próximamente', className: 'bg-white/10 text-muted' },
  final: { label: 'Finalizado', className: 'bg-white/10 text-muted' },
}

export default function TournamentStatus({ status }) {
  const s = STATUS[status] ?? STATUS.scheduled
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold uppercase ${s.className}`}>
      {s.live && <span className="size-1.5 animate-pulse rounded-full bg-danger" />}
      {s.label}
    </span>
  )
}
