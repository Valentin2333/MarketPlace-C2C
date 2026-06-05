import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { User } from '@supabase/supabase-js'
import CreateListingModal from '../../features/listings/CreateListingModal'
import styles from './Navbar.module.css'

type Profile = {
  id: string
  role: string | null
}

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setCreateOpen(false)
  }, [location.pathname])

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single()
    setProfile(data)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const handleCreate = () => {
    if (user) setCreateOpen(true)
    else navigate('/login')
  }

  const isAdmin = profile?.role === 'admin'

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <>
      <header className={styles.header}>
        <nav className={styles.nav}>

          <Link to="/" className={styles.logo}>
            <div className={styles.logoIcon}>🛒</div>
            <span>MarketPlace</span>
          </Link>

          <button type="button" className={styles.createBtn} onClick={handleCreate}>
            <span className={styles.createPlus}>+</span>
            Sell
          </button>

          <div className={styles.links}>
            {isAdmin && (
              <Link
                to="/admin"
                className={`${styles.navLink} ${styles.adminLink} ${isActive('/admin') ? styles.navLinkActive : ''}`}
              >
                Admin Panel
              </Link>
            )}
          </div>

          <div className={styles.actions}>
            {user ? (
              <>
                <Link
                  to={`/profile/${user.id}`}
                  className={`${styles.navLink} ${isActive('/profile') ? styles.navLinkActive : ''}`}
                >
                  Profile
                </Link>
                <button className={styles.btnLogout} onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={styles.btnGhost}>
                  Log in
                </Link>
                <Link to="/register" className={styles.btnPrimary}>
                  Register
                </Link>
              </>
            )}
          </div>

          <button
            className={styles.hamburger}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? '✕' : '☰'}
          </button>

        </nav>
      </header>

      {menuOpen && (
        <div
          className={styles.mobileMenu}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a, button')) setMenuOpen(false)
          }}
        >
          {isAdmin && (
            <>
              <Link
                to="/admin"
                className={`${styles.mobileLink} ${styles.mobileAdminLink}`}
              >
                Admin Panel
              </Link>

              <div className={styles.mobileDivider} />
            </>
          )}

          {user ? (
            <>
              <Link
                to={`/profile/${user.id}`}
                className={`${styles.mobileLink} ${isActive('/profile') ? styles.mobileLinkActive : ''}`}
              >
                Profile
              </Link>
              <button className={styles.mobileBtnLogout} onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.mobileLink}>
                Log in
              </Link>
              <Link to="/register" className={styles.mobileBtnPrimary}>
                Register
              </Link>
            </>
          )}
        </div>
      )}

      <CreateListingModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}
