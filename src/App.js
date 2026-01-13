import './App.css';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import BbnlVideo from "./OAuthenticate/bbnl";
import PhoneNumberOtp from "./OAuthenticate/LoginOtp";
import Home from './Modules/Home'; 
import LiveChannels from './Modules/LiveChannels';
import LivePlayer from './Modules/LivePlayer';
import { initializeWebOSEnvironment, preventWebOSDefaults } from './utils/webos';
import { ThemeProvider } from './Atomic-Common-Componenets/TheamChange';

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
    
    return cleanup;
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
    <ThemeProvider>
      <Router>
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
      </Router>
    </ThemeProvider>
   
  );
}

export default App;