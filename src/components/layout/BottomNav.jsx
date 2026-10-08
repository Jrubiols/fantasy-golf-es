import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Icon from '../ui/Icon'
import { NAV_LINKS } from './nav-links'

export default function BottomNav() {
  const { profile } = useAuth()
  const links = profile?.isAdmin ? [...NAV_LINKS, { to: '/admin', label: 'Admin', icon: 'admin' }] : NAV_LINKS

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-around border-t border-gold-500/15 bg-pine-950/95 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur-lg md:hidden">
      {links.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `flex min-w-14 flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[0.68rem] transition-colors ${isActive ? 'text-gold-500' : 'text-muted'}`}
        >
          <Icon name={icon} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
