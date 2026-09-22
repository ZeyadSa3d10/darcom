import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import NavbarSearch from '../NavbarSearch/NavbarSearch.jsx';
import './Navbar.css';

const FEATURED_LOCATIONS = [
  { name: 'Ain Sokhna', slug: 'ain-sokhna', desc: 'Red Sea beaches, 1h from Cairo', icon: 'bi-water' },
  { name: 'North Coast', slug: 'north-coast', desc: 'Mediterranean summer luxury', icon: 'bi-umbrella' },
  { name: 'El Gouna', slug: 'el-gouna', desc: 'Lagoon town & marina life', icon: 'bi-compass' },
  { name: 'New Cairo', slug: 'new-cairo', desc: 'Family living & modern compounds', icon: 'bi-building' },
  { name: 'Hurghada', slug: 'hurghada', desc: 'Year-round sun & dive waters', icon: 'bi-sun' },
];

const POPULAR_TYPES = [
  { name: 'Chalets', slug: 'chalet', icon: 'bi-house' },
  { name: 'Villas', slug: 'villa', icon: 'bi-house-heart' },
  { name: 'Penthouses', slug: 'penthouse', icon: 'bi-building' },
  { name: 'Townhouses', slug: 'townhouse', icon: 'bi-houses' },
  { name: 'Duplexes', slug: 'duplex', icon: 'bi-layers' },
];

