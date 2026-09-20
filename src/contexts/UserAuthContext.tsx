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
    let mounted = true;
    const stored = localStorage.getItem('sep_user');

    if (!stored) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    let parsed: PlatformUser;
    try {
      parsed = JSON.parse(stored) as PlatformUser;
    } catch (error) {
      console.error('Invalid saved user session:', error);
      localStorage.removeItem('sep_user');
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    // Keep the cached user available while the database refresh is running.
    // This prevents pages from rendering a blank screen after navigation.
    setUserState(parsed);

    refreshUser(parsed.id)
      .then(fresh => {
        if (!mounted) return;

        if (fresh && !fresh.is_banned) {
          setUserState(fresh);
          localStorage.setItem('sep_user', JSON.stringify(fresh));
        } else if (fresh?.is_banned) {
          setUserState(null);
          localStorage.removeItem('sep_user');
        }
        // If the refresh fails, retain the cached user instead of blanking the app.
      })
      .catch(error => {
        console.error('Failed to refresh user session:', error);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
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

    try {
      const fresh = await refreshUser(user.id);
      if (fresh && !fresh.is_banned) {
        setUserState(fresh);
        localStorage.setItem('sep_user', JSON.stringify(fresh));
      } else if (fresh?.is_banned) {
        setUserState(null);
        localStorage.removeItem('sep_user');
      }
      // Never clear the current user when the network/database refresh fails.
    } catch (error) {
      console.error('Failed to reload user:', error);
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
