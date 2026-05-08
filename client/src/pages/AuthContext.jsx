import { createContext, useContext, useState, useEffect } from 'react';
import { apiLogin, apiSignup, apiGetMe } from './src/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      apiGetMe()
        .then((res) => { if (res.success) setUser(res.user); })
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await apiLogin({ email, password });
    if (res.success) {
      localStorage.setItem('token', res.token);
      setUser(res.user);
    }
    return res;
  };

  const signup = async (name, email, password) => {
    const res = await apiSignup({ name, email, password });
    if (res.success) {
      localStorage.setItem('token', res.token);
      setUser(res.user);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);