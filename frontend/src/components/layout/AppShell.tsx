import React from 'react';
import { SidebarNav } from './SidebarNav';
import { Header } from './Header';
import { MainContent } from './MainContent';
import { ThemeProvider } from '../../context/ThemeContext';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
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
