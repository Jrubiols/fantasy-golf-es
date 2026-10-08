const SIZES = { sm: 'size-7 text-xs', md: 'size-8 text-sm', lg: 'size-10 text-base', xl: 'size-13 text-lg' }

export default function Avatar({ src, name, size = 'md', className = '' }) {
  const base = `${SIZES[size]} shrink-0 rounded-full object-cover ${className}`
  if (src) return <img src={src} alt={name ?? ''} referrerPolicy="no-referrer" loading="lazy" className={base} />
  return (
    <div className={`${base} flex items-center justify-center bg-pine-900 font-semibold text-muted`} aria-hidden="true">
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}
