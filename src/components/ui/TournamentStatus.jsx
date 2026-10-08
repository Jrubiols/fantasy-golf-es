const STATUS = {
  in_progress: { label: 'En directo', className: 'bg-live-soft text-live-ink', live: true },
  scheduled: { label: 'Próximamente', className: 'bg-track text-pine' },
  final: { label: 'Finalizado', className: 'bg-track text-muted' },
}

export default function TournamentStatus({ status }) {
  const s = STATUS[status] ?? STATUS.scheduled
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[0.66rem] font-bold tracking-[0.08em] uppercase ${s.className}`}>
      {s.live && <span className="size-1.5 animate-pulse rounded-full bg-live" />}
      {s.label}
    </span>
  )
}
