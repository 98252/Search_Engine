import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleSearchHomePage } from './pages/GoogleSearchHomePage';
import { GoogleSearchResultsPage } from './pages/GoogleSearchResultsPage';
import { HomePage as DiagnosticsPage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';

export const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('smartsearch_theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('smartsearch_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('smartsearch_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <BrowserRouter>
      <div className={`min-h-screen font-sans transition-colors duration-200 ${isDarkMode ? 'dark bg-[#07090e] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <Routes>
          {/* Primary Route: Pristine Google Search Engine */}
          <Route
            path="/"
            element={<GoogleSearchHomePage isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />}
          />

          {/* Search Engine Results Page (SERP) with Instant Reader Peek & Glass-Box Tuner */}
          <Route
            path="/search"
            element={<GoogleSearchResultsPage isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />}
          />

          {/* Secondary Diagnostic / Architectural routes preserved */}
          <Route path="/diagnostics" element={<DiagnosticsPage />} />
          <Route path="/about" element={<AboutPage />} />

          {/* Catch-all redirects back to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
