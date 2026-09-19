import React from 'react';

interface MainContentProps {
  children: React.ReactNode;
}

export const MainContent: React.FC<MainContentProps> = ({ children }) => {
  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col min-w-0 min-h-0">
      {children}
    </main>
  );
};
