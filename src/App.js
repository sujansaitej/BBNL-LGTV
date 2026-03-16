import { MemoryRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { initializeWebOSEnvironment, preventWebOSDefaults } from './utils/webos';
import { initializeMagicRemoteUIStability, cleanupMagicRemoteUIStability } from './utils/magicRemoteUIStability';
import checkAppLock from './server/OAuthentication-Api/Applock';
import { useDeviceInformation } from './server/Deviceinformaction/LG-Devicesinformaction';
import ServiceLocked from './error/OAuthentication/ServiceLocked';

const lazyWithPreload = (importer) => {
  const Component = lazy(importer);
  Component.preload = importer;
  return Component;
};

const BbnlVideo = lazyWithPreload(() => import("./Modules/bbnl"));
const PhoneNumberOtp = lazyWithPreload(() => import("./Modules/LoginOtp"));
const Home = lazyWithPreload(() => import('./Modules/Home'));
const LiveChannels = lazyWithPreload(() => import('./Modules/LiveChannels'));
const LanguageChannels = lazyWithPreload(() => import('./Modules/LanguageChannels'));
const LivePlayer = lazyWithPreload(() => import('./Modules/LivePlayer'));
const MoviesOtt = lazyWithPreload(() => import('./Modules/MoviesOtt'));
const Favorites = lazyWithPreload(() => import('./Modules/Favorites'));
const Feedback = lazyWithPreload(() => import('./Modules/Feedback'));
const Setting = lazyWithPreload(() => import('./Modules/Setting'));
/**
 * GlobalBackHandler — listens for the LG webOS BACK key (keyCode 461).
 *
 * Short press  → navigate(-1)  (returns to previous page in MemoryRouter history)
 * Long press   → webOS platformBack() or window.history.back() (exits app / shows
 *               the "exit app?" dialog on webOS TV 6.0+)
 *
 * Pages that need custom BACK behaviour (e.g. LivePlayer) attach their own
 * handler with capture=true and call e.stopPropagation() — that prevents this
 * global handler from also firing.
 */
const GlobalBackHandler = () => {
  const navigate = useNavigate();
  const longPressTimer = useRef(null);
  const longPressed = useRef(false);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.keyCode !== 461 && e.key !== 'GoBack' && e.key !== 'Back') return;
      e.preventDefault();
      longPressed.current = false;
      longPressTimer.current = setTimeout(() => {
        longPressed.current = true;
        // Long-press: hand off to webOS (shows exit dialog on webOS 6+) or go to home
        if (window.webOS?.platformBack) {
          window.webOS.platformBack();
        } else {
          window.history.back();
        }
      }, 700);
    };

    const onKeyUp = (e) => {
      if (e.keyCode !== 461 && e.key !== 'GoBack' && e.key !== 'Back') return;
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      if (!longPressed.current) {
        // Short-press: go back one step in MemoryRouter history
        navigate(-1);
      }
      longPressed.current = false;
    };

    // Bubble phase — per-page capture-phase handlers fire first and can stopPropagation
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
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

  useEffect(() => {
    if (!isAuthenticated) return;

    const preloadRoutes = () => {
      LiveChannels.preload?.();
      LanguageChannels.preload?.();
      LivePlayer.preload?.();
      MoviesOtt.preload?.();
      Favorites.preload?.();
      Feedback.preload?.();
      Setting.preload?.();
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(preloadRoutes, { timeout: 1500 });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timer = setTimeout(preloadRoutes, 250);
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

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
        <Suspense
          fallback={
            <div style={{ color: "#fff", padding: 24, fontSize: 24 }}>
              Loading...
            </div>
          }
        >
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
        </Suspense>
      </div>
    </Router>

    {/* Service Locked overlay — blocks entire app when lock: "true" */}
    {isLocked && <ServiceLocked />}
    </>
  );
}

export default App;
