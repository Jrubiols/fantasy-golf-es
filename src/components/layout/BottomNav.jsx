import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Icon from '../ui/Icon'
import { NAV_LINKS } from './nav-links'

// Barra flotante del móvil: la sección activa se despliega con su nombre
export default function BottomNav() {
  const { profile } = useAuth()
  const links = profile?.isAdmin ? [...NAV_LINKS, { to: '/admin', label: 'Admin', icon: 'admin' }] : NAV_LINKS

  return (
    <nav className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex h-[4.1rem] items-center justify-between rounded-full bg-surface px-2 shadow-[0_10px_32px_rgb(10_30_15/0.14)] md:hidden">
      {links.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          aria-label={label}
          className={({ isActive }) =>
            `flex h-[3.1rem] items-center justify-center gap-2 rounded-full font-display text-[1.05rem] font-extrabold uppercase transition-all duration-300 ${isActive ? 'bg-pine px-4 text-white' : 'w-[3.1rem] text-pine'}`}
        >
          {({ isActive }) => (
            <>
              <Icon name={icon} className="size-[1.3rem] shrink-0" />
              {isActive && <span className="animate-fade-in">{label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
