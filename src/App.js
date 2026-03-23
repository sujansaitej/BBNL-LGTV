import { MemoryRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { initializeWebOSEnvironment, preventWebOSDefaults } from './utils/webos';
import { initializeMagicRemoteUIStability, cleanupMagicRemoteUIStability } from './utils/magicRemoteUIStability';
import checkAppLock from './server/OAuthentication-Api/Applock';
import { useDeviceInformation } from './server/Deviceinformaction/LG-Devicesinformaction';
import ServiceLocked from './error/OAuthentication/ServiceLocked';

// Direct imports — zero lazy loading = instant page transitions on LG TV
import BbnlVideo from "./Modules/bbnl";
import PhoneNumberOtp from "./Modules/LoginOtp";
import Home from './Modules/Home';
import LiveChannels from './Modules/LiveChannels';
import LanguageChannels from './Modules/LanguageChannels';
import LivePlayer from './Modules/LivePlayer';
import MoviesOtt from './Modules/MoviesOtt';
import Favorites from './Modules/Favorites';
import Feedback from './Modules/Feedback';
import Setting from './Modules/Setting';
/**
 * GlobalBackHandler — handles the LG webOS BACK key (keyCode 461).
 *
 * webOS shows the "exit app?" dialog when it detects no previous entry in
 * window.history.  Because we use MemoryRouter, the real browser history
 * always has only 1 entry → webOS always tries to exit.
 *
 * Fix: we push a dummy history entry whenever we are on a sub-page.
 * When webOS pops it (via the BACK button), we catch the popstate event
 * and navigate to /home inside MemoryRouter instead of exiting.
 *
 * On /home there is no dummy entry, so BACK triggers the native exit dialog.
 *
 * Pages with custom BACK handling (LivePlayer, LoginOtp) manage their own
 * capture-phase keydown listener and call e.stopPropagation().
 */
const GlobalBackHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location.pathname);
  const hasGuardRef = useRef(false);

  // Keep locationRef in sync
  useEffect(() => { locationRef.current = location.pathname; }, [location.pathname]);

  // Push/remove a dummy browser-history entry based on current route
  useEffect(() => {
    const path = location.pathname;
    const isHome = path === '/home' || path === '/';
    const selfHandled = path === '/login';

    if (!isHome && !selfHandled) {
      // Sub-page: push a guard entry so webOS doesn't show exit dialog
      if (!hasGuardRef.current) {
        window.history.pushState({ guard: true }, '');
        hasGuardRef.current = true;
      }
    } else {
      // Home or self-handled page: remove guard if present
      hasGuardRef.current = false;
    }
  }, [location.pathname]);

  // Listen for popstate — fired when webOS BACK pops our guard entry
  useEffect(() => {
    const onPopState = () => {
      if (hasGuardRef.current) {
        hasGuardRef.current = false;
        navigate('/home', { replace: true });
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [navigate]);

  // Also handle keydown directly for sub-pages as a fallback
  // (some webOS versions fire keydown before popstate)
  useEffect(() => {
    const isBackKey = (e) => e.keyCode === 461 || e.key === 'GoBack' || e.key === 'Back' || e.key === 'Backspace';
    const selfHandledRoutes = ['/login', '/player'];

    const onKeyDown = (e) => {
      if (!isBackKey(e)) return;
      const path = locationRef.current;
      if (selfHandledRoutes.includes(path)) return;
      if (path === '/home' || path === '/') return;
      // Sub-page: prevent webOS exit and navigate to home
      e.preventDefault();
      e.stopPropagation();
      hasGuardRef.current = false;
      navigate('/home', { replace: true });
    };

    // Capture phase — intercept before anything else
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [navigate]);

  return null;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return localStorage.getItem('isAuthenticated') === 'true';
    } catch {
      return false;
    }
  });

  const [isLocked, setIsLocked] = useState(false);
  const deviceInfo = useDeviceInformation();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (deviceInfo.loading) return;

    const runLockCheck = async () => {
      const mobile = localStorage.getItem("userPhone") || "";
      const result = await checkAppLock({
        device_name: "LG TV",
        device_type: "LG TV",
        ip_address: deviceInfo.publicIPv4 || deviceInfo.privateIPv4 || "",
        mobile,
        model: deviceInfo.modelName || "",
      });
      if (result?.locked) setIsLocked(true);
    };

    runLockCheck();
  }, [isAuthenticated, deviceInfo.loading, deviceInfo.publicIPv4, deviceInfo.privateIPv4, deviceInfo.modelName]);

  useEffect(() => {
    // Initialize webOS TV environment
    const cleanup = initializeWebOSEnvironment();
    preventWebOSDefaults();
    
    // Initialize Magic Remote UI stability
    initializeMagicRemoteUIStability();
    
    console.log('✓ WebOS environment initialized');
    console.log('✓ Magic Remote UI stability enabled');
    
    return () => {
      cleanup?.();
      cleanupMagicRemoteUIStability();
    };
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    localStorage.setItem('isAuthenticated', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.clear();
    sessionStorage.clear();
    localStorage.removeItem('isAuthenticated');
  };

  return (
    <>
    <Router>
      <div data-focusable-container>
        <GlobalBackHandler />
        <Routes>
          <Route 
            path="/bbnl-video" 
            element={
              isAuthenticated ? 
              <Navigate to="/home" replace /> : 
              <BbnlVideo />
            } 
          />
          <Route 
            path="/login" 
            element={
              isAuthenticated ? 
              <Navigate to="/home" replace /> : 
              <PhoneNumberOtp onLoginSuccess={handleLoginSuccess} />
            } 
          />
          <Route 
            path="/home" 
            element={
              isAuthenticated ? 
              <Home onLogout={handleLogout} /> : 
              <Navigate to="/login" replace />
            } 
          />
          <Route
            path="/live-channels"
            element={
              isAuthenticated ? (
                <LiveChannels />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/languagechannels"
            element={
              isAuthenticated ? (
                <LanguageChannels />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/movies-ott"
            element={
              isAuthenticated ? (
                <MoviesOtt />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/feedback"
            element={
              isAuthenticated ? (
                <Feedback />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/favorites"
            element={
              isAuthenticated ? (
                <Favorites />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/settings"
            element={
              isAuthenticated ? (
                <Setting onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/player"
            element={
              isAuthenticated ? (
                <LivePlayer />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route 
            path="/" 
            element={<Navigate to={isAuthenticated ? "/home" : "/login"} replace />} 
          />
        </Routes>
      </div>
    </Router>

    {/* Service Locked overlay — blocks entire app when lock: "true" */}
    {isLocked && <ServiceLocked />}
    </>
  );
}

export default App;
