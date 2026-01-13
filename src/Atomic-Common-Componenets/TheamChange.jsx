import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode

  const toggleTheme = (checked) => {
    setIsDarkMode(checked);
  };

  const theme = {
    isDarkMode,
    colors: {
      background: isDarkMode ? '#000' : '#f5f5f5',
      surface: isDarkMode ? '#050505' : '#ffffff',
      text: isDarkMode ? '#fff' : '#000',
      textSecondary: isDarkMode ? '#cfcfcf' : '#666',
      border: isDarkMode ? '#111' : '#e0e0e0',
      cardBg: isDarkMode ? '#0e0e0e' : '#ffffff',
      inputBg: isDarkMode ? '#0d0d0d' : '#f8f8f8',
      inputBorder: isDarkMode ? '#1e1e1e' : '#ddd',
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};
