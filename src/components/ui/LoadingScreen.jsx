import Wordmark from './Wordmark'

export default function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Wordmark size="md" className="animate-pulse" />
    </div>
  )
}
