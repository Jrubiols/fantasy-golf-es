// Selector en píldora: la opción activa se rellena de verde
export default function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`flex h-[3.1rem] rounded-full bg-track p-[5px] ${className}`} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 rounded-full font-display font-extrabold uppercase tracking-wide transition-colors ${tabs.length > 3 ? 'text-[1.02rem]' : 'text-[1.2rem]'} ${value === t.id ? 'bg-pine text-white' : 'text-navy hover:text-pine'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
