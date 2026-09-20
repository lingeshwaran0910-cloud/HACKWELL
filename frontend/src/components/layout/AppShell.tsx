import React from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarNav } from './SidebarNav';
import { Header } from './Header';
import { MainContent } from './MainContent';
import { ThemeProvider } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const isPublicRoute = location.pathname === '/login' || location.pathname === '/report-emergency';
  const showOperatorLayout = isAuthenticated && !isPublicRoute;

  if (!showOperatorLayout) {
    return (
      <ThemeProvider>
        <div className="min-h-screen w-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 font-sans antialiased overflow-x-hidden">
          {children}
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="h-screen w-screen flex bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 overflow-hidden font-sans antialiased">
        <SidebarNav />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <MainContent>{children}</MainContent>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default AppShell;
