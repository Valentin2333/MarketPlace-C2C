import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCurrentUser } from "../../lib/useCurrentUser";
import CreateListingModal from "../../features/listings/CreateListingModal";
import { useFavorites } from "../Favorites/useFavorites";
import { useUnread } from "../Messages/useUnread";
import { useReports } from "../Reports/useReports";
import { useUserReports } from "../UserReports/useUserReports";

import BrandMark from '../BrandMark/BrandMark'
import ThemeToggle from "../Theme/ThemeToggle";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { favoriteIds } = useFavorites();
  const { unreadCount } = useUnread();
  const { unseenCount: listingReportsUnseen } = useReports();
  const { unseenCount: userReportsUnseen } = useUserReports();
  const adminUnseen = listingReportsUnseen + userReportsUnseen;
  const { userId, isAdmin } = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setCreateOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        mobileMenuRef.current?.contains(target) ||
        hamburgerRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  const handleCreate = () => {
    if (userId) setCreateOpen(true);
    else navigate("/login");
  };

  const favCount = favoriteIds.length;

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <>
      <header className={styles.header}>
        <nav className={styles.nav}>
          <Link to="/" className={styles.logo}>
            <BrandMark className={styles.logoIcon} />
            <span>MarketPlace</span>
          </Link>

          <button
            type="button"
            className={styles.createBtn}
            onClick={handleCreate}
          >
            <span className={styles.createPlus}>+</span>
            Sell
          </button>

          <div className={styles.links}>
            {isAdmin && (
              <Link
                to="/admin"
                className={`${styles.navLink} ${styles.adminLink} ${isActive("/admin") ? styles.navLinkActive : ""}`}
              >
                Admin Panel
                {adminUnseen > 0 && (
                  <span className={styles.favBadge}>{adminUnseen}</span>
                )}
              </Link>
            )}
          </div>

          <div className={styles.actions}>
            <ThemeToggle variant="icon" />
            {userId ? (
              <>
                <Link
                  to="/favorites"
                  className={`${styles.navLink} ${isActive("/favorites") ? styles.navLinkActive : ""}`}
                >
                  Favorites
                  {favCount > 0 && (
                    <span className={styles.favBadge}>{favCount}</span>
                  )}
                </Link>
                <Link
                  to="/messages"
                  className={`${styles.navLink} ${isActive("/messages") ? styles.navLinkActive : ""}`}
                >
                  Messages
                  {unreadCount > 0 && (
                    <span className={styles.favBadge}>{unreadCount}</span>
                  )}
                </Link>
                <Link
                  to={`/profile/${userId}`}
                  className={`${styles.navLink} ${isActive("/profile") ? styles.navLinkActive : ""}`}
                >
                  Profile
                </Link>
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
            ref={hamburgerRef}
            className={styles.hamburger}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </nav>
      </header>

      {menuOpen && (
        <div
          ref={mobileMenuRef}
          className={styles.mobileMenu}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a, button"))
              setMenuOpen(false);
          }}
        >
          {isAdmin && (
            <>
              <Link
                to="/admin"
                className={`${styles.mobileLink} ${styles.mobileAdminLink}`}
              >
                Admin Panel
                {adminUnseen > 0 && (
                  <span className={styles.favBadge}>{adminUnseen}</span>
                )}
              </Link>

              <div className={styles.mobileDivider} />
            </>
          )}

          {userId ? (
            <>
              <Link
                to="/favorites"
                className={`${styles.mobileLink} ${isActive("/favorites") ? styles.mobileLinkActive : ""}`}
              >
                Favorites
                {favCount > 0 && (
                  <span className={styles.favBadge}>{favCount}</span>
                )}
              </Link>
              <Link
                to="/messages"
                className={`${styles.mobileLink} ${isActive("/messages") ? styles.mobileLinkActive : ""}`}
              >
                Messages
                {unreadCount > 0 && (
                  <span className={styles.favBadge}>{unreadCount}</span>
                )}
              </Link>
              <Link
                to={`/profile/${userId}`}
                className={`${styles.mobileLink} ${isActive("/profile") ? styles.mobileLinkActive : ""}`}
              >
                Profile
              </Link>
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

          <div className={styles.mobileDivider} />
          <ThemeToggle variant="full" />
        </div>
      )}

      <CreateListingModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </>
  );
}
