import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface UserProfile {
  id: string;
  operatorId: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  permissions: string[];
  shift: string;
  status: string;
}

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

interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  login: (operatorId: string, password?: string) => boolean;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  demoAccounts: UserProfile[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'safecity_current_user_id';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const savedId = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedId) {
        const found = DEMO_ACCOUNTS.find((acc) => acc.operatorId === savedId || acc.id === savedId || acc.name === savedId);
        if (found) return found;
      }
    } catch {
      // Ignore storage errors
    }
    return null;
  });

  const login = (operatorIdInput: string, _password?: string): boolean => {
    const q = operatorIdInput.trim().toUpperCase();
    const account = DEMO_ACCOUNTS.find(
      (acc) => acc.operatorId.toUpperCase() === q || acc.name.toUpperCase().includes(q)
    );

    if (account) {
      setCurrentUser(account);
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, account.operatorId);
      } catch {
        // Ignore storage errors
      }
      return true;
    }

    // Default fallback if unknown ID typed: default to Lingeshwaran
    const fallback = DEMO_ACCOUNTS[0];
    setCurrentUser(fallback);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, fallback.operatorId);
    } catch {
      // Ignore storage errors
    }
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const hasPermission = (perm: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.permissions.includes('ALL')) return true;
    return currentUser.permissions.includes(perm);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: currentUser !== null,
        login,
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
