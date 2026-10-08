import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Avatar from '../ui/Avatar'
import Wordmark from '../ui/Wordmark'
import { NAV_LINKS } from './nav-links'

const linkClass = ({ isActive }) =>
  `rounded-full px-4 py-2 font-display text-[1.05rem] font-extrabold uppercase tracking-wide transition-colors ${isActive ? 'bg-pine text-white' : 'text-pine hover:bg-track'}`

export default function Navbar() {
  const { user, profile } = useAuth()

  return (
    <nav className="sticky top-0 z-50 bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/dashboard" aria-label="Inicio">
          <Wordmark />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} className={linkClass}>{label}</NavLink>
          ))}
          {profile?.isAdmin && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}
        </div>

        {user && (
          <Link to="/perfil" className="flex items-center gap-2.5 rounded-full transition-opacity hover:opacity-85" aria-label="Mi perfil">
            <span className="hidden text-right md:block">
              <span className="block text-sm font-semibold text-ink">{profile?.displayName ?? user.displayName}</span>
              {profile?.clubName && <span className="block text-xs text-muted">{profile.clubName}</span>}
            </span>
            <Avatar name={profile?.displayName ?? user.displayName} color={profile?.color} uid={user.uid} />
          </Link>
        )}
      </div>
    </nav>
  )
}
