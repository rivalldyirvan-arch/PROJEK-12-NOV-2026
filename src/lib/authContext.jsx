import React, { createContext, useState, useEffect } from 'react';
import { fetchUsers, fetchRoles, saveUser } from './databaseService';
import { INITIAL_ROLES } from './initialUsers';

export const AuthContext = createContext(null);

const AUTH_STORAGE_KEY = 'app_current_auth_user';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Default to INITIAL_ROLES synchronously so there is ZERO blocking delay
  const [roles, setRoles] = useState(INITIAL_ROLES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function initAuth() {
      try {
        const r = await fetchRoles();
        if (isMounted && r && r.length > 0) {
          setRoles(r);
        }
      } catch (err) {
        console.warn('Silent role fetch fallback:', err);
      }
    }
    initAuth();
    return () => { isMounted = false; };
  }, []);

  const login = async (email, password) => {
    const users = await fetchUsers();
    const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!user) {
      return { success: false, message: 'Email tidak terdaftar dalam sistem.' };
    }

    if (user.password !== password) {
      return { success: false, message: 'Kata sandi / Password tidak cocok.' };
    }

    if (!user.isActive) {
      return { success: false, message: 'Akun Anda dinonaktifkan oleh Administrator. Hubungi Admin.' };
    }

    // Update last login
    const updatedUser = {
      ...user,
      lastLogin: new Date().toISOString()
    };
    try {
      await saveUser(updatedUser);
    } catch (e) {
      console.warn('Save user lastLogin notice:', e);
    }

    setCurrentUser(updatedUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    return { success: true, user: updatedUser };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const hasPermission = (permission) => {
    if (!currentUser) return false;
    if (currentUser.role === 'Admin') return true;

    const userRole = roles.find(r => r.name === currentUser.role);
    if (!userRole || !userRole.permissions) return false;
    return userRole.permissions.includes(permission);
  };

  const isAdmin = currentUser?.role === 'Admin';

  return (
    <AuthContext.Provider value={{
      currentUser,
      roles,
      isAuthenticated: !!currentUser,
      isAdmin,
      login,
      logout,
      hasPermission,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Re-export hook for convenience
export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
