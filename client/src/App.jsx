// src/App.jsx — Router entry point for Resumate
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './pages/AuthContext';
import Navbar       from './pages/Navbar';
import Landing      from './pages/Landing';
import Login        from './pages/Login';
import Signup       from './pages/Signup';
import Dashboard    from './pages/Dashboard';
import Upload       from './pages/Upload';
import Analyze      from './pages/Analyze';
import ResumeRewriter from './pages/ResumeRewriter';
import JobMatch     from './pages/JobMatch';
import NITJBenchmark from './pages/NITJBenchmark';

// Protect routes that need auth
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-400">
      Loading…
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/"       element={<Landing />} />
        <Route path="/login"  element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Public — NITJ Benchmark (no auth needed, useful as marketing) */}
        <Route path="/nitj-benchmark" element={<NITJBenchmark />} />

        {/* Protected */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/upload"    element={<PrivateRoute><Upload /></PrivateRoute>} />
        <Route path="/analyze/:resumeId"  element={<PrivateRoute><Analyze /></PrivateRoute>} />
        <Route path="/rewrite/:resumeId"  element={<PrivateRoute><ResumeRewriter /></PrivateRoute>} />
        <Route path="/job-match"          element={<PrivateRoute><JobMatch /></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
