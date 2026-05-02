import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold font-display text-white">
              Resu<span className="text-brand-400">mate</span>
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <Link to="/dashboard" className="text-slate-300 hover:text-white transition-colors text-sm">
                  Dashboard
                </Link>
                <Link to="/upload" className="text-slate-300 hover:text-white transition-colors text-sm">
                  Upload Resume
                </Link>
                <Link to="/job-match" className="text-slate-300 hover:text-white transition-colors text-sm">
                  Job Match
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm text-slate-400 hover:text-red-400 transition-colors"
                >
                  Logout
                </button>
                <div className="flex items-center gap-2 ml-2">
                  <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-slate-300 text-sm">{user.name}</span>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-slate-300 hover:text-white transition-colors text-sm">
                  Login
                </Link>
                <Link to="/signup" className="btn-primary text-sm py-2 px-5">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
