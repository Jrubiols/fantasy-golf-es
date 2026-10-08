const STATUS = {
  in: { label: 'En juego', className: 'bg-pine-600 text-pine-200', live: true },
  pre: { label: 'Próximamente', className: 'bg-white/10 text-muted' },
  post: { label: 'Finalizado', className: 'bg-white/10 text-muted' },
}

// Acepta tanto el estado corto (in/pre/post) como el de ESPN (STATUS_IN_PROGRESS, STATUS_SCHEDULED...)
function normalize(status = '') {
  if (status === 'in' || status.includes('IN_PROGRESS') || status.includes('PLAY_COMPLETE')) return 'in'
  if (status === 'pre' || status.includes('SCHEDULED')) return 'pre'
  return 'post'
}

export default function TournamentStatus({ status }) {
  const s = STATUS[normalize(status)]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold uppercase ${s.className}`}>
      {s.live && <span className="size-1.5 animate-pulse rounded-full bg-danger" />}
      {s.label}
    </span>
  )
}
