import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { authApi, apiService, BackendUserProfile } from '../services/apiService';

export interface UserProfile {
  id: string;
  uid?: string;
  operatorId: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  permissions: string[];
  shift: string;
  status: string;
}

// Demo accounts for selection UI (display only — actual auth goes through backend)
export const DEMO_ACCOUNTS: UserProfile[] = [
  {
    id: 'usr-001',
    operatorId: 'EOC-001',
    name: 'Lingeshwaran',
    role: 'EOC Shift Lead',
    department: 'Emergency Operations Center',
    avatar: 'L',
    permissions: ['ALL'],
    shift: 'Current Shift (08:00 - 16:00)',
    status: 'On Duty',
  },
  {
    id: 'usr-002',
    operatorId: 'MED-002',
    name: 'Siva Kumar',
    role: 'Medical Operations Officer',
    department: 'Emergency Medical Services',
    avatar: 'SK',
    permissions: ['INCIDENTS', 'HOSPITALS', 'AMBULANCES', 'MAP'],
    shift: 'Current Shift (08:00 - 16:00)',
    status: 'On Duty',
  },
  {
    id: 'usr-003',
    operatorId: 'FIR-003',
    name: 'Abishek',
    role: 'Fire Operations Officer',
    department: 'Fire & Rescue Service',
    avatar: 'A',
    permissions: ['INCIDENTS', 'FIRE_RESOURCES', 'MAP', 'ACTIVITY'],
    shift: 'Current Shift (08:00 - 16:00)',
    status: 'On Duty',
  },
  {
    id: 'usr-004',
    operatorId: 'INT-004',
    name: 'Bala Murugan',
    role: 'City Intelligence Lead',
    department: 'Urban Intelligence & GIS',
    avatar: 'BM',
    permissions: ['ALL'],
    shift: 'Current Shift (08:00 - 16:00)',
    status: 'On Duty',
  },
];

// Map username to demo account display info
const USERNAME_TO_DEMO: Record<string, UserProfile> = {
  lingesh: DEMO_ACCOUNTS[0],
  lingeshwaran: DEMO_ACCOUNTS[0],
  sivakumar: DEMO_ACCOUNTS[1],
  abishek: DEMO_ACCOUNTS[2],
  balamurugan: DEMO_ACCOUNTS[3],
};

const backendProfileToUserProfile = (profile: BackendUserProfile): UserProfile => {
  const demo = USERNAME_TO_DEMO[profile.username?.toLowerCase() ?? ''];
  return {
    id: profile.uid,
    uid: profile.uid,
    operatorId: profile.operatorId ?? demo?.operatorId ?? profile.username.toUpperCase(),
    name: profile.name,
    role: profile.role,
    department: profile.department,
    avatar: demo?.avatar ?? profile.name.slice(0, 2).toUpperCase(),
    permissions: profile.permissions,
    shift: demo?.shift ?? 'Current Shift',
    status: demo?.status ?? 'On Duty',
  };
};

interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  loginMock: (operatorId: string) => boolean; // legacy fallback for demo UI
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  demoAccounts: UserProfile[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'safecity_current_user_id';
const AUTH_TOKEN_KEY = 'safecity_id_token';
const AUTH_CUSTOM_TOKEN_KEY = 'safecity_custom_token';

/**
 * Persists a saved user to localStorage for session restore.
 * Never stores passwords.
 */
const saveSession = (user: UserProfile, idToken?: string) => {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    if (idToken) localStorage.setItem(AUTH_TOKEN_KEY, idToken);
  } catch { /* ignore */ }
};

const clearSession = () => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_CUSTOM_TOKEN_KEY);
  } catch { /* ignore */ }
};

const loadSavedUser = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
};

const loadSavedToken = (): string | null => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = loadSavedUser();
    const savedToken = loadSavedToken();
    if (saved && savedToken) {
      // Restore API token for subsequent requests
      apiService.setToken(savedToken);
    }
    return saved;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  /**
   * Real login — calls backend, gets Firebase custom token,
   * exchanges it for an ID token via Firebase client SDK if available,
   * otherwise uses the custom token as a session bearer.
   *
   * Strategy: When Firebase client SDK is not configured on frontend,
   * we store the customToken itself and use it for Authorization header.
   * The backend authMiddleware will verify it as a custom token.
   * (For full production, use Firebase client signInWithCustomToken().)
   */
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await authApi.login(username, password);
      const userProfile = backendProfileToUserProfile(result.user);

      // Store the custom token — backend verifyIdToken will accept it
      apiService.setToken(result.customToken);
      setCurrentUser(userProfile);
      saveSession(userProfile, result.customToken);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid username or password';
      setAuthError('Invalid username or password');
      console.warn('[Auth] Login failed:', msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Legacy mock login — maps operatorId to a demo account.
   * Used as UI fallback when backend is unavailable.
   * Does NOT authenticate against Firebase.
   */
  const loginMock = useCallback((operatorIdInput: string): boolean => {
    const q = operatorIdInput.trim().toUpperCase();
    const account = DEMO_ACCOUNTS.find(
      (acc) => acc.operatorId.toUpperCase() === q || acc.name.toUpperCase().includes(q)
    ) ?? DEMO_ACCOUNTS[0];
    setCurrentUser(account);
    saveSession(account);
    return true;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setAuthError(null);
    apiService.clearToken();
    clearSession();
  }, []);

  const hasPermission = useCallback((perm: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.permissions.includes('ALL')) return true;
    return currentUser.permissions.includes(perm);
  }, [currentUser]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: currentUser !== null,
        isLoading,
        authError,
        login,
        loginMock,
        logout,
        hasPermission,
        demoAccounts: DEMO_ACCOUNTS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
