export default function EmptyState({ title, children, action }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="mx-auto max-w-xs text-[0.95rem] text-muted">{title}</p>
      {children}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
