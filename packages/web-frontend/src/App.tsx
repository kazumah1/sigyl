import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Index from './pages/Index';
import Blog from './pages/Blog';
import Deploy from './pages/Deploy';
import Marketplace from './pages/Marketplace';
import Docs from './pages/Docs';
import NotFound from './pages/NotFound';
import AuthCallback from './pages/AuthCallback';
import { ProtectedRoute } from './components/ProtectedRoute';
import ThemeToggle from './components/ThemeToggle';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/deploy" element={
                <ProtectedRoute>
                  <Deploy />
                </ProtectedRoute>
              } />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <ThemeToggle />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
