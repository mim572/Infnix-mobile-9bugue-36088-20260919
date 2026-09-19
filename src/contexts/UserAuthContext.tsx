import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { PlatformUser } from '@/lib/userApi';
import { refreshUser } from '@/lib/userApi';

interface UserAuthContextType {
  user: PlatformUser | null;
  setUser: (u: PlatformUser | null) => void;
  logout: () => void;
  reloadUser: () => Promise<void>;
  loading: boolean;
}

const UserAuthContext = createContext<UserAuthContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
  reloadUser: async () => {},
  loading: true,
});

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<PlatformUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('sep_user');
    if (stored) {
      const parsed = JSON.parse(stored) as PlatformUser;
      // Refresh from DB
      refreshUser(parsed.id).then(fresh => {
        if (fresh && !fresh.is_banned) {
          setUserState(fresh);
          localStorage.setItem('sep_user', JSON.stringify(fresh));
        } else {
          localStorage.removeItem('sep_user');
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const setUser = (u: PlatformUser | null) => {
    setUserState(u);
    if (u) localStorage.setItem('sep_user', JSON.stringify(u));
    else localStorage.removeItem('sep_user');
  };

  const logout = () => {
    setUserState(null);
    localStorage.removeItem('sep_user');
  };

  const reloadUser = async () => {
    if (!user) return;
    const fresh = await refreshUser(user.id);
    if (fresh) {
      setUserState(fresh);
      localStorage.setItem('sep_user', JSON.stringify(fresh));
    }
  };

  return (
    <UserAuthContext.Provider value={{ user, setUser, logout, reloadUser, loading }}>
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  return useContext(UserAuthContext);
}
