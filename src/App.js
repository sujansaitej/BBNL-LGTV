import './App.css';
import './styles/magic-remote-ui-fix.css';
import './styles/webos-navigation.css';
import { MemoryRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { initializeWebOSEnvironment, preventWebOSDefaults } from './utils/webos';
import { initializeMagicRemoteUIStability, cleanupMagicRemoteUIStability } from './utils/magicRemoteUIStability';
import checkAppLock from './Api/OAuthentication-Api/Applock';
import { useDeviceInformation } from './Api/Deviceinformaction/LG-Devicesinformaction';
import ServiceLocked from './Atomic-ErrorThrow-Componenets/ServiceLocked';

const lazyWithPreload = (importer) => {
  const Component = lazy(importer);
  Component.preload = importer;
  return Component;
};

const BbnlVideo = lazyWithPreload(() => import("./OAuthenticate/bbnl"));
const PhoneNumberOtp = lazyWithPreload(() => import("./OAuthenticate/LoginOtp"));
const Home = lazyWithPreload(() => import('./Modules/Home'));
const LiveChannels = lazyWithPreload(() => import('./Modules/LiveChannels'));
const LanguageChannels = lazyWithPreload(() => import('./Modules/LanguageChannels'));
const LivePlayer = lazyWithPreload(() => import('./Modules/LivePlayer'));
const MoviesOtt = lazyWithPreload(() => import('./Modules/MoviesOtt'));
const Favorites = lazyWithPreload(() => import('./Modules/Favorites'));
const Feedback = lazyWithPreload(() => import('./Modules/Feedback'));
const Setting = lazyWithPreload(() => import('./Modules/Setting'));
// Spatial navigation disabled for now - will add back after testing basic app

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
