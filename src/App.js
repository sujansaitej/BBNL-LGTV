import './App.css';
import './styles/magic-remote-ui-fix.css';
import './styles/webos-navigation.css';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import BbnlVideo from "./OAuthenticate/bbnl";
import PhoneNumberOtp from "./OAuthenticate/LoginOtp";
import Home from './Modules/Home'; 
import LiveChannels from './Modules/LiveChannels';
import LanguageChannels from './Modules/LanguageChannels';
import LivePlayer from './Modules/LivePlayer';
import MoviesOtt from './Modules/MoviesOtt';
import Favorites from './Modules/Favorites';
import Feedback from './Modules/Feedback';
import Setting from './Modules/Setting';
import { initializeWebOSEnvironment, preventWebOSDefaults } from './utils/webos';
import { initializeMagicRemoteUIStability, cleanupMagicRemoteUIStability } from './utils/magicRemoteUIStability';
// Spatial navigation disabled for now - will add back after testing basic app

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return localStorage.getItem('isAuthenticated') === 'true';
    } catch {
      return false;
    }
  });

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
    localStorage.removeItem('isAuthenticated');
  };

  return (
    <Router>
      <div data-focusable-container>
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
                <Setting />
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
  );
}

export default App;