export default function Navbar({ transparent = false }) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { isRtl, toggleDir, toggleLang, lang, isSwitchingLang, t } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const exploreRef = useRef(null);
  const megaMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  // Viewport safety clamp: guarantees mega-menu never overflows any viewport edge
  useEffect(() => {
    if (!exploreOpen) return;

    const clampMegaMenu = () => {
      const el = megaMenuRef.current;
      if (!el) return;

      el.style.transform = '';
      const rect = el.getBoundingClientRect();
      const margin = 16;
      let shiftX = 0;

      if (rect.left < margin) {
        shiftX = margin - rect.left;
      } else if (rect.right > window.innerWidth - margin) {
        shiftX = (window.innerWidth - margin) - rect.right;
      }

      if (shiftX !== 0) {
        if (isRtl) {
          el.style.transform = `translateX(${shiftX}px)`;
        } else {
          el.style.transform = `translateX(calc(-50% + ${shiftX}px))`;
        }
      }
    };

    const rafId = requestAnimationFrame(clampMegaMenu);
    window.addEventListener('resize', clampMegaMenu);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', clampMegaMenu);
    };
  }, [exploreOpen, isRtl]);

  // Scroll watcher for transparent/solid glassmorphism transition
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 25);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setOpen(false);
    setExploreOpen(false);
    setUserMenuOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname, location.search]);

  // Lock body scroll when mobile menu or search is open
  useEffect(() => {
    if (open || mobileSearchOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, mobileSearchOpen]);

  // Click outside listener for desktop dropdowns
  useEffect(() => {
    const onClickOutside = (e) => {
      if (exploreRef.current && !exploreRef.current.contains(e.target)) {
        setExploreOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const overHero = transparent || location.pathname === '/';
  const solid = !overHero || scrolled || open || mobileSearchOpen;

  const onLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    setOpen(false);
    navigate('/');
  };

  const getUserInitials = () => {
    if (!user?.fullName) return 'D';
    const parts = user.fullName.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <header className={`darcom-navbar ${solid ? 'solid' : 'over-hero'} ${scrolled ? 'is-scrolled' : ''}`}>
      <nav className="container-fluid px-3 px-lg-4 px-xxl-5 navbar-inner">
        {/* 1. BRAND LOGO */}
        <div className="navbar-brand-wrap">
          <Link to="/" className="navbar-brand" onClick={() => setOpen(false)}>
            <img
              src={solid ? '/logo-dark.png' : '/logo-white.png'}
              alt={t('common.darcom', 'Darcom')}
              className="navbar-brand-logo"
            />
          </Link>
        </div>

        {/* 2. CREATIVE LUXURY NAVBAR SEARCH CONSOLE */}
        <div className="d-none d-lg-flex navbar-center-search">
          <NavbarSearch solid={solid} />
        </div>

        {/* 3. DESKTOP RIGHT CLUSTER: EXPLORE + SELL + CONTROLS + AUTH */}
        <div className="d-none d-lg-flex navbar-right-cluster">
          {/* Mega Dropdown trigger: Properties */}
          <div
            className={`nav-item-dropdown ${exploreOpen ? 'open' : ''}`}
            ref={exploreRef}
            onMouseEnter={() => setExploreOpen(true)}
            onMouseLeave={() => setExploreOpen(false)}
          >
            <button
              type="button"
              className={`nav-link-btn ${location.pathname.startsWith('/properties') ? 'active' : ''}`}
              onClick={() => setExploreOpen((o) => !o)}
              aria-expanded={exploreOpen}
            >
              <span>{t('nav.properties', 'Properties')}</span>
              <i className={`bi bi-chevron-down dropdown-chevron ${exploreOpen ? 'rotated' : ''}`}></i>
            </button>

            {/* Glassmorphic Mega Menu */}
            {exploreOpen && (
              <div className="mega-menu" role="menu" ref={megaMenuRef}>
                <div className="mega-menu-inner">
                  {/* Column 1: Coastal Destinations */}
                  <div className="mega-col">
                    <h6 className="mega-heading">
                      <i className="bi bi-geo-alt-fill text-accent me-2"></i>
                      {t('nav.topDestinations', 'Top Destinations')}
                    </h6>
                    <div className="mega-locations-grid">
                      {FEATURED_LOCATIONS.map((loc) => (
                        <Link
                          key={loc.slug}
                          to={`/properties?location=${loc.slug}`}
                          className="mega-location-card"
                          onClick={() => setExploreOpen(false)}
                        >
                          <div className="location-card-icon">
                            <i className={`bi ${loc.icon}`}></i>
                          </div>
                          <div>
                            <strong>{t(`destinations.${loc.slug}`, loc.name)}</strong>
                            <small>{loc.desc}</small>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: Types & Quick Filters */}
                  <div className="mega-col mega-col-types">
                    <h6 className="mega-heading">
                      <i className="bi bi-grid-fill text-accent me-2"></i>
                      {t('nav.propertyTypes', 'Property Types')}
                    </h6>
                    <div className="mega-types-list">
                      {POPULAR_TYPES.map((tItem) => (
                        <Link
                          key={tItem.slug}
                          to={`/properties?type=${tItem.slug}`}
                          className="mega-type-item"
                          onClick={() => setExploreOpen(false)}
                        >
                          <i className={`bi ${tItem.icon}`}></i>
                          <span>{t(`types.${tItem.slug}`, tItem.name)}</span>
                        </Link>
                      ))}
                    </div>

                    <div className="mega-action-box">
                      <p className="mb-2">{t('nav.exclusiveDeals', 'Looking for exclusive deals?')}</p>
                      <Link
                        to="/properties"
                        className="btn btn-brand btn-sm w-100"
                        onClick={() => setExploreOpen(false)}
                      >
                        {t('nav.exploreAll', 'Explore All Properties')} <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-1`}></i>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <NavLink to="/contact" className={({ isActive }) => `nav-link-btn d-none d-xl-inline-flex ${isActive ? 'active' : ''}`}>
            {t('nav.contact', 'Contact')}
          </NavLink>

          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `admin-nav-link nav-link-btn ${isActive ? 'active' : ''}`}>
              <i className="bi bi-shield-lock-fill me-1"></i>
              {t('nav.admin', 'Admin')}
            </NavLink>
          )}

          {/* Sell CTA button with glowing shimmer */}
          <Link to="/sell" className="btn-sell-cta" title={t('nav.sellProperty', 'Sell Property')}>
            <span className="btn-sell-shimmer"></span>
            <i className="bi bi-plus-lg me-1"></i>
            <span>{t('nav.sellProperty', 'Sell Property')}</span>
          </Link>

          {/* Language Toggle */}
          <button
            type="button"
            className="lang-pill"
            onClick={toggleLang}
            disabled={isSwitchingLang}
            title={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
          >
            <i className="bi bi-globe2 me-1"></i>
            <span>{t('nav.langToggle', lang === 'ar' ? 'EN' : 'عربي')}</span>
          </button>

          {/* Favorites Button with micro bounce */}
          <Link to="/favorites" className="nav-icon-btn" aria-label={t('nav.favorites', 'Saved Properties')} title={t('nav.favorites', 'Saved Properties')}>
            <i className="bi bi-heart"></i>
          </Link>

          {/* User Account Menu / Login Button */}
          {isAuthenticated ? (
            <div className="user-dropdown-wrapper" ref={userMenuRef}>
              <button
                type="button"
                className={`user-avatar-btn ${userMenuOpen ? 'active' : ''}`}
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-expanded={userMenuOpen}
              >
                <span className="user-avatar-circle">{getUserInitials()}</span>
                <span className="user-name-label">{user?.fullName?.split(' ')[0]}</span>
                <i className={`bi bi-chevron-down user-chevron ${userMenuOpen ? 'rotated' : ''}`}></i>
              </button>

              {userMenuOpen && (
                <div className="user-dropdown-card" role="menu">
                  <div className="user-dropdown-header">
                    <span className="dropdown-avatar">{getUserInitials()}</span>
                    <div className="dropdown-meta">
                      <strong>{user?.fullName}</strong>
                      <small>{user?.email}</small>
                      {isAdmin && <span className="admin-badge">{t('nav.admin', 'Admin')}</span>}
                    </div>
                  </div>

                  <div className="user-dropdown-divider"></div>

                  <nav className="user-dropdown-links">
                    <Link to="/profile" onClick={() => setUserMenuOpen(false)}>
                      <i className="bi bi-person-gear"></i>
                      <span>{t('nav.myProfile', 'My Profile')}</span>
                    </Link>
                    <Link to="/favorites" onClick={() => setUserMenuOpen(false)}>
                      <i className="bi bi-heart"></i>
                      <span>{t('nav.favorites', 'Saved Properties')}</span>
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" className="admin-highlight" onClick={() => setUserMenuOpen(false)}>
                        <i className="bi bi-shield-check"></i>
                        <span>{t('nav.adminDashboard', 'Admin Dashboard')}</span>
                      </Link>
                    )}
                  </nav>

                  <div className="user-dropdown-divider"></div>

                  <button type="button" className="user-dropdown-logout" onClick={onLogout}>
                    <i className="bi bi-box-arrow-right"></i>
                    <span>{t('nav.logout', 'Log Out')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-nav-login">
              <i className="bi bi-person me-1"></i>
              <span>{t('nav.login', 'Login')}</span>
            </Link>
          )}
        </div>

        {/* MOBILE ACTIONS BAR (Search + Language + Favorites + Morphing Hamburger) */}
        <div className="d-flex d-lg-none mobile-nav-actions">
          <button
            type="button"
            className={`mobile-quick-btn mobile-search-btn ${mobileSearchOpen ? 'active' : ''}`}
            onClick={() => {
              setOpen(false);
              setMobileSearchOpen((o) => !o);
            }}
            title="Search properties"
            aria-label="Search properties"
          >
            <i className="bi bi-search"></i>
          </button>

          <button
            type="button"
            className="mobile-quick-btn mobile-lang-btn"
            onClick={toggleLang}
            disabled={isSwitchingLang}
            title={isRtl ? 'English' : 'عربي'}
            aria-label="Toggle language"
          >
            {isRtl ? 'EN' : 'عربي'}
          </button>

          <Link
            to="/favorites"
            className="mobile-quick-btn mobile-fav-btn"
            aria-label="Favorites"
            title="Saved Properties"
            onClick={() => {
              setOpen(false);
              setMobileSearchOpen(false);
            }}
          >
            <i className="bi bi-heart"></i>
          </Link>

          <button
            type="button"
            className={`hamburger-btn ${open ? 'open' : ''}`}
            onClick={() => {
              setMobileSearchOpen(false);
              setOpen((o) => !o);
            }}
            aria-expanded={open}
            aria-label="Toggle navigation menu"
          >
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </button>
        </div>
      </nav>

      {/* MOBILE QUICK SEARCH FLOATING MODAL */}
      {mobileSearchOpen && typeof document !== 'undefined' && createPortal(
        <div className="mobile-search-backdrop" onClick={() => setMobileSearchOpen(false)}>
          <div className="mobile-search-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-search-sheet-header">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-search text-accent"></i>
                <span className="fw-bold">{t('search.searchProperties', 'Search Properties')}</span>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setMobileSearchOpen(false)}
                aria-label={t('common.close', 'Close search')}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="mobile-search-sheet-body">
              <NavbarSearch solid={true} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MOBILE FULL-WIDTH GLASS DROPDOWN DRAWER */}
      {open && typeof document !== 'undefined' && createPortal(
        <div className="mobile-drawer-backdrop" onClick={() => setOpen(false)}>
          <div className="mobile-drawer-panel" onClick={(e) => e.stopPropagation()}>
            {/* Quick Sell CTA */}
            <div className="mobile-panel-top">
              <Link to="/sell" className="btn-sell-cta w-100 justify-content-center" onClick={() => setOpen(false)}>
                <i className="bi bi-plus-circle-fill me-2"></i>
                <span>{t('nav.sellProperty', 'Sell Your Property')}</span>
              </Link>
            </div>

            {/* Quick Search in Mobile Menu */}
            <div className="mobile-search-panel-box">
              <NavbarSearch solid={true} />
            </div>

            {/* Navigation Links */}
            <nav className="mobile-menu-links">
              <Link to="/properties" className="mobile-nav-item" onClick={() => setOpen(false)}>
                <i className="bi bi-grid-fill nav-icon"></i>
                <span>{t('nav.exploreAll', 'All Properties')}</span>
                <i className={`bi ${isRtl ? 'bi-chevron-left' : 'bi-chevron-right'} ms-auto arrow-icon`}></i>
              </Link>
              <Link to="/properties?purpose=sale" className="mobile-nav-item" onClick={() => setOpen(false)}>
                <i className="bi bi-tag-fill nav-icon"></i>
                <span>{t('purposes.sale', 'Buy Property')}</span>
                <i className={`bi ${isRtl ? 'bi-chevron-left' : 'bi-chevron-right'} ms-auto arrow-icon`}></i>
              </Link>
              <Link to="/properties?purpose=rent" className="mobile-nav-item" onClick={() => setOpen(false)}>
                <i className="bi bi-key-fill nav-icon"></i>
                <span>{t('purposes.rent', 'Rent Property')}</span>
                <i className={`bi ${isRtl ? 'bi-chevron-left' : 'bi-chevron-right'} ms-auto arrow-icon`}></i>
              </Link>
              <Link to="/contact" className="mobile-nav-item" onClick={() => setOpen(false)}>
                <i className="bi bi-chat-dots-fill nav-icon"></i>
                <span>{t('nav.contact', 'Contact Us')}</span>
                <i className={`bi ${isRtl ? 'bi-chevron-left' : 'bi-chevron-right'} ms-auto arrow-icon`}></i>
              </Link>
              {isAdmin && (
                <Link to="/admin" className="mobile-nav-item admin-item" onClick={() => setOpen(false)}>
                  <i className="bi bi-shield-lock-fill nav-icon"></i>
                  <span>{t('nav.adminDashboard', 'Admin Dashboard')}</span>
                  <i className={`bi ${isRtl ? 'bi-chevron-left' : 'bi-chevron-right'} ms-auto arrow-icon`}></i>
                </Link>
              )}
            </nav>

            {/* Coastal Destinations Chips */}
            <div className="mobile-destinations-wrap">
              <span className="destinations-title">{t('nav.popularDestinations', 'Popular Destinations')}</span>
              <div className="destinations-chips">
                {FEATURED_LOCATIONS.map((loc) => (
                  <Link
                    key={loc.slug}
                    to={`/properties?location=${loc.slug}`}
                    className="destination-pill"
                    onClick={() => setOpen(false)}
                  >
                    <i className={`bi ${loc.icon} me-1`}></i>
                    <span>{t(`destinations.${loc.slug}`, loc.name)}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* User Account Footer */}
            <div className="mobile-panel-footer">
              {isAuthenticated ? (
                <div className="mobile-auth-box">
                  <div className="mobile-user-profile">
                    <span className="user-avatar-circle">{getUserInitials()}</span>
                    <div className="user-info-text">
                      <strong>{user?.fullName}</strong>
                      <small>{user?.email}</small>
                    </div>
                  </div>
                  <div className="mobile-auth-buttons">
                    <Link to="/profile" className="btn btn-outline-secondary btn-sm" onClick={() => setOpen(false)}>
                      <i className="bi bi-person me-1"></i> {t('nav.myProfile', 'Profile')}
                    </Link>
                    <button type="button" className="btn btn-danger btn-sm" onClick={onLogout}>
                      <i className="bi bi-box-arrow-right me-1"></i> {t('nav.logout', 'Logout')}
                    </button>
                  </div>
                </div>
              ) : (
                <Link to="/login" className="btn btn-brand w-100 justify-content-center" onClick={() => setOpen(false)}>
                  <i className="bi bi-person-circle me-2"></i>
                  <span>{t('nav.login', 'Login / Register')}</span>
                </Link>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
