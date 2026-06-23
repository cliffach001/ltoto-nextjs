'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface UserInfo {
  username: string;
  role: string;
  fullName: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: UserInfo | null;
  login: (username: string, role: string, fullName: string) => void;
  logout: () => void;
  canManageUsers: boolean;
  canEdit: boolean;
  canCreate: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  login: () => {},
  logout: () => {},
  canManageUsers: false,
  canEdit: false,
  canCreate: false,
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem('isLoggedIn');
    if (stored === 'true') {
      setUser({
        username: localStorage.getItem('currentUser') || '',
        role: localStorage.getItem('currentUserRole') || 'operator',
        fullName: localStorage.getItem('currentUserFullName') || 'Admin K3',
      });
    }
    setIsLoading(false);
  }, []);

  // Route protection
  useEffect(() => {
    if (isLoading) return;

    const isLoggedIn = !!user;
    const publicPaths = ['/login', '/logout'];
    const isPublic = publicPaths.some((p) => pathname?.startsWith(p));

    if (!isLoggedIn && !isPublic) {
      router.push('/login');
    }
    if (isLoggedIn && pathname === '/login') {
      router.push('/');
    }
  }, [user, isLoading, pathname, router]);

  const login = useCallback((username: string, role: string, fullName: string) => {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('currentUser', username);
    localStorage.setItem('currentUserRole', role);
    localStorage.setItem('currentUserFullName', fullName);
    setUser({ username, role, fullName });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentUserRole');
    localStorage.removeItem('currentUserFullName');
    localStorage.removeItem('theme');
    setUser(null);
    router.push('/login');
  }, [router]);

  const role = user?.role || '';
  const canManageUsers = role === 'admin';
  const canEdit = ['admin', 'operator'].includes(role);
  const canCreate = ['admin', 'operator'].includes(role);

  return (
    <AuthContext.Provider
      value={{ isLoggedIn: !!user, user, login, logout, canManageUsers, canEdit, canCreate, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
