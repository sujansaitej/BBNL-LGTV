import './App.css';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import PhoneNumberOtp from "./OAuthenticate/LoginOtp";
import Home from './Modules/Home'; 
import LiveChannels from './Modules/LiveChannels';
import LivePlayer from './Modules/LivePlayer';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Clear authentication on app load - always start with login page
  useEffect(() => {
    localStorage.removeItem('isAuthenticated');
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
      <Routes>
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
   
  );
}

export default App;