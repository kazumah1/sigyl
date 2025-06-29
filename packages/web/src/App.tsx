import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Index from './pages/Index';
import Blog from './pages/Blog';
import BlogPostPage from './pages/BlogPostPage';
import Deploy from './pages/Deploy';
import Marketplace from './pages/Marketplace';
import PackageDetails from './pages/PackageDetails';
import MCPPackagePage from './pages/MCPPackagePage';
import Docs from './pages/Docs';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import AuthCallback from './pages/AuthCallback';
import { ProtectedRoute } from './components/ProtectedRoute';
import ThemeToggle from './components/ThemeToggle';
import { Toaster } from './components/ui/toaster';
import Pricing from './pages/Pricing';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Footer from './components/Footer';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="App min-h-screen flex flex-col">
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/deploy" element={
                  <ProtectedRoute>
                    <Deploy />
                  </ProtectedRoute>
                } />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/marketplace/package/:id" element={<PackageDetails />} />
                <Route path="/mcp/:id" element={<MCPPackagePage />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <ThemeToggle />
            <Toaster />
            <Footer />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
