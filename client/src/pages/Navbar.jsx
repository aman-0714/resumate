// src/pages/Navbar.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-display text-xl font-bold text-white">
          Resum<span className="text-brand-500">ate</span>
        </Link>

        <div className="flex items-center gap-4">
          {/* NITJ Benchmark — always visible */}
          <Link
            to="/nitj-benchmark"
            className="text-xs px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors font-medium"
          >
            🎓 NITJ Benchmark
          </Link>

          {user ? (
            <>
              <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors text-sm">Dashboard</Link>
              <Link to="/upload"    className="text-slate-400 hover:text-white transition-colors text-sm">Upload</Link>
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors text-sm">
                Logout
              </button>
              <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-xs font-bold text-white">
                {user.name?.[0]?.toUpperCase()}
              </div>
            </>
          ) : (
            <>
              <Link to="/login"  className="text-slate-400 hover:text-white transition-colors text-sm">Login</Link>
              <Link to="/signup" className="btn-primary text-sm py-2">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
