// Selector de pestañas segmentado (Torneo / Temporada...)
export default function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`flex rounded-xl bg-white/6 p-1 ${className}`} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm transition-all ${value === t.id ? 'bg-pine-900 font-semibold text-cream' : 'text-muted hover:text-cream'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
