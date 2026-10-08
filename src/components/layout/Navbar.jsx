import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { firstName } from '../../utils/format'
import Avatar from '../ui/Avatar'
import Icon from '../ui/Icon'
import { NAV_LINKS } from './nav-links'

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-1.5 text-sm transition-colors ${isActive ? 'bg-gold-500/10 font-semibold text-gold-500' : 'text-muted hover:text-cream'}`

export default function Navbar() {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-gold-500/15 bg-pine-950/85 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="size-7" />
          <span className="font-display text-lg font-bold text-gold-500">
            FantasyGolf<span className="text-cream">ES</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} className={linkClass}>{label}</NavLink>
          ))}
          {profile?.isAdmin && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}
        </div>

        {user && (
          <div className="flex items-center gap-3">
            <Avatar src={user.photoURL} name={user.displayName} className="border border-gold-500/30" />
            <span className="hidden text-sm text-muted md:block">{firstName(user.displayName)}</span>
            <button onClick={handleLogout} className="rounded-md p-1.5 text-muted transition-colors hover:text-danger" title="Cerrar sesión" aria-label="Cerrar sesión">
              <Icon name="logout" />
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
