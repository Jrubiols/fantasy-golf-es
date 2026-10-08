export default function LoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <img src="/favicon.svg" alt="" className="size-14 animate-pulse" />
      <p className="text-sm text-muted">Cargando...</p>
    </div>
  )
}
