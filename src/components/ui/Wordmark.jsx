// Marca de la casa: FANTASY GOLF + píldora ES
const SIZES = {
  sm: { text: 'text-[1.35rem]', pill: 'text-[0.68rem] px-1.5 pt-[3px] pb-[2px]' },
  md: { text: 'text-[1.9rem]', pill: 'text-[0.9rem] px-2 pt-1 pb-[3px]' },
}

export default function Wordmark({ size = 'sm', className = '' }) {
  const s = SIZES[size]
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`font-display font-black leading-none text-pine ${s.text}`}>FANTASY GOLF</span>
      <span className={`rounded-full bg-pine font-display font-extrabold leading-none text-white ${s.pill}`}>ES</span>
    </span>
  )
}
