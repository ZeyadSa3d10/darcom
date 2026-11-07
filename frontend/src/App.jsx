import { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { ToastProvider } from './components/Toast/Toast.jsx';
import Navbar from './components/Navbar/Navbar.jsx';
import Footer from './components/Footer/Footer.jsx';
import OfflineBanner from './components/OfflineBanner/OfflineBanner.jsx';
import ErrorState from './components/ErrorState/ErrorState.jsx';
import LoadingScreen from './components/LoadingScreen/LoadingScreen.jsx';
import LanguageTransitionOverlay from './components/LanguageTransitionOverlay/LanguageTransitionOverlay.jsx';
import Home from './pages/Home/Home.jsx';
import Properties from './pages/Properties/Properties.jsx';
import PropertyDetails from './pages/PropertyDetails/PropertyDetails.jsx';
import Contact from './pages/Contact/Contact.jsx';
import Checkout from './pages/Checkout/Checkout.jsx';
import Favorites from './pages/Favorites/Favorites.jsx';
import Login from './pages/Login/Login.jsx';
import Register from './pages/Register/Register.jsx';
import ForgotPassword from './pages/ForgotPassword/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword/ResetPassword.jsx';
import Profile from './pages/Profile/Profile.jsx';
import Sell from './pages/Sell/Sell.jsx';
// AdminDashboard is code-split: heaviest route, admin-only, rarely visited.
const AdminDashboard = lazy(() => import('./pages/AdminDashboard/AdminDashboard.jsx'));
const BrokerDashboard = lazy(() => import('./pages/Broker/BrokerDashboard.jsx'));
const BrokerProperties = lazy(() => import('./pages/Broker/BrokerProperties.jsx'));
const BrokerSubmitProperty = lazy(() => import('./pages/Broker/BrokerSubmitProperty.jsx'));
const BrokerRequests = lazy(() => import('./pages/Broker/BrokerRequests.jsx'));
import Privacy from './pages/Privacy/Privacy.jsx';
import Terms from './pages/Terms/Terms.jsx';
import Sitemap from './pages/Sitemap/Sitemap.jsx';
import WelcomeSelector from './pages/WelcomeSelector/WelcomeSelector.jsx';
import Compare from './pages/Compare/Compare.jsx';
import Rent from './pages/Rent/Rent.jsx';
import Developers from './pages/Developers/Developers.jsx';
import { CompareProvider } from './context/CompareContext.jsx';
import CompareFloatingBar from './components/CompareFloatingBar/CompareFloatingBar.jsx';

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, search]);
  return null;
}

// Keyed by pathname so every route change plays the page-enter animation
// (search-param changes like filters don't remount — input focus is preserved).
function PageTransition({ children }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function NotFound() {
  return (
    <main className="container py-5">
      <ErrorState
        title="Page not found"
        error="The page you requested does not exist."
      />
      <div className="text-center">
        <Link to="/" className="btn btn-brand">
          Back to home
        </Link>
      </div>
    </main>
  );
}

export default function App() {
  const location = useLocation();
  const isWelcome = location.pathname === '/welcome';
  const hasMode = typeof window !== 'undefined' && !!sessionStorage.getItem('darcom-mode-selected');

  // If user hits '/' for the first time in session, redirect to '/welcome' (replaces entry so back goes out cleanly)
  if (!hasMode && location.pathname === '/') {
    return <Navigate to="/welcome" replace />;
  }

  // When on '/welcome', render the immersive WelcomeSelector
  if (isWelcome) {
    return (
      <SettingsProvider>
        <LoadingScreen />
        <WelcomeSelector />
      </SettingsProvider>
    );
  }

  return (
    <SettingsProvider>
      <AuthProvider>
        <ToastProvider>
          <CompareProvider>
            <LoadingScreen />
            <LanguageTransitionOverlay />
            <ScrollToTop />
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>
            <Navbar />
            <OfflineBanner />
            <PageTransition>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/rent" element={<Rent />} />
              <Route path="/welcome" element={<WelcomeSelector />} />
              <Route path="/properties/:slug" element={<PropertyDetails />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/developers" element={<Developers />} />
              <Route path="/contact" element={<Contact />} />
              <Route
                path="/checkout/:slug"
                element={<ProtectedRoute><Checkout /></ProtectedRoute>}
              />
              <Route
                path="/favorites"
                element={<ProtectedRoute><Favorites /></ProtectedRoute>}
              />
              <Route
                path="/login"
                element={<GuestRoute><Login /></GuestRoute>}
              />
              <Route
                path="/register"
                element={<GuestRoute><Register /></GuestRoute>}
              />
              <Route
                path="/forgot-password"
                element={<GuestRoute><ForgotPassword /></GuestRoute>}
              />
              <Route
                path="/reset-password"
                element={<GuestRoute><ResetPassword /></GuestRoute>}
              />
              <Route
                path="/sell"
                element={<ProtectedRoute><Sell /></ProtectedRoute>}
              />
              <Route
                path="/profile"
                element={<ProtectedRoute><Profile /></ProtectedRoute>}
              />
              <Route
                path="/admin"
                element={<ProtectedRoute roles={['Admin']}><Suspense fallback={null}><AdminDashboard /></Suspense></ProtectedRoute>}
              />
              <Route path="/broker" element={<Navigate to="/broker/dashboard" replace />} />
              <Route
                path="/broker/dashboard"
                element={<ProtectedRoute roles={['Broker', 'Admin']}><Suspense fallback={null}><BrokerDashboard /></Suspense></ProtectedRoute>}
              />
              <Route
                path="/broker/properties"
                element={<ProtectedRoute roles={['Broker', 'Admin']}><Suspense fallback={null}><BrokerProperties /></Suspense></ProtectedRoute>}
              />
              <Route
                path="/broker/submit-property"
                element={<ProtectedRoute roles={['Broker', 'Admin']}><Suspense fallback={null}><BrokerSubmitProperty /></Suspense></ProtectedRoute>}
              />
              <Route
                path="/broker/requests"
                element={<ProtectedRoute roles={['Broker', 'Admin']}><Suspense fallback={null}><BrokerRequests /></Suspense></ProtectedRoute>}
              />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/sitemap" element={<Sitemap />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </PageTransition>
            <CompareFloatingBar />
            <Footer />
          </CompareProvider>
        </ToastProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
