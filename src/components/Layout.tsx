import React from 'react';
import Header from './Header';
import BottomNav, { PageView } from './BottomNav';

interface LayoutProps {
  children: React.ReactNode;
  currentView: PageView;
  onViewChange: (view: PageView) => void;
  onViewUser?: (uid: string) => void;
}

export default function Layout({ children, currentView, onViewChange, onViewUser }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-brand-bg select-none">
      <Header onViewChange={onViewChange} onViewUser={onViewUser} />
      <main className="flex-1 pt-14 pb-14 overflow-y-auto no-scrollbar">
        <div className="max-w-2xl mx-auto w-full px-3.5 py-4">
          {children}
        </div>
      </main>
      <BottomNav currentView={currentView} onViewChange={onViewChange} />
    </div>
  );
}
