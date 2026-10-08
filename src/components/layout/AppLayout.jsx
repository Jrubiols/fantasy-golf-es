import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import BottomNav from './BottomNav'
import Skeleton from '../ui/Skeleton'
import { listenForeground } from '../../services/notifications'

function PageFallback() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Skeleton className="mb-6 h-10 w-52" />
      <Skeleton className="h-14" count={4} />
    </div>
  )
}

export default function AppLayout() {
  // Con la app abierta, los avisos también se muestran
  useEffect(() => {
    let unsubscribe = () => {}
    listenForeground().then((fn) => { unsubscribe = fn })
    return () => unsubscribe()
  }, [])

  return (
    <>
      <Navbar />
      <main className="pb-safe-nav">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNav />
    </>
  )
}
