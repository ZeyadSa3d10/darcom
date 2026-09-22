import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import './NavbarSearch.css';

const TRENDING_QUICK_TAGS = [
  { key: 'marassi', label: 'Marassi' },
  { key: 'seaChalet', label: 'Beachfront Chalet' },
  { key: 'poolVilla', label: 'Pool Villa' },
  { key: 'gounaLagoon', label: 'El Gouna Lagoon' },
  { key: 'sokhnaWaterfront', label: 'Ain Sokhna' },
  { key: 'newCairoPenthouse', label: 'New Cairo Penthouse' },
];

export default function NavbarSearch({ solid = true }) {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const { t, isRtl } = useSettings();

  const [isOpen, setIsOpen] = useState(false);
  const [keyword, setKeyword] = useState('');

  // Sync state with URL search param if on /properties
  useEffect(() => {
    if (routeLocation.pathname === '/properties') {
      const sp = new URLSearchParams(routeLocation.search);
      setKeyword(sp.get('q') || '');
    }
  }, [routeLocation.pathname, routeLocation.search]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    const onMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', onMouseDown);
    }
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  // ESC key to close
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', onKeyDown);
    }
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const handleExecuteSearch = (queryToSearch) => {
    const q = (typeof queryToSearch === 'string' ? queryToSearch : keyword).trim();
    setIsOpen(false);
    if (q) {
      navigate(`/properties?q=${encodeURIComponent(q)}`);
    } else {
      navigate('/properties');
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    handleExecuteSearch(keyword);
  };

  const handleTagClick = (tagLabel) => {
    setKeyword(tagLabel);
    handleExecuteSearch(tagLabel);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setKeyword('');
    inputRef.current?.focus();
  };

  return (
    <div
      className={`navbar-search-wrapper ${solid ? 'is-solid' : 'is-hero'} ${isOpen ? 'is-expanded' : ''}`}
      ref={containerRef}
    >
      {/* 1. Pure Navbar Search Bar Form */}
      <form
        className="nav-search-bar"
        onSubmit={handleSubmit}
        role="search"
        aria-label={t('search.searchProperties', 'Search properties')}
      >
        <div className="nav-search-icon-wrap">
          <i className="bi bi-search"></i>
        </div>

        <input
          ref={inputRef}
          type="text"
          className="nav-search-input"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={t('search.capsulePlaceholder', 'Search property, compound, city...')}
          aria-label={t('search.searchProperties', 'Search properties')}
          autoComplete="off"
        />

        {keyword && (
          <button
            type="button"
            className="nav-search-clear-btn"
            onClick={handleClear}
            aria-label={t('common.clear', 'Clear')}
          >
            <i className="bi bi-x"></i>
          </button>
        )}

        <button
          type="submit"
          className="nav-search-submit-btn"
          aria-label={t('common.search', 'Search')}
          title={t('common.search', 'Search')}
        >
          <i className="bi bi-search"></i>
        </button>
      </form>

      {/* 2. Sleek Quick-Suggestions Dropdown */}
      {isOpen && (
        <div className="nav-search-dropdown-menu" role="dialog">
          <div className="dropdown-trending-header">
            <i className="bi bi-fire text-accent me-1"></i>
            <span>{t('search.trending', 'Trending Searches')}</span>
          </div>

          <div className="dropdown-trending-chips">
            {TRENDING_QUICK_TAGS.map((tag) => {
              const label = t(`search.tags.${tag.key}`, tag.label);
              return (
                <button
                  key={tag.key}
                  type="button"
                  className="dropdown-chip"
                  onClick={() => handleTagClick(label)}
                >
                  <i className="bi bi-search me-1 small opacity-50"></i>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div className="dropdown-footer-link">
            <button
              type="button"
              className="btn-browse-all"
              onClick={() => {
                setIsOpen(false);
                navigate('/properties');
              }}
            >
              <span>{t('nav.exploreAll', 'Explore All Properties')}</span>
              <i className={`bi ${isRtl ? 'bi-arrow-left' : 'bi-arrow-right'} ms-1`}></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
